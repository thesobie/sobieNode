const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// GET /api/profiles/search - Search profiles by organization, department, etc.
router.get('/search', profileController.searchProfiles);

// GET /api/profiles/stats - Get conference attendee statistics
router.get('/stats', profileController.getConferenceStats);

// GET /api/profiles/:id - Get user profile (public info for nametags, etc.)
router.get('/:id', profileController.getPublicProfile);

// PUT /api/profiles/:id - Update user profile
router.put('/:id', profileController.updateProfile);

// GET /api/profiles/:id/nametag - Get nametag information
router.get('/:id/nametag', profileController.getNametagInfo);

module.exports = router;
