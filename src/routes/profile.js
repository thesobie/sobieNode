const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const photoUploadService = require('../services/photoUploadService');
const { authMiddleware, requireEmailVerification, optionalAuthMiddleware } = require('../middleware/auth');
const {
  validateProfileUpdate,
  validatePrivacySettings,
  validateSobieHistory,
  handleValidationErrors,
  validateConditionalFields
} = require('../middleware/profileValidation');

// Configure multer for photo uploads
const photoUpload = photoUploadService.getMulterConfig();

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

// GET /api/profile/me/summary - Get current user's profile summary
router.get('/me/summary', authMiddleware, profileController.getMyProfileSummary);

// GET /api/profile/me/completeness - Get profile completeness status
router.get('/me/completeness', authMiddleware, profileController.getProfileCompleteness);

// PUT /api/profile/me - Update current user's profile
router.put('/me', 
  authMiddleware, 
  validateProfileUpdate, 
  handleValidationErrors, 
  validateConditionalFields, 
  profileController.updateMyProfile
);

// PUT /api/profile/me/privacy - Update privacy settings
router.put('/me/privacy', 
  authMiddleware, 
  validatePrivacySettings, 
  handleValidationErrors, 
  profileController.updatePrivacySettings
);

// POST /api/profile/me/photo - Upload/update profile photo
router.post('/me/photo', authMiddleware, photoUpload.single('photo'), profileController.uploadProfilePhoto);

// DELETE /api/profile/me/photo - Remove profile photo
router.delete('/me/photo', authMiddleware, profileController.removeProfilePhoto);

// GET /api/profile/me/photo/config - Get photo upload configuration
router.get('/me/photo/config', authMiddleware, profileController.getPhotoUploadConfig);

// GET /api/profile/me/sobie-history - Get user's SOBIE history
router.get('/me/sobie-history', authMiddleware, profileController.getMySobieHistory);

// PUT /api/profile/me/sobie-history - Update user's SOBIE history
router.put('/me/sobie-history', 
  authMiddleware, 
  validateSobieHistory, 
  handleValidationErrors, 
  profileController.updateMySobieHistory
);

// POST /api/profile/me/sobie-history/:type - Add single item to SOBIE history
router.post('/me/sobie-history/:type', authMiddleware, profileController.addSobieHistoryItem);

// POST /api/profile/me/content-check - Run content moderation check
router.post('/me/content-check', authMiddleware, profileController.runContentModerationCheck);

module.exports = router;
