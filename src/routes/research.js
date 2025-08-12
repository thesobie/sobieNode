const express = require('express');
const router = express.Router();
const researchController = require('../controllers/researchController');
const researchSubmissionController = require('../controllers/researchSubmissionController');
const { authMiddleware } = require('../middleware/auth');

// All research routes require authentication
router.use(authMiddleware);

// Research Presentation Routes (existing)
// ======================================

// @route   GET /api/research/me/presentations
// @desc    Get user's research presentations across all conferences
// @access  Private
router.get('/me/presentations', researchController.getMyPresentations);

// @route   GET /api/research/me/presentations/:id
// @desc    Get detailed view of a specific presentation (if user is author)
// @access  Private
router.get('/me/presentations/:id', researchController.getMyPresentationDetails);

// @route   GET /api/research/me/collaborations
// @desc    Get user's research collaboration network
// @access  Private
router.get('/me/collaborations', researchController.getMyCollaborations);

// @route   GET /api/research/me/sobie-history
// @desc    Get user's complete SOBIE participation history
// @access  Private
router.get('/me/sobie-history', researchController.getMyCompleteSobieHistory);

// @route   GET /api/research/me/search
// @desc    Search presentations by criteria (for user's own work)
// @access  Private
router.get('/me/search', researchController.searchMyPresentations);

// Research Submission Routes (new)
// ================================

// @route   GET /api/research/me/submissions
// @desc    Get user's research submissions
// @access  Private
router.get('/me/submissions', researchSubmissionController.getMySubmissions);

// @route   GET /api/research/submissions/:id
// @desc    Get submission details (for associated users)
// @access  Private
router.get('/submissions/:id', researchSubmissionController.getSubmissionDetails);

// @route   GET /api/research/me/reviews
// @desc    Get submissions assigned for review
// @access  Private (Reviewers)
router.get('/me/reviews', researchSubmissionController.getSubmissionsForReview);

// @route   POST /api/research/submissions/:id/review-response
// @desc    Accept or decline review invitation
// @access  Private (Assigned reviewer only)
router.post('/submissions/:id/review-response', researchSubmissionController.respondToReviewInvitation);

// @route   POST /api/research/submissions/:id/submit-review
// @desc    Submit review
// @access  Private (Assigned reviewer only)
router.post('/submissions/:id/submit-review', researchSubmissionController.submitReview);

// @route   GET /api/research/notification-preferences
// @desc    Get user's notification preferences for research submissions
// @access  Private
router.get('/notification-preferences', researchSubmissionController.getNotificationPreferences);

// @route   PUT /api/research/submissions/:id/notification-preferences
// @desc    Update notification preferences
// @access  Private (Associated users only)
router.put('/submissions/:id/notification-preferences', researchSubmissionController.updateNotificationPreferences);

module.exports = router;
