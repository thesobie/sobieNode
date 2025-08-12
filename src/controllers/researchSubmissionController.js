const ResearchSubmission = require('../models/ResearchSubmission');
const User = require('../models/User');
const Conference = require('../models/Conference');
const Document = require('../models/Document');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const { asyncHandler } = require('../utils/asyncHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/research');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow common academic file types
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, TXT, and RTF files are allowed'));
    }
  }
});

// @desc    Create new research submission
// @route   POST /api/research-submission
// @access  Private
const createSubmission = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    title,
    abstract,
    keywords,
    conferenceId,
    researchType,
    presentationType,
    discipline,
    academicLevel,
    correspondingAuthor,
    coAuthors,
    researchDetails
  } = req.body;

  // Validate conference exists and is accepting submissions
  const conference = await Conference.findById(conferenceId);
  if (!conference) {
    return res.status(404).json({
      success: false,
      message: 'Conference not found'
    });
  }

  // Check if submission deadline has passed
  if (conference.submissionDeadline && new Date() > conference.submissionDeadline) {
    return res.status(400).json({
      success: false,
      message: 'Submission deadline has passed'
    });
  }

  // Create submission
  const submission = new ResearchSubmission({
    title,
    abstract,
    keywords: keywords || [],
    conferenceId,
    conferenceYear: conference.year,
    researchType,
    presentationType: presentationType || 'paper',
    discipline,
    academicLevel,
    correspondingAuthor: {
      ...correspondingAuthor,
      userId
    },
    coAuthors: coAuthors || [],
    researchDetails: researchDetails || {},
    status: 'draft',
    submissionDeadline: conference.submissionDeadline
  });

  await submission.save();

  res.status(201).json({
    success: true,
    data: {
      submission,
      message: 'Research submission created successfully. Please upload your paper to complete the submission.'
    }
  });
});

// @desc    Upload paper file for submission
// @route   POST /api/research-submission/:id/upload-paper
// @access  Private
const uploadPaper = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const userId = req.user._id;

  const submission = await ResearchSubmission.findOne({
    _id: submissionId,
    'correspondingAuthor.userId': userId
  });

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found or you are not authorized to upload files'
    });
  }

  if (submission.status !== 'draft') {
    return res.status(400).json({
      success: false,
      message: 'Cannot upload files for submissions that are not in draft status'
    });
  }

  // Use multer middleware
  upload.single('paper')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      // Create document record
      const document = new Document({
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: userId,
        category: 'research_paper'
      });

      await document.save();

      // Update submission with paper upload
      submission.paperUpload = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        uploadDate: new Date(),
        documentId: document._id
      };

      await submission.save();

      res.status(200).json({
        success: true,
        data: {
          submission,
          uploadedFile: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
          },
          message: 'Paper uploaded successfully. You can now submit your research for review.'
        }
      });

    } catch (error) {
      // Clean up uploaded file if database operation fails
      await fs.unlink(req.file.path).catch(() => {});
      throw error;
    }
  });
});

// @desc    Submit research for review
// @route   POST /api/research-submission/:id/submit
// @access  Private
const submitForReview = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const userId = req.user._id;

  const submission = await ResearchSubmission.findOne({
    _id: submissionId,
    'correspondingAuthor.userId': userId
  }).populate('conferenceId', 'name year editorEmails');

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found or you are not authorized'
    });
  }

  if (submission.status !== 'draft') {
    return res.status(400).json({
      success: false,
      message: 'Submission has already been submitted'
    });
  }

  if (!submission.paperUpload || !submission.paperUpload.filename) {
    return res.status(400).json({
      success: false,
      message: 'Please upload your research paper before submitting'
    });
  }

  // Update submission status
  submission.status = 'submitted';
  submission.initialSubmissionDate = new Date();

  await submission.save();

  // Send confirmation email to corresponding author
  try {
    await emailService.sendResearchSubmissionConfirmation(
      submission.correspondingAuthor.email,
      {
        authorName: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
        title: submission.title,
        submissionNumber: submission.submissionNumber,
        conferenceName: submission.conferenceId.name,
        conferenceYear: submission.conferenceYear
      }
    );

    // Notify conference editors
    if (submission.conferenceId.editorEmails && submission.conferenceId.editorEmails.length > 0) {
      for (const editorEmail of submission.conferenceId.editorEmails) {
        await emailService.sendNewSubmissionNotification(
          editorEmail,
          {
            title: submission.title,
            authorName: submission.authorList,
            submissionNumber: submission.submissionNumber,
            discipline: submission.discipline,
            submissionDate: submission.initialSubmissionDate
          }
        );
      }
    }

    // Add notification record
    submission.addNotification(
      'submission_received',
      [{ email: submission.correspondingAuthor.email }],
      'Research submission received and confirmation sent',
      userId
    );

    await submission.save();

  } catch (emailError) {
    console.error('Failed to send submission emails:', emailError);
    // Don't fail the submission if email fails
  }

  res.status(200).json({
    success: true,
    data: {
      submission,
      message: 'Research submitted successfully! You will receive email updates on the review process.'
    }
  });
});

