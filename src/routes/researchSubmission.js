const express = require('express');
const router = express.Router();
const researchSubmissionController = require('../controllers/researchSubmissionController');
const adminResearchController = require('../controllers/adminResearchController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const { validationMiddleware } = require('../middleware/validation');
// @desc    Get submission statistics for admin dashboard
// @access  Private/Admin
router.get('/admin/statistics',
  authMiddleware,
  requireAdmin,
  query('year').optional().isInt(),
  validationMiddleware,
  adminResearchController.getSubmissionStatistics
);

// @route   GET /api/research-submission/admin/presenter-availability
// @desc    Get presenter availability overview for conference scheduling
// @access  Private/Admin
router.get('/admin/presenter-availability',
  authMiddleware,
  requireAdmin,
  query('conferenceYear').isInt().withMessage('Conference year is required'),
  validationMiddleware,
  adminResearchController.getPresenterAvailabilityOverview
);

// @route   GET /api/research-submission/admin/conflicts/:day/:period
// @desc    Get detailed conflicts for specific time slot
// @access  Private/Admin
router.get('/admin/conflicts/:day/:period',
  authMiddleware,
  requireAdmin,
  param('day').isIn(['wednesday', 'thursday', 'friday']).withMessage('Day must be wednesday, thursday, or friday'),
  param('period').isIn(['am', 'pm']).withMessage('Period must be am or pm'),
  query('conferenceYear').isInt().withMessage('Conference year is required'),
  validationMiddleware,
  adminResearchController.getConflictsForTimeSlot
);




// Validation rules
const createSubmissionValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Title must be between 5 and 500 characters'),
  body('abstract')
    .trim()
    .isLength({ min: 100, max: 5000 })
    .withMessage('Abstract must be between 100 and 5000 characters'),
  body('conferenceId')
    .isMongoId()
    .withMessage('Valid conference ID is required'),
  body('researchType')
    .isIn(['empirical', 'theoretical', 'case_study', 'literature_review', 'experimental', 'survey', 'qualitative', 'quantitative', 'mixed_methods'])
    .withMessage('Valid research type is required'),
  body('discipline')
    .isIn(['accounting', 'economics', 'finance', 'management', 'marketing', 'operations', 'strategy', 'entrepreneurship', 'human_resources', 'information_systems', 'international_business', 'organizational_behavior', 'public_administration', 'supply_chain', 'analytics', 'pedagogy', 'other'])
    .withMessage('Valid discipline is required'),
  body('academicLevel')
    .isIn(['undergraduate', 'graduate', 'faculty', 'industry'])
    .withMessage('Valid academic level is required'),
  body('correspondingAuthor.name.firstName')
    .trim()
    .notEmpty()
    .withMessage('Corresponding author first name is required'),
  body('correspondingAuthor.name.lastName')
    .trim()
    .notEmpty()
    .withMessage('Corresponding author last name is required'),
  body('correspondingAuthor.email')
    .isEmail()
    .withMessage('Valid corresponding author email is required'),
  body('correspondingAuthor.affiliation.institution')
    .trim()
    .notEmpty()
    .withMessage('Corresponding author institution is required')
];

const reviewResponseValidation = [
  body('response')
    .isIn(['accept', 'decline'])
    .withMessage('Response must be either accept or decline')
];

const submitReviewValidation = [
  body('overallScore')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall score must be between 1 and 5'),
  body('recommendation')
    .isIn(['accept', 'minor_revision', 'major_revision', 'reject'])
    .withMessage('Valid recommendation is required'),
  body('criteria.relevance.score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Relevance score must be between 1 and 5'),
  body('criteria.methodology.score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Methodology score must be between 1 and 5'),
  body('criteria.originality.score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Originality score must be between 1 and 5'),
  body('criteria.clarity.score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Clarity score must be between 1 and 5'),
  body('criteria.significance.score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Significance score must be between 1 and 5')
];

// Author/User Routes
// =================

// @route   POST /api/research-submission
// @desc    Create new research submission
// @access  Private
router.post('/', 
  authMiddleware, 
  createSubmissionValidation,
  validationMiddleware,
  researchSubmissionController.createSubmission
);

// @route   POST /api/research-submission/:id/upload-paper
// @desc    Upload paper file for submission
// @access  Private (Author only)
router.post('/:id/upload-paper',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  validationMiddleware,
  researchSubmissionController.uploadPaper
);

// @route   POST /api/research-submission/:id/submit
// @desc    Submit research for review
// @access  Private (Author only)
router.post('/:id/submit',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  validationMiddleware,
  researchSubmissionController.submitForReview
);

// @route   GET /api/research-submission/my-submissions
// @desc    Get user's research submissions
// @access  Private
router.get('/my-submissions',
  authMiddleware,
  query('status').optional().isIn(['draft', 'submitted', 'under_review', 'pending_revision', 'revised', 'accepted', 'rejected', 'withdrawn', 'presented']),
  query('year').optional().isInt(),
  validationMiddleware,
  researchSubmissionController.getMySubmissions
);

// @route   GET /api/research-submission/:id
// @desc    Get submission details
// @access  Private (Associated users only)
router.get('/:id',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  validationMiddleware,
  researchSubmissionController.getSubmissionDetails
);

// Reviewer Routes
// ===============

// @route   GET /api/research-submission/for-review
// @desc    Get submissions assigned for review
// @access  Private (Reviewers)
router.get('/for-review',
  authMiddleware,
  query('status').optional().isIn(['invited', 'accepted', 'declined', 'completed', 'overdue']),
  validationMiddleware,
  researchSubmissionController.getSubmissionsForReview
);

