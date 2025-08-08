const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authMiddleware, requireEmailVerification, optionalAuthMiddleware } = require('../middleware/auth');

// Public routes (no authentication required)

// GET /api/profiles/search - Search profiles by organization, department, etc.
router.get('/search', profileController.searchProfiles);

// GET /api/profiles/stats - Get conference attendee statistics
router.get('/stats', profileController.getConferenceStats);

// GET /api/profiles/:id - Get user profile (public info respecting privacy settings)
router.get('/:id', profileController.getPublicProfile);

// GET /api/profiles/:id/nametag - Get nametag information
router.get('/:id/nametag', profileController.getNametagInfo);

// Protected routes (authentication required)

// GET /api/profile/me - Get current user's full profile
router.get('/me', authMiddleware, profileController.getMyProfile);

// PUT /api/profile/me - Update current user's profile
router.put('/me', authMiddleware, profileController.updateMyProfile);

// PUT /api/profile/me/privacy - Update privacy settings
router.put('/me/privacy', authMiddleware, profileController.updatePrivacySettings);

// POST /api/profile/me/photo - Upload/update profile photo
router.post('/me/photo', authMiddleware, profileController.uploadProfilePhoto);

// GET /api/profile/me/sobie-history - Get user's SOBIE history
router.get('/me/sobie-history', authMiddleware, profileController.getMySobieHistory);

// PUT /api/profile/me/sobie-history - Update user's SOBIE history
router.put('/me/sobie-history', authMiddleware, profileController.updateMySobieHistory);

// POST /api/profile/me/content-check - Run content moderation check
router.post('/me/content-check', authMiddleware, profileController.runContentModerationCheck);

module.exports = router;