// @desc    Get user's research submissions
// @route   GET /api/research-submission/my-submissions
// @access  Private
const getMySubmissions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status, year } = req.query;

  const submissions = await ResearchSubmission.getByUser(userId, status)
    .populate('reviewWorkflow.editor.userId', 'name email')
    .populate('reviewWorkflow.reviewers.userId', 'name email');

  // Filter by year if specified
  let filteredSubmissions = submissions;
  if (year) {
    filteredSubmissions = submissions.filter(s => s.conferenceYear === parseInt(year));
  }

  // Group by status for dashboard view
  const submissionsByStatus = filteredSubmissions.reduce((acc, submission) => {
    const status = submission.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(submission);
    return acc;
  }, {});

  // Calculate statistics
  const stats = {
    total: filteredSubmissions.length,
    byStatus: Object.keys(submissionsByStatus).reduce((acc, status) => {
      acc[status] = submissionsByStatus[status].length;
      return acc;
    }, {}),
    byYear: submissions.reduce((acc, submission) => {
      const year = submission.conferenceYear;
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {})
  };

  res.status(200).json({
    success: true,
    data: {
      submissions: filteredSubmissions,
      submissionsByStatus,
      statistics: stats
    }
  });
});

// @desc    Get submission details
// @route   GET /api/research-submission/:id
// @access  Private
const getSubmissionDetails = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const userId = req.user._id;

  const submission = await ResearchSubmission.findOne({
    _id: submissionId,
    'associatedUsers.userId': userId
  })
    .populate('conferenceId')
    .populate('correspondingAuthor.userId', 'name email affiliation')
    .populate('coAuthors.userId', 'name email affiliation')
    .populate('reviewWorkflow.editor.userId', 'name email affiliation')
    .populate('reviewWorkflow.reviewers.userId', 'name email affiliation');

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found or you are not authorized to view it'
    });
  }

  // Determine user's role in this submission
  const userAssociation = submission.associatedUsers.find(
    u => u.userId.toString() === userId.toString()
  );

  const userRole = userAssociation ? userAssociation.relationship : 'viewer';

  // Filter sensitive information based on user role
  let submissionData = submission.toObject();

  if (userRole === 'reviewer') {
    // Reviewers shouldn't see other reviews until they submit their own
    const userReview = submission.reviewWorkflow.reviewers.find(
      r => r.userId._id.toString() === userId.toString()
    );
    
    if (userReview && userReview.status !== 'completed') {
      submissionData.reviewWorkflow.reviewers = submissionData.reviewWorkflow.reviewers.map(r => {
        if (r.userId._id.toString() !== userId.toString()) {
          return { ...r, review: undefined };
        }
        return r;
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      submission: submissionData,
      userRole,
      canEdit: ['author', 'co_author'].includes(userRole) && submission.status === 'draft',
      canReview: userRole === 'reviewer' && submission.status === 'under_review'
    }
  });
});

// @desc    Get submissions assigned for review
// @route   GET /api/research-submission/for-review
// @access  Private
const getSubmissionsForReview = asyncHandler(async (req, res) => {
  const reviewerId = req.user._id;
  const { status } = req.query;

  const submissions = await ResearchSubmission.getForReviewer(reviewerId, status);

  // Add review status for each submission
  const submissionsWithStatus = submissions.map(submission => {
    const reviewerInfo = submission.reviewWorkflow.reviewers.find(
      r => r.userId.toString() === reviewerId.toString()
    );

    return {
      ...submission.toObject(),
      myReviewStatus: reviewerInfo ? reviewerInfo.status : 'not_assigned',
      reviewDeadline: submission.reviewWorkflow.reviewDeadline,
      daysRemaining: submission.reviewWorkflow.reviewDeadline 
        ? Math.ceil((submission.reviewWorkflow.reviewDeadline - new Date()) / (1000 * 60 * 60 * 24))
        : null
    };
  });

  res.status(200).json({
    success: true,
    data: {
      submissions: submissionsWithStatus,
      summary: {
        total: submissionsWithStatus.length,
        pending: submissionsWithStatus.filter(s => s.myReviewStatus === 'invited').length,
        accepted: submissionsWithStatus.filter(s => s.myReviewStatus === 'accepted').length,
        completed: submissionsWithStatus.filter(s => s.myReviewStatus === 'completed').length
      }
    }
  });
});

