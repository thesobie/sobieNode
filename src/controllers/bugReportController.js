const { asyncHandler } = require('../utils/asyncHandler');
const BugReport = require('../models/BugReport');
const User = require('../models/User');
const githubService = require('../services/githubService');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// @desc    Submit a bug report
// @route   POST /api/bug-reports
// @access  Private
const submitBugReport = asyncHandler(async (req, res) => {
  const reporterId = req.user._id;
  const {
    title,
    description,
    category,
    severity = 'medium',
    priority = 'normal',
    stepsToReproduce = [],
    expectedBehavior,
    actualBehavior,
    additionalContext,
    environment,
    userCanContact = true,
    contactPreference = 'in_app',
    relatedConference,
    relatedSession,
    relatedSubmission,
    createGithubIssue = true
  } = req.body;

  // Create the bug report
  const bugReport = new BugReport({
    reporterId,
    title,
    description,
    category,
    severity,
    priority,
    stepsToReproduce: stepsToReproduce.map((step, index) => ({
      step: index + 1,
      description: step
    })),
    expectedBehavior,
    actualBehavior,
    additionalContext,
    environment: {
      ...environment,
      timestamp: new Date()
    },
    userCanContact,
    contactPreference,
    relatedConference,
    relatedSession,
    relatedSubmission,
    status: 'submitted'
  });

  await bugReport.save();

  // Populate reporter information for GitHub issue creation
  await bugReport.populate('reporterId', 'name email affiliation');

  let githubResult = null;
  
  // Create GitHub issue if requested and configured
  if (createGithubIssue) {
    try {
      // Check for similar existing issues first
      const similarIssues = await githubService.findSimilarIssues(bugReport);
      
      if (similarIssues.success && similarIssues.hasSimilar) {
        // Log similar issues but still create new one (user might have different specifics)
        console.log(`Found ${similarIssues.similarIssues.length} similar issues for bug report ${bugReport._id}`);
      }

      // Create the GitHub issue
      githubResult = await githubService.createIssueFromBugReport(bugReport);
      
      if (githubResult.success) {
        // Update bug report with GitHub issue information
        bugReport.githubIssue = {
          issueNumber: githubResult.issue.number,
          issueUrl: githubResult.issue.url,
          createdAt: new Date(githubResult.issue.createdAt),
          status: 'created'
        };
        await bugReport.save();
      } else {
        // Update with error information
        bugReport.githubIssue = {
          status: 'failed',
          errorMessage: githubResult.error
        };
        await bugReport.save();
      }
    } catch (error) {
      console.error('Error creating GitHub issue:', error);
      bugReport.githubIssue = {
        status: 'failed',
        errorMessage: error.message
      };
      await bugReport.save();
    }
  }

  // Notify administrators about the new bug report
  await notifyAdministrators(bugReport);

  // Send confirmation message to user
  await sendBugReportConfirmation(bugReport);

  res.status(201).json({
    success: true,
    message: 'Bug report submitted successfully',
    data: {
      bugReport: {
        id: bugReport._id,
        title: bugReport.title,
        category: bugReport.category,
        severity: bugReport.severity,
        status: bugReport.status,
        githubIssue: bugReport.githubIssue,
        createdAt: bugReport.createdAt
      },
      githubIssue: githubResult
    }
  });
});

// @desc    Get user's bug reports
// @route   GET /api/bug-reports/my-reports
// @access  Private
const getMyBugReports = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    status,
    category,
    severity,
    page = 1,
    limit = 20
  } = req.query;

  // Build filter
  const filter = { reporterId: userId };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (severity) filter.severity = severity;

  // Get bug reports with pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'assignedTo', select: 'name email' },
      { path: 'resolvedBy', select: 'name email' }
    ]
  };

  const result = await BugReport.paginate(filter, options);

  res.json({
    success: true,
    data: {
      bugReports: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalReports: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    }
  });
});

