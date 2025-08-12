const express = require('express');
const router = express.Router();
const suggestionController = require('../controllers/suggestionController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole(['admin']));

// @route   GET /api/admin/suggestions
// @desc    Get all suggestions for admin dashboard
// @access  Private (Admin only)
router.get('/suggestions', suggestionController.getAdminDashboard);

// @route   PUT /api/admin/suggestions/:id/review
// @desc    Review suggestion (approve/reject)
// @access  Private (Admin only)
router.put('/suggestions/:id/review', suggestionController.reviewSuggestion);

// @route   PUT /api/admin/suggestions/:id/implement
// @desc    Mark suggestion as implemented
// @access  Private (Admin only)
router.put('/suggestions/:id/implement', suggestionController.implementSuggestion);

module.exports = router;