// @desc    Accept or decline review invitation
// @route   POST /api/research-submission/:id/review-response
// @access  Private
const respondToReviewInvitation = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const reviewerId = req.user._id;
  const { response } = req.body; // 'accept' or 'decline'

  if (!['accept', 'decline'].includes(response)) {
    return res.status(400).json({
      success: false,
      message: 'Response must be either "accept" or "decline"'
    });
  }

  const submission = await ResearchSubmission.findOne({
    _id: submissionId,
    'reviewWorkflow.reviewers.userId': reviewerId
  }).populate('correspondingAuthor.userId', 'name email');

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Review invitation not found'
    });
  }

  try {
    if (response === 'accept') {
      submission.acceptReview(reviewerId);
    } else {
      submission.declineReview(reviewerId);
    }

    await submission.save();

    // Send notification email to editor and author
    const reviewer = await User.findById(reviewerId).select('name email');
    const responseMessage = response === 'accept' 
      ? `${reviewer.name.firstName} ${reviewer.name.lastName} has accepted the review invitation`
      : `${reviewer.name.firstName} ${reviewer.name.lastName} has declined the review invitation`;

    // Add notification
    submission.addNotification(
      'review_' + response,
      [{ email: submission.correspondingAuthor.email }],
      responseMessage,
      reviewerId
    );

    await submission.save();

    res.status(200).json({
      success: true,
      data: {
        submission,
        message: `Review invitation ${response}ed successfully`
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Submit review
// @route   POST /api/research-submission/:id/submit-review
// @access  Private
const submitReview = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const reviewerId = req.user._id;
  const {
    overallScore,
    recommendation,
    criteria,
    confidentialComments,
    authorComments
  } = req.body;

  // Validation
  if (!overallScore || !recommendation || !criteria) {
    return res.status(400).json({
      success: false,
      message: 'Overall score, recommendation, and criteria scores are required'
    });
  }

  if (overallScore < 1 || overallScore > 5) {
    return res.status(400).json({
      success: false,
      message: 'Overall score must be between 1 and 5'
    });
  }

  if (!['accept', 'minor_revision', 'major_revision', 'reject'].includes(recommendation)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid recommendation'
    });
  }

  const submission = await ResearchSubmission.findOne({
    _id: submissionId,
    'reviewWorkflow.reviewers.userId': reviewerId,
    'reviewWorkflow.reviewers.status': 'accepted'
  }).populate('correspondingAuthor.userId', 'name email');

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Review assignment not found or not accepted'
    });
  }

  try {
    const reviewData = {
      overallScore,
      recommendation,
      criteria,
      confidentialComments,
      authorComments
    };

    submission.submitReview(reviewerId, reviewData);
    await submission.save();

    // Check if all reviews are completed
    const allReviewsCompleted = submission.reviewWorkflow.reviewers.every(
      r => r.status === 'completed' || r.status === 'declined'
    );

    if (allReviewsCompleted) {
      // Notify editor that all reviews are complete
      if (submission.reviewWorkflow.editor.userId) {
        const editor = await User.findById(submission.reviewWorkflow.editor.userId);
        if (editor) {
          await emailService.sendReviewsCompleteNotification(
            editor.email,
            {
              editorName: `${editor.name.firstName} ${editor.name.lastName}`,
              title: submission.title,
              submissionNumber: submission.submissionNumber,
              reviewCount: submission.reviewWorkflow.reviewers.filter(r => r.status === 'completed').length
            }
          );
        }
      }
    }

    // Add notification
    submission.addNotification(
      'review_completed',
      [{ email: submission.correspondingAuthor.email }],
      'A review has been completed for your submission',
      reviewerId
    );

    await submission.save();

    res.status(200).json({
      success: true,
      data: {
        submission,
        message: 'Review submitted successfully',
        allReviewsCompleted
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get user's notification preferences for research submissions
// @route   GET /api/research-submission/notification-preferences
// @access  Private
const getNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const submissions = await ResearchSubmission.find({
    'associatedUsers.userId': userId
  }).select('title submissionNumber associatedUsers');

  const preferences = submissions.map(submission => {
    const userAssociation = submission.associatedUsers.find(
      u => u.userId.toString() === userId.toString()
    );

    return {
      submissionId: submission._id,
      title: submission.title,
      submissionNumber: submission.submissionNumber,
      relationship: userAssociation.relationship,
      notificationPreferences: userAssociation.notificationPreferences
    };
  });

  res.status(200).json({
    success: true,
    data: preferences
  });
});

// @desc    Update notification preferences
// @route   PUT /api/research-submission/:id/notification-preferences
// @access  Private
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const userId = req.user._id;
  const { statusUpdates, reviewUpdates, deadlineReminders } = req.body;

  const submission = await ResearchSubmission.findOne({
    _id: submissionId,
    'associatedUsers.userId': userId
  });

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found or you are not associated with it'
    });
  }

  const userAssociation = submission.associatedUsers.find(
    u => u.userId.toString() === userId.toString()
  );

  if (userAssociation) {
    userAssociation.notificationPreferences = {
      statusUpdates: statusUpdates !== false,
      reviewUpdates: reviewUpdates !== false,
      deadlineReminders: deadlineReminders !== false
    };

    await submission.save();
  }

  res.status(200).json({
    success: true,
    data: {
      preferences: userAssociation.notificationPreferences,
      message: 'Notification preferences updated successfully'
    }
  });
});

