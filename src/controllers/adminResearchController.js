const ResearchSubmission = require('../models/ResearchSubmission');
const User = require('../models/User');
const Conference = require('../models/Conference');
const emailService = require('../services/emailService');
const { asyncHandler } = require('../utils/asyncHandler');

// @desc    Get all submissions for admin dashboard
// @route   GET /api/admin/research-submissions
// @access  Private/Admin
const getAllSubmissions = asyncHandler(async (req, res) => {
  const { status, conferenceYear, discipline, page = 1, limit = 20 } = req.query;

  // Build query
  let query = {};
  if (status) query.status = status;
  if (conferenceYear) query.conferenceYear = parseInt(conferenceYear);
  if (discipline) query.discipline = discipline;

  // Pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'conferenceId', select: 'name year' },
      { path: 'correspondingAuthor.userId', select: 'name email' },
      { path: 'reviewWorkflow.editor.userId', select: 'name email' },
      { path: 'reviewWorkflow.reviewers.userId', select: 'name email' }
    ]
  };

  const submissions = await ResearchSubmission.paginate(query, options);

  // Calculate dashboard statistics
  const stats = await ResearchSubmission.aggregate([
    { $match: conferenceYear ? { conferenceYear: parseInt(conferenceYear) } : {} },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const statusCounts = stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});

  // Get submissions needing attention
  const needsAttention = await ResearchSubmission.countDocuments({
    $or: [
      { status: 'submitted', 'reviewWorkflow.editor.userId': { $exists: false } },
      { 
        status: 'under_review', 
        'reviewWorkflow.reviewDeadline': { $lt: new Date() },
        'reviewWorkflow.reviewers.status': { $in: ['invited', 'accepted'] }
      }
    ]
  });

  res.status(200).json({
    success: true,
    data: {
      submissions: submissions.docs,
      pagination: {
        currentPage: submissions.page,
        totalPages: submissions.totalPages,
        totalSubmissions: submissions.totalDocs,
        hasNext: submissions.hasNextPage,
        hasPrev: submissions.hasPrevPage
      },
      statistics: {
        statusCounts,
        needsAttention,
        totalSubmissions: submissions.totalDocs
      }
    }
  });
});

