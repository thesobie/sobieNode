const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const ResearchSubmission = require('../models/ResearchSubmission');
const User = require('../models/User');
const Document = require('../models/Document');
const notificationService = require('../services/notificationService');
const path = require('path');
const fs = require('fs');

// @desc    Get proceedings dashboard for admins
// @route   GET /api/admin/proceedings
// @access  Private (Admin only)
const getProceedingsDashboard = asyncHandler(async (req, res) => {
  const { status, year, page = 1, limit = 20 } = req.query;
  
  // Build query
  let query = {
    status: { 
      $in: ['presented', 'proceedings_invited', 'proceedings_submitted', 
            'proceedings_under_review', 'proceedings_revision_required', 
            'proceedings_revised', 'proceedings_accepted', 'proceedings_rejected', 'published'] 
    }
  };
  
  if (status) {
    query.status = status;
  }
  
  if (year) {
    query.conferenceYear = parseInt(year);
  }
  
  // Get submissions with pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    populate: [
      { path: 'conferenceId', select: 'name year' },
      { path: 'correspondingAuthor.userId', select: 'name email' },
      { path: 'proceedings.invitationSentBy', select: 'name email' },
      { path: 'proceedings.proceedingsReview.assignedEditor', select: 'name email' }
    ],
    sort: { 'proceedings.invitationSentAt': -1, createdAt: -1 }
  };
  
  const submissions = await ResearchSubmission.paginate(query, options);
  
  // Get statistics
  const stats = await getProceedingsStatistics(year);
  
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
      statistics: stats
    }
  });
});

// @desc    Invite presentation to submit to proceedings
// @route   POST /api/admin/proceedings/:id/invite
// @access  Private (Admin only)
const inviteToProceedings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { deadline, customMessage } = req.body;
  const adminId = req.user.id;
  
  const submission = await ResearchSubmission.findById(id)
    .populate('correspondingAuthor.userId', 'name email')
    .populate('coAuthors.userId', 'name email');
  
  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }
  
  // Verify submission is eligible for proceedings
  if (submission.status !== 'presented') {
    return res.status(400).json({
      success: false,
      message: 'Only presented papers can be invited to proceedings'
    });
  }
  
  // Check if already invited
  if (submission.proceedings?.invitationSent) {
    return res.status(400).json({
      success: false,
      message: 'Proceedings invitation already sent'
    });
  }
  
  // Set deadline (default 6 weeks if not provided)
  let invitationDeadline = deadline ? new Date(deadline) : null;
  
  // Invite to proceedings
  submission.inviteToProceedings(adminId, invitationDeadline);
  await submission.save();
  
  // Send email notifications to all authors
  try {
    const authors = [submission.correspondingAuthor];
    if (submission.coAuthors && submission.coAuthors.length > 0) {
      authors.push(...submission.coAuthors);
    }
    
    for (const author of authors) {
      if (author.email) {
        await notificationService.sendProceedingsInvitation(
          author.email,
          {
            authorName: `${author.name.firstName} ${author.name.lastName}`,
            paperTitle: submission.title,
            submissionNumber: submission.submissionNumber,
            deadline: submission.proceedings.invitationDeadline,
            customMessage
          }
        );
      }
    }
  } catch (error) {
    console.error('Failed to send proceedings invitation emails:', error);
  }
  
  res.status(200).json({
    success: true,
    message: 'Proceedings invitation sent successfully',
    data: {
      submissionId: submission._id,
      deadline: submission.proceedings.invitationDeadline,
      invitedAt: submission.proceedings.invitationSentAt
    }
  });
});