// @desc    Update presenter availability for conference
// @route   PUT /api/research-submission/:id/presenter-availability
// @access  Private
const updatePresenterAvailability = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const userId = req.user._id;
  const availabilityData = req.body;

  // Validate request body structure
  const validDays = ['wednesday', 'thursday', 'friday'];
  const validPeriods = ['am', 'pm'];
  
  for (const day of validDays) {
    if (availabilityData[day]) {
      for (const period of validPeriods) {
        if (availabilityData[day][period]) {
          const periodData = availabilityData[day][period];
          if (typeof periodData.available !== 'boolean' && periodData.available !== undefined) {
            return res.status(400).json({
              success: false,
              message: `Invalid availability value for ${day} ${period}. Must be boolean.`
            });
          }
          if (periodData.conflictNote && typeof periodData.conflictNote !== 'string') {
            return res.status(400).json({
              success: false,
              message: `Invalid conflict note for ${day} ${period}. Must be string.`
            });
          }
        }
      }
    }
  }

  const submission = await ResearchSubmission.findOne({
    _id: submissionId,
    'associatedUsers.userId': userId
  });

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found or you are not associated with it'
    });
  }

  // Check if user is a presenter (corresponding author or co-author)
  const isCorrespondingAuthor = submission.correspondingAuthor.userId.toString() === userId.toString();
  const isCoAuthor = submission.coAuthors.some(author => 
    author.userId && author.userId.toString() === userId.toString()
  );

  if (!isCorrespondingAuthor && !isCoAuthor) {
    return res.status(403).json({
      success: false,
      message: 'Only authors can update presenter availability'
    });
  }

  // Update availability
  const updatedAvailability = submission.updatePresenterAvailability(availabilityData);
  await submission.save();

  // Get conflicts summary
  const conflictsSummary = submission.getPresenterConflictsSummary();

  res.status(200).json({
    success: true,
    data: {
      availability: updatedAvailability,
      summary: conflictsSummary,
      message: 'Presenter availability updated successfully'
    }
  });
});

// @desc    Get presenter availability for conference
// @route   GET /api/research-submission/:id/presenter-availability
// @access  Private
const getPresenterAvailability = asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const userId = req.user._id;

  const submission = await ResearchSubmission.findOne({
    _id: submissionId,
    'associatedUsers.userId': userId
  });

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found or you are not associated with it'
    });
  }

  const availability = submission.presentationDetails?.presenterAvailability || {
    wednesday: { am: { available: true }, pm: { available: true } },
    thursday: { am: { available: true }, pm: { available: true } },
    friday: { am: { available: true }, pm: { available: true } },
    generalNotes: '',
    updatedAt: null
  };

  const conflictsSummary = submission.getPresenterConflictsSummary();

  res.status(200).json({
    success: true,
    data: {
      availability,
      summary: conflictsSummary,
      submissionTitle: submission.title,
      conferenceYear: submission.conferenceYear
    }
  });
});

module.exports = {
  createSubmission,
  uploadPaper,
  submitForReview,
  getMySubmissions,
  getSubmissionDetails,
  getSubmissionsForReview,
  respondToReviewInvitation,
  submitReview,
  getNotificationPreferences,
  updateNotificationPreferences,
  updatePresenterAvailability,
  getPresenterAvailability
};