// @desc    Get specific bug report
// @route   GET /api/bug-reports/:reportId
// @access  Private
const getBugReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const userId = req.user._id;

  const bugReport = await BugReport.findById(reportId)
    .populate('reporterId', 'name email affiliation')
    .populate('assignedTo', 'name email')
    .populate('resolvedBy', 'name email')
    .populate('relatedConference', 'name year')
    .populate('relatedSession', 'title track')
    .populate('relatedSubmission', 'title');

  if (!bugReport) {
    return res.status(404).json({
      success: false,
      message: 'Bug report not found'
    });
  }

  // Check permissions - user can see their own reports, admins can see all
  if (bugReport.reporterId._id.toString() !== userId.toString() && 
      !req.user.hasRole('admin') && 
      !req.user.hasRole('editor')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: { bugReport }
  });
});

// @desc    Update bug report status (Admin only)
// @route   PUT /api/bug-reports/:reportId/status
// @access  Private (Admin/Editor)
const updateBugReportStatus = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status, resolution, assignedTo } = req.body;

  // Check admin permissions
  if (!req.user.hasRole('admin') && !req.user.hasRole('editor')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Editor role required.'
    });
  }

  const bugReport = await BugReport.findById(reportId)
    .populate('reporterId', 'name email');

  if (!bugReport) {
    return res.status(404).json({
      success: false,
      message: 'Bug report not found'
    });
  }

  const previousStatus = bugReport.status;

  // Update fields
  if (status) {
    bugReport.status = status;
    
    // If resolving or closing, set resolution info
    if ((status === 'resolved' || status === 'closed') && resolution) {
      bugReport.resolution = resolution;
      bugReport.resolvedAt = new Date();
      bugReport.resolvedBy = req.user._id;
      
      // Calculate time to resolve
      if (bugReport.createdAt) {
        const timeToResolve = (new Date() - bugReport.createdAt) / (1000 * 60 * 60); // hours
        bugReport.timeToResolve = Math.round(timeToResolve * 100) / 100;
      }
    }
  }

  if (assignedTo) {
    bugReport.assignedTo = assignedTo;
  }

  await bugReport.save();

  // Update GitHub issue if it exists
  if (bugReport.githubIssue?.issueNumber) {
    try {
      if (status === 'resolved' || status === 'closed') {
        await githubService.closeIssue(
          bugReport.githubIssue.issueNumber,
          resolution || 'Issue resolved via SOBIE app'
        );
      } else if (status !== previousStatus) {
        await githubService.addCommentToIssue(
          bugReport.githubIssue.issueNumber,
          `**Status updated:** ${previousStatus} → ${status}\n\nUpdated by: ${req.user.name?.firstName} ${req.user.name?.lastName}`
        );
      }
    } catch (error) {
      console.error('Error updating GitHub issue:', error);
    }
  }

  // Notify the user about status change
  await notifyUserOfStatusChange(bugReport, previousStatus, status);

  res.json({
    success: true,
    message: 'Bug report status updated successfully',
    data: {
      bugReport: {
        id: bugReport._id,
        status: bugReport.status,
        resolution: bugReport.resolution,
        assignedTo: bugReport.assignedTo,
        resolvedAt: bugReport.resolvedAt,
        timeToResolve: bugReport.timeToResolve
      }
    }
  });
});

// @desc    Get all bug reports (Admin only)
// @route   GET /api/bug-reports/admin/all
// @access  Private (Admin/Editor)
const getAllBugReports = asyncHandler(async (req, res) => {
  // Check admin permissions
  if (!req.user.hasRole('admin') && !req.user.hasRole('editor')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Editor role required.'
    });
  }

  const {
    status,
    category,
    severity,
    priority,
    assignedTo,
    page = 1,
    limit = 20,
    search
  } = req.query;

  // Build filter
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (severity) filter.severity = severity;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;

  // Add search filter
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Get bug reports with pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'reporterId', select: 'name email affiliation' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'resolvedBy', select: 'name email' }
    ]
  };

  const result = await BugReport.paginate(filter, options);

  res.json({
    success: true,
    data: {
      bugReports: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalReports: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    }
  });
});