// @desc    Assign editor to submission
// @route   POST /api/admin/research-submissions/:id/assign-editor
// @access  Private/Admin
const assignEditor = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const { editorId, notes } = req.body;
  const adminId = req.user._id;

  if (!editorId) {
    return res.status(400).json({
      success: false,
      message: 'Editor ID is required'
    });
  }

  // Verify editor exists and has editor role
  const editor = await User.findById(editorId);
  if (!editor) {
    return res.status(404).json({
      success: false,
      message: 'Editor not found'
    });
  }

  if (!editor.roles.includes('editor') && !editor.roles.includes('admin')) {
    return res.status(400).json({
      success: false,
      message: 'User does not have editor privileges'
    });
  }

  const submission = await ResearchSubmission.findById(submissionId)
    .populate('correspondingAuthor.userId', 'name email')
    .populate('conferenceId', 'name year');

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }

  if (submission.status !== 'submitted') {
    return res.status(400).json({
      success: false,
      message: 'Can only assign editors to submitted research'
    });
  }

  try {
    submission.assignEditor(editorId, notes);
    await submission.save();

    // Send notification to editor
    await emailService.sendEditorAssignmentNotification(
      editor.email,
      {
        editorName: `${editor.name.firstName} ${editor.name.lastName}`,
        title: submission.title,
        authorName: submission.authorList,
        submissionNumber: submission.submissionNumber,
        discipline: submission.discipline,
        abstractPreview: submission.abstract.substring(0, 300) + '...'
      }
    );

    // Send notification to author
    await emailService.sendEditorAssignedNotification(
      submission.correspondingAuthor.email,
      {
        authorName: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
        title: submission.title,
        submissionNumber: submission.submissionNumber,
        editorName: `${editor.name.firstName} ${editor.name.lastName}`
      }
    );

    // Add notification record
    submission.addNotification(
      'editor_assigned',
      [
        { email: editor.email },
        { email: submission.correspondingAuthor.email }
      ],
      `Editor ${editor.name.firstName} ${editor.name.lastName} assigned to review submission`,
      adminId
    );

    await submission.save();

    res.status(200).json({
      success: true,
      data: {
        submission,
        message: 'Editor assigned successfully'
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Assign reviewers to submission
// @route   POST /api/admin/research-submissions/:id/assign-reviewers
// @access  Private/Admin or Editor
const assignReviewers = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const { reviewerIds, reviewDeadline } = req.body;
  const userId = req.user._id;

  if (!reviewerIds || !Array.isArray(reviewerIds) || reviewerIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one reviewer ID is required'
    });
  }

  if (reviewerIds.length > 5) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 5 reviewers can be assigned'
    });
  }

  const submission = await ResearchSubmission.findById(submissionId)
    .populate('correspondingAuthor.userId', 'name email')
    .populate('reviewWorkflow.editor.userId', 'name email');

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }

  // Check if user is admin or the assigned editor
  const isAdmin = req.user.roles.includes('admin');
  const isAssignedEditor = submission.reviewWorkflow.editor.userId && 
    submission.reviewWorkflow.editor.userId._id.toString() === userId.toString();

  if (!isAdmin && !isAssignedEditor) {
    return res.status(403).json({
      success: false,
      message: 'Only admins or the assigned editor can assign reviewers'
    });
  }

  if (submission.status !== 'under_review') {
    return res.status(400).json({
      success: false,
      message: 'Can only assign reviewers to submissions under review'
    });
  }

  // Verify all reviewers exist and have reviewer role
  const reviewers = await User.find({
    _id: { $in: reviewerIds },
    $or: [
      { roles: 'reviewer' },
      { roles: 'editor' },
      { roles: 'admin' }
    ]
  });

  if (reviewers.length !== reviewerIds.length) {
    return res.status(400).json({
      success: false,
      message: 'One or more reviewers not found or do not have reviewer privileges'
    });
  }

  // Check for conflicts of interest (same institution as authors)
  const authorInstitutions = [
    submission.correspondingAuthor.affiliation.institution,
    ...submission.coAuthors.map(author => author.affiliation.institution)
  ];

  const conflicts = reviewers.filter(reviewer => 
    reviewer.affiliation && 
    authorInstitutions.includes(reviewer.affiliation.organization)
  );

  if (conflicts.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Conflict of interest detected: ${conflicts.map(r => r.name.firstName + ' ' + r.name.lastName).join(', ')} from same institution as authors`
    });
  }

  try {
    // Set review deadline
    if (reviewDeadline) {
      submission.reviewWorkflow.reviewDeadline = new Date(reviewDeadline);
    } else {
      // Default to 2 weeks from now
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);
      submission.reviewWorkflow.reviewDeadline = deadline;
    }

    // Add reviewers
    for (const reviewerId of reviewerIds) {
      submission.addReviewer(reviewerId);
    }

    await submission.save();

    // Send invitation emails to reviewers
    for (const reviewer of reviewers) {
      await emailService.sendReviewInvitation(
        reviewer.email,
        {
          reviewerName: `${reviewer.name.firstName} ${reviewer.name.lastName}`,
          title: submission.title,
          authorName: submission.authorList,
          submissionNumber: submission.submissionNumber,
          discipline: submission.discipline,
          deadline: submission.reviewWorkflow.reviewDeadline,
          abstractPreview: submission.abstract.substring(0, 300) + '...',
          acceptUrl: `${process.env.FRONTEND_URL}/review/${submissionId}/accept`,
          declineUrl: `${process.env.FRONTEND_URL}/review/${submissionId}/decline`
        }
      );
    }

    // Send notification to author
    await emailService.sendReviewersAssignedNotification(
      submission.correspondingAuthor.email,
      {
        authorName: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
        title: submission.title,
        submissionNumber: submission.submissionNumber,
        reviewerCount: reviewers.length,
        deadline: submission.reviewWorkflow.reviewDeadline
      }
    );

    // Add notification record
    submission.addNotification(
      'reviewers_assigned',
      [
        ...reviewers.map(r => ({ email: r.email })),
        { email: submission.correspondingAuthor.email }
      ],
      `${reviewers.length} reviewers assigned to review submission`,
      userId
    );

    await submission.save();

    res.status(200).json({
      success: true,
      data: {
        submission,
        assignedReviewers: reviewers.map(r => ({
          _id: r._id,
          name: `${r.name.firstName} ${r.name.lastName}`,
          email: r.email,
          affiliation: r.affiliation?.organization
        })),
        reviewDeadline: submission.reviewWorkflow.reviewDeadline,
        message: 'Reviewers assigned successfully'
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Make final decision on submission
// @route   POST /api/admin/research-submissions/:id/make-decision
// @access  Private/Admin or Editor
const makeFinalDecision = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const { decision, editorComments } = req.body;
  const userId = req.user._id;

  if (!decision || !['accept', 'minor_revision', 'major_revision', 'reject'].includes(decision)) {
    return res.status(400).json({
      success: false,
      message: 'Valid decision is required (accept, minor_revision, major_revision, reject)'
    });
  }

  const submission = await ResearchSubmission.findById(submissionId)
    .populate('correspondingAuthor.userId', 'name email')
    .populate('reviewWorkflow.editor.userId', 'name email')
    .populate('reviewWorkflow.reviewers.userId', 'name email');

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }

  // Check if user is admin or the assigned editor
  const isAdmin = req.user.roles.includes('admin');
  const isAssignedEditor = submission.reviewWorkflow.editor.userId && 
    submission.reviewWorkflow.editor.userId._id.toString() === userId.toString();

  if (!isAdmin && !isAssignedEditor) {
    return res.status(403).json({
      success: false,
      message: 'Only admins or the assigned editor can make final decisions'
    });
  }

  if (!['under_review', 'pending_revision', 'revised'].includes(submission.status)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot make decision on submission in current status'
    });
  }

  // Check if enough reviews are completed
  const completedReviews = submission.reviewWorkflow.reviewers.filter(r => r.status === 'completed');
  if (completedReviews.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one review must be completed before making a decision'
    });
  }

  try {
    submission.makeDecision(decision, editorComments);
    submission.reviewWorkflow.finalDecision.notifiedDate = new Date();
    await submission.save();

    // Send decision email to author
    await emailService.sendDecisionNotification(
      submission.correspondingAuthor.email,
      {
        authorName: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
        title: submission.title,
        submissionNumber: submission.submissionNumber,
        decision: decision,
        editorComments: editorComments,
        reviews: completedReviews.map(r => ({
          overallScore: r.review.overallScore,
          recommendation: r.review.recommendation,
          authorComments: r.review.authorComments
        }))
      }
    );

    // Notify all associated users
    const notificationRecipients = submission.associatedUsers
      .filter(user => user.notificationPreferences.statusUpdates)
      .map(user => ({ userId: user.userId }));

    submission.addNotification(
      'final_decision',
      notificationRecipients,
      `Final decision made: ${decision}`,
      userId
    );

    await submission.save();

    res.status(200).json({
      success: true,
      data: {
        submission,
        decision: submission.reviewWorkflow.finalDecision,
        message: 'Decision made and author notified successfully'
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get potential reviewers for a submission
// @route   GET /api/admin/research-submissions/:id/potential-reviewers
// @access  Private/Admin or Editor
const getPotentialReviewers = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const userId = req.user._id;

  const submission = await ResearchSubmission.findById(submissionId);

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }

  // Check if user is admin or the assigned editor
  const isAdmin = req.user.roles.includes('admin');
  const isAssignedEditor = submission.reviewWorkflow.editor.userId && 
    submission.reviewWorkflow.editor.userId.toString() === userId.toString();

  if (!isAdmin && !isAssignedEditor) {
    return res.status(403).json({
      success: false,
      message: 'Only admins or the assigned editor can view potential reviewers'
    });
  }

  // Get author institutions for conflict checking
  const authorInstitutions = [
    submission.correspondingAuthor.affiliation.institution,
    ...submission.coAuthors.map(author => author.affiliation.institution)
  ];

  // Find potential reviewers
  const potentialReviewers = await User.find({
    $or: [
      { roles: 'reviewer' },
      { roles: 'editor' },
      { roles: 'admin' }
    ],
    // Exclude authors of this submission
    _id: { 
      $nin: [
        submission.correspondingAuthor.userId,
        ...submission.coAuthors.map(author => author.userId).filter(Boolean)
      ]
    }
  }).select('name email affiliation profile roles');

  // Categorize reviewers
  const categorizedReviewers = potentialReviewers.map(reviewer => {
    const hasConflict = reviewer.affiliation && 
      authorInstitutions.includes(reviewer.affiliation.organization);

    const expertiseMatch = reviewer.profile && 
      reviewer.profile.expertiseAreas && 
      reviewer.profile.expertiseAreas.includes(submission.discipline);

    const isAlreadyAssigned = submission.reviewWorkflow.reviewers.some(
      r => r.userId.toString() === reviewer._id.toString()
    );

    return {
      _id: reviewer._id,
      name: `${reviewer.name.firstName} ${reviewer.name.lastName}`,
      email: reviewer.email,
      affiliation: reviewer.affiliation?.organization || 'Not specified',
      expertise: reviewer.profile?.expertiseAreas || [],
      roles: reviewer.roles,
      hasConflict,
      expertiseMatch,
      isAlreadyAssigned,
      recommendationScore: expertiseMatch ? (hasConflict ? 0 : 5) : (hasConflict ? 0 : 3)
    };
  });

  // Sort by recommendation score
  categorizedReviewers.sort((a, b) => b.recommendationScore - a.recommendationScore);

  // Separate available vs. conflicted reviewers
  const availableReviewers = categorizedReviewers.filter(r => !r.hasConflict && !r.isAlreadyAssigned);
  const conflictedReviewers = categorizedReviewers.filter(r => r.hasConflict);
  const alreadyAssigned = categorizedReviewers.filter(r => r.isAlreadyAssigned);

  res.status(200).json({
    success: true,
    data: {
      available: availableReviewers,
      conflicted: conflictedReviewers,
      alreadyAssigned: alreadyAssigned,
      summary: {
        totalAvailable: availableReviewers.length,
        expertiseMatches: availableReviewers.filter(r => r.expertiseMatch).length,
        conflicts: conflictedReviewers.length
      }
    }
  });
});

// @desc    Send reminder to reviewers
// @route   POST /api/admin/research-submissions/:id/send-reminders
// @access  Private/Admin or Editor
const sendReviewerReminders = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const { reviewerIds } = req.body; // Optional: specific reviewers, otherwise all pending
  const userId = req.user._id;

  const submission = await ResearchSubmission.findById(submissionId)
    .populate('reviewWorkflow.reviewers.userId', 'name email');

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }

  // Check if user is admin or the assigned editor
  const isAdmin = req.user.roles.includes('admin');
  const isAssignedEditor = submission.reviewWorkflow.editor.userId && 
    submission.reviewWorkflow.editor.userId.toString() === userId.toString();

  if (!isAdmin && !isAssignedEditor) {
    return res.status(403).json({
      success: false,
      message: 'Only admins or the assigned editor can send reminders'
    });
  }

  // Determine which reviewers to remind
  let reviewersToRemind = submission.reviewWorkflow.reviewers.filter(r => 
    ['invited', 'accepted'].includes(r.status)
  );

  if (reviewerIds && reviewerIds.length > 0) {
    reviewersToRemind = reviewersToRemind.filter(r => 
      reviewerIds.includes(r.userId._id.toString())
    );
  }

  if (reviewersToRemind.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No reviewers to remind'
    });
  }

  const remindersSent = [];

  for (const reviewer of reviewersToRemind) {
    try {
      await emailService.sendReviewReminder(
        reviewer.userId.email,
        {
          reviewerName: `${reviewer.userId.name.firstName} ${reviewer.userId.name.lastName}`,
          title: submission.title,
          submissionNumber: submission.submissionNumber,
          deadline: submission.reviewWorkflow.reviewDeadline,
          daysRemaining: submission.reviewWorkflow.reviewDeadline 
            ? Math.ceil((submission.reviewWorkflow.reviewDeadline - new Date()) / (1000 * 60 * 60 * 24))
            : null
        }
      );

      reviewer.remindersSent += 1;
      remindersSent.push({
        reviewerId: reviewer.userId._id,
        reviewerName: `${reviewer.userId.name.firstName} ${reviewer.userId.name.lastName}`,
        email: reviewer.userId.email
      });

    } catch (emailError) {
      console.error(`Failed to send reminder to ${reviewer.userId.email}:`, emailError);
    }
  }

  await submission.save();

  // Add notification record
  submission.addNotification(
    'reminder_sent',
    remindersSent.map(r => ({ email: r.email })),
    `Review reminders sent to ${remindersSent.length} reviewers`,
    userId
  );

  await submission.save();

  res.status(200).json({
    success: true,
    data: {
      remindersSent,
      message: `Reminders sent to ${remindersSent.length} reviewers`
    }
  });
});

// @desc    Get submission statistics for admin dashboard
// @route   GET /api/admin/research-submissions/statistics
// @access  Private/Admin
const getSubmissionStatistics = asyncHandler(async (req, res) => {
  const { year } = req.query;

  const matchStage = year ? { conferenceYear: parseInt(year) } : {};

  const stats = await ResearchSubmission.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        byStatus: {
          $push: {
            status: '$status',
            discipline: '$discipline',
            isStudentResearch: '$isStudentResearch'
          }
        },
        avgReviewTime: {
          $avg: {
            $cond: {
              if: { $ne: ['$reviewWorkflow.finalDecision.decisionDate', null] },
              then: {
                $divide: [
                  { $subtract: ['$reviewWorkflow.finalDecision.decisionDate', '$initialSubmissionDate'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              },
              else: null
            }
          }
        }
      }
    }
  ]);

  // Process status breakdown
  const statusBreakdown = {};
  const disciplineBreakdown = {};
  let studentResearchCount = 0;

  if (stats.length > 0) {
    stats[0].byStatus.forEach(item => {
      statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
      disciplineBreakdown[item.discipline] = (disciplineBreakdown[item.discipline] || 0) + 1;
      if (item.isStudentResearch) studentResearchCount++;
    });
  }

  // Get reviewer workload
  const reviewerStats = await ResearchSubmission.aggregate([
    { $match: matchStage },
    { $unwind: '$reviewWorkflow.reviewers' },
    {
      $group: {
        _id: '$reviewWorkflow.reviewers.userId',
        totalAssigned: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$reviewWorkflow.reviewers.status', 'completed'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $in: ['$reviewWorkflow.reviewers.status', ['invited', 'accepted']] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'reviewer'
      }
    },
    { $unwind: '$reviewer' },
    {
      $project: {
        reviewerName: { $concat: ['$reviewer.name.firstName', ' ', '$reviewer.name.lastName'] },
        totalAssigned: 1,
        completed: 1,
        pending: 1,
        completionRate: { $divide: ['$completed', '$totalAssigned'] }
      }
    },
    { $sort: { totalAssigned: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalSubmissions: stats[0]?.totalSubmissions || 0,
        avgReviewTime: stats[0]?.avgReviewTime ? Math.round(stats[0].avgReviewTime) : null,
        studentResearchCount,
        studentResearchPercentage: stats[0]?.totalSubmissions ? 
          Math.round((studentResearchCount / stats[0].totalSubmissions) * 100) : 0
      },
      statusBreakdown,
      disciplineBreakdown,
      reviewerStats: reviewerStats.slice(0, 10), // Top 10 most active reviewers
      year: year || 'all'
    }
  });
});

// @desc    Get presenter availability overview for conference scheduling
// @route   GET /api/admin/research-submissions/presenter-availability
// @access  Private/Admin
const getPresenterAvailabilityOverview = asyncHandler(async (req, res) => {
  const { conferenceYear } = req.query;
  
  if (!conferenceYear) {
    return res.status(400).json({
      success: false,
      message: 'Conference year is required'
    });
  }

  // Get all accepted submissions for the conference year
  const submissions = await ResearchSubmission.find({
    conferenceYear: parseInt(conferenceYear),
    status: { $in: ['accepted', 'presented'] }
  })
  .populate('correspondingAuthor.userId', 'name email')
  .populate('coAuthors.userId', 'name email')
  .select('title presentationDetails correspondingAuthor coAuthors');

  // Analyze availability data
  const availabilityReport = {
    totalSubmissions: submissions.length,
    submissionsWithAvailabilityData: 0,
    conflictsByDay: {
      wednesday: { am: 0, pm: 0 },
      thursday: { am: 0, pm: 0 },
      friday: { am: 0, pm: 0 }
    },
    conflictDetails: [],
    fullyAvailable: [],
    hasConflicts: [],
    noAvailabilityData: []
  };

  submissions.forEach(submission => {
    const availability = submission.presentationDetails?.presenterAvailability;
    
    if (!availability) {
      availabilityReport.noAvailabilityData.push({
        id: submission._id,
        title: submission.title,
        correspondingAuthor: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
        email: submission.correspondingAuthor.email
      });
      return;
    }

    availabilityReport.submissionsWithAvailabilityData++;
    const conflicts = submission.getPresenterConflictsSummary();

    if (conflicts.hasConflicts) {
      availabilityReport.hasConflicts.push({
        id: submission._id,
        title: submission.title,
        correspondingAuthor: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
        email: submission.correspondingAuthor.email,
        conflicts: conflicts.conflicts,
        generalNotes: conflicts.generalNotes,
        availableSlots: conflicts.totalAvailableSlots
      });

      // Count conflicts by day/period
      conflicts.conflicts.forEach(conflict => {
        const day = conflict.day.toLowerCase();
        const period = conflict.period.toLowerCase();
        if (availabilityReport.conflictsByDay[day] && availabilityReport.conflictsByDay[day][period] !== undefined) {
          availabilityReport.conflictsByDay[day][period]++;
        }
      });
    } else {
      availabilityReport.fullyAvailable.push({
        id: submission._id,
        title: submission.title,
        correspondingAuthor: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
        email: submission.correspondingAuthor.email
      });
    }
  });

  // Calculate scheduling recommendations
  const schedulingRecommendations = {
    leastConflictedSlots: [],
    mostConflictedSlots: []
  };

  const dayPeriods = [
    { day: 'Wednesday', period: 'AM', conflicts: availabilityReport.conflictsByDay.wednesday.am },
    { day: 'Wednesday', period: 'PM', conflicts: availabilityReport.conflictsByDay.wednesday.pm },
    { day: 'Thursday', period: 'AM', conflicts: availabilityReport.conflictsByDay.thursday.am },
    { day: 'Thursday', period: 'PM', conflicts: availabilityReport.conflictsByDay.thursday.pm },
    { day: 'Friday', period: 'AM', conflicts: availabilityReport.conflictsByDay.friday.am },
    { day: 'Friday', period: 'PM', conflicts: availabilityReport.conflictsByDay.friday.pm }
  ];

  schedulingRecommendations.leastConflictedSlots = dayPeriods
    .sort((a, b) => a.conflicts - b.conflicts)
    .slice(0, 3);

  schedulingRecommendations.mostConflictedSlots = dayPeriods
    .sort((a, b) => b.conflicts - a.conflicts)
    .slice(0, 3);

  res.status(200).json({
    success: true,
    data: {
      overview: availabilityReport,
      recommendations: schedulingRecommendations,
      conferenceYear: parseInt(conferenceYear)
    }
  });
});

// @desc    Get detailed presenter conflicts for specific day/time
// @route   GET /api/admin/research-submissions/conflicts/:day/:period
// @access  Private/Admin
const getConflictsForTimeSlot = asyncHandler(async (req, res) => {
  const { day, period } = req.params;
  const { conferenceYear } = req.query;

  const validDays = ['wednesday', 'thursday', 'friday'];
  const validPeriods = ['am', 'pm'];

  if (!validDays.includes(day.toLowerCase()) || !validPeriods.includes(period.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid day or period. Day must be wednesday/thursday/friday, period must be am/pm'
    });
  }

  if (!conferenceYear) {
    return res.status(400).json({
      success: false,
      message: 'Conference year is required'
    });
  }

  const submissions = await ResearchSubmission.find({
    conferenceYear: parseInt(conferenceYear),
    status: { $in: ['accepted', 'presented'] },
    [`presentationDetails.presenterAvailability.${day.toLowerCase()}.${period.toLowerCase()}.available`]: false
  })
  .populate('correspondingAuthor.userId', 'name email phone')
  .populate('coAuthors.userId', 'name email')
  .select('title presentationDetails correspondingAuthor coAuthors');

  const conflictDetails = submissions.map(submission => {
    const availability = submission.presentationDetails.presenterAvailability;
    const conflictNote = availability[day.toLowerCase()][period.toLowerCase()].conflictNote;

    return {
      id: submission._id,
      title: submission.title,
      correspondingAuthor: {
        name: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
        email: submission.correspondingAuthor.email,
        phone: submission.correspondingAuthor.phone
      },
      conflictReason: conflictNote || 'No reason provided',
      generalNotes: availability.generalNotes || '',
      lastUpdated: availability.updatedAt
    };
  });

  res.status(200).json({
    success: true,
    data: {
      timeSlot: `${day.charAt(0).toUpperCase() + day.slice(1)} ${period.toUpperCase()}`,
      conflictCount: conflictDetails.length,
      conflicts: conflictDetails,
      conferenceYear: parseInt(conferenceYear)
    }
  });
});

module.exports = {
  getAllSubmissions,
  assignEditor,
  assignReviewers,
  makeFinalDecision,
  getPotentialReviewers,
  sendReviewerReminders,
  getSubmissionStatistics,
  getPresenterAvailabilityOverview,
  getConflictsForTimeSlot
};