// @desc    Respond to proceedings invitation (accept/decline)
// @route   POST /api/proceedings/:id/respond
// @access  Private
const respondToInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { accepted, comments } = req.body;
  const userId = req.user.id;
  
  const submission = await ResearchSubmission.findById(id);
  
  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }
  
  // Verify user is authorized (corresponding author or co-author)
  const isAuthorized = submission.correspondingAuthor.userId?.toString() === userId ||
    submission.coAuthors.some(author => author.userId?.toString() === userId);
  
  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to respond to this invitation'
    });
  }
  
  // Verify invitation was sent and not expired
  if (!submission.proceedings?.invitationSent) {
    return res.status(400).json({
      success: false,
      message: 'No proceedings invitation found'
    });
  }
  
  if (submission.proceedings.invitationDeadline && 
      new Date() > submission.proceedings.invitationDeadline) {
    return res.status(400).json({
      success: false,
      message: 'Invitation deadline has passed'
    });
  }
  
  // Check if already responded
  if (submission.proceedings.authorResponse) {
    return res.status(400).json({
      success: false,
      message: 'Already responded to proceedings invitation'
    });
  }
  
  // Record response
  submission.respondToProceedings(userId, accepted, comments);
  await submission.save();
  
  // Send notification to admin
  try {
    await notificationService.sendProceedingsResponse(
      'admin@sobie.org', // TODO: Make this configurable
      {
        paperTitle: submission.title,
        submissionNumber: submission.submissionNumber,
        authorName: req.user.name ? `${req.user.name.firstName} ${req.user.name.lastName}` : req.user.email,
        accepted,
        comments
      }
    );
  } catch (error) {
    console.error('Failed to send proceedings response notification:', error);
  }
  
  res.status(200).json({
    success: true,
    message: `Proceedings invitation ${accepted ? 'accepted' : 'declined'} successfully`,
    data: {
      submissionId: submission._id,
      accepted,
      responseDate: submission.proceedings.authorResponse.responseDate
    }
  });
});

// @desc    Submit final paper for proceedings
// @route   POST /api/proceedings/:id/submit
// @access  Private
const submitProceedingsPaper = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const submission = await ResearchSubmission.findById(id);
  
  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }
  
  // Verify user is authorized
  const isAuthorized = submission.correspondingAuthor.userId?.toString() === userId ||
    submission.coAuthors.some(author => author.userId?.toString() === userId);
  
  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to submit for this paper'
    });
  }
  
  // Verify invitation was accepted
  if (!submission.proceedings?.authorResponse?.acceptedInvitation) {
    return res.status(400).json({
      success: false,
      message: 'Must accept proceedings invitation before submitting'
    });
  }
  
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Final paper file is required'
    });
  }
  
  // Create document record
  const document = new Document({
    filename: req.file.filename,
    originalName: req.file.originalname,
    filePath: req.file.path,
    fileSize: req.file.size,
    uploadedBy: userId,
    documentType: 'proceedings_paper'
  });
  await document.save();
  
  // Submit proceedings paper
  const paperData = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    filePath: req.file.path,
    fileSize: req.file.size,
    documentId: document._id
  };
  
  submission.submitProceedingsPaper(paperData, userId);
  await submission.save();
  
  // Send confirmation to authors and notification to admin
  try {
    // Notify admin
    await notificationService.sendProceedingsSubmission(
      'admin@sobie.org',
      {
        paperTitle: submission.title,
        submissionNumber: submission.submissionNumber,
        authorName: req.user.name ? `${req.user.name.firstName} ${req.user.name.lastName}` : req.user.email,
        submittedAt: submission.proceedings.submittedAt
      }
    );
  } catch (error) {
    console.error('Failed to send proceedings submission notification:', error);
  }
  
  res.status(200).json({
    success: true,
    message: 'Proceedings paper submitted successfully',
    data: {
      submissionId: submission._id,
      submittedAt: submission.proceedings.submittedAt,
      filename: req.file.originalname
    }
  });
});