// @desc    Get bug report statistics (Admin only)
// @route   GET /api/bug-reports/admin/statistics
// @access  Private (Admin)
const getBugReportStatistics = asyncHandler(async (req, res) => {
  // Check admin permissions
  if (!req.user.hasRole('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }

  const { timeframe = '30d', conferenceId } = req.query;

  // Calculate date range
  let dateFilter = {};
  const now = new Date();
  
  if (timeframe === '7d') {
    dateFilter.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  } else if (timeframe === '30d') {
    dateFilter.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  } else if (timeframe === '90d') {
    dateFilter.createdAt = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
  }

  if (conferenceId) {
    dateFilter.relatedConference = conferenceId;
  }

  // Get statistics
  const stats = await BugReport.getBugStatistics(dateFilter);

  // Get trends (compare with previous period)
  const previousPeriodFilter = { ...dateFilter };
  if (dateFilter.createdAt) {
    const periodLength = now.getTime() - dateFilter.createdAt.$gte.getTime();
    previousPeriodFilter.createdAt = {
      $gte: new Date(dateFilter.createdAt.$gte.getTime() - periodLength),
      $lt: dateFilter.createdAt.$gte
    };
  }

  const previousStats = await BugReport.getBugStatistics(previousPeriodFilter);

  // Calculate trends
  const trends = {
    totalBugs: stats.totalBugs - previousStats.totalBugs,
    avgTimeToResolve: stats.avgTimeToResolve - previousStats.avgTimeToResolve
  };

  res.json({
    success: true,
    data: {
      current: stats,
      previous: previousStats,
      trends,
      timeframe
    }
  });
});

// @desc    Test GitHub integration
// @route   GET /api/bug-reports/admin/github-status
// @access  Private (Admin)
const getGitHubStatus = asyncHandler(async (req, res) => {
  // Check admin permissions
  if (!req.user.hasRole('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }

  const validation = await githubService.validateConfiguration();

  res.json({
    success: true,
    data: {
      configured: validation.valid,
      error: validation.error,
      repository: validation.repository
    }
  });
});

// Helper function to notify administrators about new bug reports
async function notifyAdministrators(bugReport) {
  try {
    // Find admin and editor users
    const adminUsers = await User.find({
      roles: { $in: ['admin', 'editor'] },
      isActive: true
    }).select('_id name email');

    if (adminUsers.length === 0) return;

    // Create message for admins
    const message = new Message({
      subject: `New Bug Report: ${bugReport.title}`,
      content: `A new bug report has been submitted.\n\n**Category:** ${bugReport.category}\n**Severity:** ${bugReport.severity}\n**Reporter:** ${bugReport.reporterId.name?.firstName} ${bugReport.reporterId.name?.lastName}\n\n**Description:**\n${bugReport.description}`,
      messageType: 'announcement',
      priority: bugReport.severity === 'critical' ? 'urgent' : 'normal',
      senderId: bugReport.reporterId,
      senderRole: 'system',
      recipients: adminUsers.map(user => ({
        userId: user._id,
        readStatus: 'unread'
      })),
      deliveryStatus: 'sent',
      totalRecipients: adminUsers.length,
      actualSendTime: new Date()
    });

    await message.save();

    // Create notifications
    const notifications = adminUsers.map(user => ({
      title: 'New Bug Report',
      message: `${bugReport.title} (${bugReport.severity} severity)`,
      type: 'system',
      priority: bugReport.severity === 'critical' ? 'urgent' : 'normal',
      userId: user._id,
      sourceType: 'user',
      sourceId: bugReport.reporterId,
      sourceModel: 'User',
      messageId: message._id,
      actionRequired: true,
      actionType: 'view',
      actionUrl: `/admin/bug-reports/${bugReport._id}`,
      icon: 'bug',
      color: bugReport.severity === 'critical' ? 'red' : 'orange'
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying administrators:', error);
  }
}

// Helper function to send confirmation to user
async function sendBugReportConfirmation(bugReport) {
  try {
    const message = new Message({
      subject: 'Bug Report Received - Thank You',
      content: `Thank you for reporting the bug: "${bugReport.title}"\n\nWe have received your bug report and our team will review it soon. You will be notified of any updates.\n\n**Report ID:** ${bugReport._id}\n**Status:** ${bugReport.status}\n${bugReport.githubIssue?.issueUrl ? `**GitHub Issue:** ${bugReport.githubIssue.issueUrl}` : ''}`,
      messageType: 'direct',
      priority: 'normal',
      senderId: bugReport.reporterId, // System message
      senderRole: 'system',
      recipients: [{
        userId: bugReport.reporterId,
        readStatus: 'unread'
      }],
      deliveryStatus: 'sent',
      totalRecipients: 1,
      actualSendTime: new Date()
    });

    await message.save();

    // Create notification
    const notification = new Notification({
      title: 'Bug Report Confirmed',
      message: `Your bug report "${bugReport.title}" has been received`,
      type: 'system',
      priority: 'normal',
      userId: bugReport.reporterId,
      sourceType: 'system',
      sourceId: bugReport._id,
      sourceModel: 'BugReport',
      messageId: message._id,
      actionRequired: false,
      actionType: 'view',
      actionUrl: `/bug-reports/${bugReport._id}`,
      icon: 'check',
      color: 'green'
    });

    await notification.save();
  } catch (error) {
    console.error('Error sending bug report confirmation:', error);
  }
}

// Helper function to notify user of status changes
async function notifyUserOfStatusChange(bugReport, previousStatus, newStatus) {
  try {
    if (previousStatus === newStatus) return;

    const statusMessages = {
      'triaged': 'Your bug report has been reviewed and triaged by our team.',
      'in_progress': 'Your bug report is now being worked on by our development team.',
      'resolved': 'Your bug report has been resolved. Thank you for helping us improve the application!',
      'closed': 'Your bug report has been closed.',
      'duplicate': 'Your bug report has been marked as a duplicate of an existing issue.'
    };

    const message = statusMessages[newStatus] || `Your bug report status has been updated to: ${newStatus}`;

    // Create message
    const notificationMessage = new Message({
      subject: `Bug Report Update: ${bugReport.title}`,
      content: `${message}\n\n**Report ID:** ${bugReport._id}\n**New Status:** ${newStatus}\n${bugReport.resolution ? `**Resolution:** ${bugReport.resolution}` : ''}\n${bugReport.githubIssue?.issueUrl ? `**GitHub Issue:** ${bugReport.githubIssue.issueUrl}` : ''}`,
      messageType: 'direct',
      priority: 'normal',
      senderId: bugReport.reporterId, // System message
      senderRole: 'system',
      recipients: [{
        userId: bugReport.reporterId,
        readStatus: 'unread'
      }],
      deliveryStatus: 'sent',
      totalRecipients: 1,
      actualSendTime: new Date()
    });

    await notificationMessage.save();

    // Create notification
    const notification = new Notification({
      title: 'Bug Report Updated',
      message: `Status changed: ${previousStatus} → ${newStatus}`,
      type: 'system',
      priority: 'normal',
      userId: bugReport.reporterId,
      sourceType: 'system',
      sourceId: bugReport._id,
      sourceModel: 'BugReport',
      messageId: notificationMessage._id,
      actionRequired: false,
      actionType: 'view',
      actionUrl: `/bug-reports/${bugReport._id}`,
      icon: 'update',
      color: newStatus === 'resolved' ? 'green' : 'blue'
    });

    await notification.save();
  } catch (error) {
    console.error('Error notifying user of status change:', error);
  }
}

module.exports = {
  submitBugReport,
  getMyBugReports,
  getBugReport,
  updateBugReportStatus,
  getAllBugReports,
  getBugReportStatistics,
  getGitHubStatus
};
