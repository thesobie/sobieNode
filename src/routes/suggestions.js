const express = require('express');
const router = express.Router();
const suggestionController = require('../controllers/suggestionController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All suggestion routes require authentication
router.use(authMiddleware);

// User routes for managing their own suggestions

// @route   GET /api/suggestions/form-options
// @desc    Get form options for creating suggestions
// @access  Private
router.get('/form-options', suggestionController.getFormOptions);

// @route   POST /api/suggestions
// @desc    Submit a new suggestion
// @access  Private
router.post('/', suggestionController.submitSuggestion);

// @route   GET /api/suggestions/me
// @desc    Get user's own suggestions
// @access  Private
router.get('/me', suggestionController.getMySuggestions);

// @route   GET /api/suggestions/:id
// @desc    Get suggestion by ID (if user owns it)
// @access  Private
router.get('/:id', suggestionController.getSuggestion);

// @route   PUT /api/suggestions/:id
// @desc    Update suggestion (before review)
// @access  Private
router.put('/:id', suggestionController.updateSuggestion);

// @route   DELETE /api/suggestions/:id
// @desc    Cancel suggestion
// @access  Private
router.delete('/:id', suggestionController.cancelSuggestion);

module.exports = router;
