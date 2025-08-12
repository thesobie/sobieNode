const express = require('express');
const router = express.Router();
const {
  getCommunityActivities,
  expressInterest,
  updateInterest,
  withdrawInterest,
  getMyInterests,
  getCoordinatorDashboard,
  getActivityParticipants,
  createActivity
} = require('../controllers/communityController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Public/User Routes (with authentication)

// @route   GET /api/community/:conferenceId/activities
// @desc    Get all community activities for a conference
// @access  Private
router.get('/:conferenceId/activities', authMiddleware, getCommunityActivities);

// @route   GET /api/community/:conferenceId/my-interests
// @desc    Get user's community activity interests
// @access  Private
router.get('/:conferenceId/my-interests', authMiddleware, getMyInterests);

// @route   POST /api/community/:conferenceId/activities/:activityId/interest
// @desc    Express interest in a community activity
// @access  Private
router.post('/:conferenceId/activities/:activityId/interest', authMiddleware, expressInterest);

// @route   PUT /api/community/:conferenceId/activities/:activityId/interest
// @desc    Update interest in a community activity
// @access  Private
router.put('/:conferenceId/activities/:activityId/interest', authMiddleware, updateInterest);

// @route   DELETE /api/community/:conferenceId/activities/:activityId/interest
// @desc    Withdraw interest from a community activity
// @access  Private
router.delete('/:conferenceId/activities/:activityId/interest', authMiddleware, withdrawInterest);

// Activity Coordinator Routes

// @route   GET /api/community/:conferenceId/coordinator/dashboard
// @desc    Get activity coordinator dashboard
// @access  Private (Activity Coordinator or Admin)
router.get('/:conferenceId/coordinator/dashboard', 
  authMiddleware, 
  requireRole('activity-coordinator', 'admin'), 
  getCoordinatorDashboard
);

// @route   GET /api/community/:conferenceId/coordinator/activities/:activityId/participants
// @desc    Get participants for coordinator's activity
// @access  Private (Activity Coordinator or Admin)
router.get('/:conferenceId/coordinator/activities/:activityId/participants', 
  authMiddleware, 
  requireRole('activity-coordinator', 'admin'), 
  getActivityParticipants
);

// Admin/Coordinator Activity Management Routes

// @route   POST /api/community/:conferenceId/activities
// @desc    Create new community activity
// @access  Private (Admin or Activity Coordinator)
router.post('/:conferenceId/activities', 
  authMiddleware, 
  requireRole('admin', 'activity-coordinator'), 
  createActivity
);

module.exports = router;