// @route   POST /api/research-submission/:id/review-response
// @desc    Accept or decline review invitation
// @access  Private (Assigned reviewer only)
router.post('/:id/review-response',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  reviewResponseValidation,
  validationMiddleware,
  researchSubmissionController.respondToReviewInvitation
);

// @route   POST /api/research-submission/:id/submit-review
// @desc    Submit review
// @access  Private (Assigned reviewer only)
router.post('/:id/submit-review',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  submitReviewValidation,
  validationMiddleware,
  researchSubmissionController.submitReview
);

// Notification Management
// ======================

// @route   GET /api/research-submission/notification-preferences
// @desc    Get user's notification preferences for research submissions
// @access  Private
router.get('/notification-preferences',
  authMiddleware,
  researchSubmissionController.getNotificationPreferences
);

// @route   PUT /api/research-submission/:id/notification-preferences
// @desc    Update notification preferences
// @access  Private (Associated users only)
router.put('/:id/notification-preferences',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  body('statusUpdates').optional().isBoolean(),
  body('reviewUpdates').optional().isBoolean(),
  body('deadlineReminders').optional().isBoolean(),
  validationMiddleware,
  researchSubmissionController.updateNotificationPreferences
);

// @route   GET /api/research-submission/:id/presenter-availability
// @desc    Get presenter availability for conference days
// @access  Private (Authors only)
router.get('/:id/presenter-availability',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  validationMiddleware,
  researchSubmissionController.getPresenterAvailability
);

// @route   PUT /api/research-submission/:id/presenter-availability
// @desc    Update presenter availability for conference days
// @access  Private (Authors only)
router.put('/:id/presenter-availability',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  body('wednesday.am.available').optional().isBoolean(),
  body('wednesday.am.conflictNote').optional().isString().isLength({ max: 500 }),
  body('wednesday.pm.available').optional().isBoolean(),
  body('wednesday.pm.conflictNote').optional().isString().isLength({ max: 500 }),
  body('thursday.am.available').optional().isBoolean(),
  body('thursday.am.conflictNote').optional().isString().isLength({ max: 500 }),
  body('thursday.pm.available').optional().isBoolean(),
  body('thursday.pm.conflictNote').optional().isString().isLength({ max: 500 }),
  body('friday.am.available').optional().isBoolean(),
  body('friday.am.conflictNote').optional().isString().isLength({ max: 500 }),
  body('friday.pm.available').optional().isBoolean(),
  body('friday.pm.conflictNote').optional().isString().isLength({ max: 500 }),
  body('generalNotes').optional().isString().isLength({ max: 1000 }),
  validationMiddleware,
  researchSubmissionController.updatePresenterAvailability
);

// Admin/Editor Routes
// ==================

// @route   GET /api/research-submission/admin/all
// @desc    Get all submissions for admin dashboard
// @access  Private/Admin
router.get('/admin/all',
  authMiddleware,
  requireAdmin,
  query('status').optional().isIn(['draft', 'submitted', 'under_review', 'pending_revision', 'revised', 'accepted', 'rejected', 'withdrawn', 'presented']),
  query('conferenceYear').optional().isInt(),
  query('discipline').optional().isIn(['accounting', 'economics', 'finance', 'management', 'marketing', 'operations', 'strategy', 'entrepreneurship', 'human_resources', 'information_systems', 'international_business', 'organizational_behavior', 'public_administration', 'supply_chain', 'analytics', 'pedagogy', 'other']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validationMiddleware,
  adminResearchController.getAllSubmissions
);

// @route   POST /api/research-submission/admin/:id/assign-editor
// @desc    Assign editor to submission
// @access  Private/Admin
router.post('/admin/:id/assign-editor',
  authMiddleware,
  requireAdmin,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  body('editorId').isMongoId().withMessage('Valid editor ID is required'),
  body('notes').optional().isString(),
  validationMiddleware,
  adminResearchController.assignEditor
);

// @route   POST /api/research-submission/admin/:id/assign-reviewers
// @desc    Assign reviewers to submission
// @access  Private/Admin or Editor
router.post('/admin/:id/assign-reviewers',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  body('reviewerIds').isArray({ min: 1, max: 5 }).withMessage('1-5 reviewer IDs are required'),
  body('reviewerIds.*').isMongoId().withMessage('Valid reviewer IDs are required'),
  body('reviewDeadline').optional().isISO8601().withMessage('Valid review deadline is required'),
  validationMiddleware,
  adminResearchController.assignReviewers
);

// @route   POST /api/research-submission/admin/:id/make-decision
// @desc    Make final decision on submission
// @access  Private/Admin or Editor
router.post('/admin/:id/make-decision',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  body('decision').isIn(['accept', 'minor_revision', 'major_revision', 'reject']).withMessage('Valid decision is required'),
  body('editorComments').optional().isString(),
  validationMiddleware,
  adminResearchController.makeFinalDecision
);

// @route   GET /api/research-submission/admin/:id/potential-reviewers
// @desc    Get potential reviewers for a submission
// @access  Private/Admin or Editor
router.get('/admin/:id/potential-reviewers',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  validationMiddleware,
  adminResearchController.getPotentialReviewers
);

// @route   POST /api/research-submission/admin/:id/send-reminders
// @desc    Send reminder to reviewers
// @access  Private/Admin or Editor
router.post('/admin/:id/send-reminders',
  authMiddleware,
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  body('reviewerIds').optional().isArray(),
  body('reviewerIds.*').optional().isMongoId(),
  validationMiddleware,
  adminResearchController.sendReviewerReminders
);

// @route   GET /api/research-submission/admin/statistics
// @desc    Get submission statistics for admin dashboard
// @access  Private/Admin
router.get('/admin/statistics',
  authMiddleware,
  requireAdmin,
  query('year').optional().isInt(),
  validationMiddleware,
  adminResearchController.getSubmissionStatistics
);

module.exports = router;