// @desc    Get user's proceedings status and submissions
// @route   GET /api/proceedings/me
// @access  Private
const getMyProceedings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const submissions = await ResearchSubmission.find({
    $and: [
      {
        $or: [
          { 'correspondingAuthor.userId': userId },
          { 'coAuthors.userId': userId }
        ]
      },
      {
        status: { 
          $in: ['presented', 'proceedings_invited', 'proceedings_submitted', 
                'proceedings_under_review', 'proceedings_revision_required', 
                'proceedings_revised', 'proceedings_accepted', 'proceedings_rejected', 'published'] 
        }
      }
    ]
  })
  .populate('conferenceId', 'name year')
  .sort({ 'proceedings.invitationSentAt': -1, createdAt: -1 });
  
  // Format submissions with proceedings status
  const formattedSubmissions = submissions.map(submission => {
    const proceedingsStatus = submission.getProceedingsStatus();
    
    return {
      id: submission._id,
      submissionNumber: submission.submissionNumber,
      title: submission.title,
      status: submission.status,
      conference: submission.conferenceId,
      proceedings: {
        status: proceedingsStatus,
        invitationDeadline: submission.proceedings?.invitationDeadline,
        hasResponded: !!submission.proceedings?.authorResponse,
        acceptedInvitation: submission.proceedings?.authorResponse?.acceptedInvitation,
        submittedAt: submission.proceedings?.submittedAt,
        publishedAt: submission.proceedings?.publication?.publishedAt
      }
    };
  });
  
  res.status(200).json({
    success: true,
    data: {
      submissions: formattedSubmissions,
      summary: {
        total: formattedSubmissions.length,
        invited: formattedSubmissions.filter(s => s.proceedings.status.phase === 'invitation_sent').length,
        submitted: formattedSubmissions.filter(s => s.proceedings.status.phase === 'under_review').length,
        published: formattedSubmissions.filter(s => s.proceedings.status.phase === 'published').length
      }
    }
  });
});

// @desc    Assign editor for proceedings review
// @route   POST /api/admin/proceedings/:id/assign-editor
// @access  Private (Admin only)
const assignProceedingsEditor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { editorId } = req.body;
  const adminId = req.user.id;
  
  const submission = await ResearchSubmission.findById(id);
  
  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }
  
  if (submission.status !== 'proceedings_submitted') {
    return res.status(400).json({
      success: false,
      message: 'Can only assign editor to submitted proceedings papers'
    });
  }
  
  // Verify editor exists
  const editor = await User.findById(editorId);
  if (!editor) {
    return res.status(404).json({
      success: false,
      message: 'Editor not found'
    });
  }
  
  // Assign editor
  submission.assignProceedingsEditor(editorId, adminId);
  await submission.save();
  
  // Send notification to editor
  try {
    await notificationService.sendProceedingsEditorAssignment(
      editor.email,
      {
        editorName: `${editor.name.firstName} ${editor.name.lastName}`,
        paperTitle: submission.title,
        submissionNumber: submission.submissionNumber
      }
    );
  } catch (error) {
    console.error('Failed to send editor assignment notification:', error);
  }
  
  res.status(200).json({
    success: true,
    message: 'Editor assigned successfully',
    data: {
      submissionId: submission._id,
      editorId,
      assignedAt: submission.proceedings.proceedingsReview.assignedAt
    }
  });
});

// Helper function to get proceedings statistics
const getProceedingsStatistics = async (year = null) => {
  const matchCondition = {
    status: { 
      $in: ['presented', 'proceedings_invited', 'proceedings_submitted', 
            'proceedings_under_review', 'proceedings_revision_required', 
            'proceedings_revised', 'proceedings_accepted', 'proceedings_rejected', 'published'] 
    }
  };
  
  if (year) {
    matchCondition.conferenceYear = parseInt(year);
  }
  
  const pipeline = [
    { $match: matchCondition },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];
  
  const statusCounts = await ResearchSubmission.aggregate(pipeline);
  
  const stats = {
    totalEligible: 0,
    invited: 0,
    responded: 0,
    submitted: 0,
    underReview: 0,
    accepted: 0,
    rejected: 0,
    published: 0
  };
  
  statusCounts.forEach(item => {
    switch (item._id) {
      case 'presented':
        stats.totalEligible += item.count;
        break;
      case 'proceedings_invited':
        stats.invited += item.count;
        break;
      case 'proceedings_submitted':
        stats.submitted += item.count;
        break;
      case 'proceedings_under_review':
      case 'proceedings_revision_required':
      case 'proceedings_revised':
        stats.underReview += item.count;
        break;
      case 'proceedings_accepted':
        stats.accepted += item.count;
        break;
      case 'proceedings_rejected':
        stats.rejected += item.count;
        break;
      case 'published':
        stats.published += item.count;
        break;
    }
  });
  
  return stats;
};

module.exports = {
  getProceedingsDashboard,
  inviteToProceedings,
  respondToInvitation,
  submitProceedingsPaper,
  getMyProceedings,
  assignProceedingsEditor
};
