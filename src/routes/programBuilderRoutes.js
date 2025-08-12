const express = require('express');
const router = express.Router();
const {
  getProgramBuilderDashboard,
  createSession,
  updateSession,
  getGroupingSuggestions,
  deleteSession
} = require('../controllers/programBuilderController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// Middleware to check if user is admin or editor
const requireEditor = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.roles.includes('admin') && !user.roles.includes('editor')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Editor or Admin role required.'
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization error',
      error: error.message
    });
  }
};

// @route   GET /api/program-builder/dashboard/:conferenceId
// @desc    Get program builder dashboard with all accepted papers and sessions
// @access  Private (Admin/Editor only)
router.get('/dashboard/:conferenceId', authMiddleware, requireEditor, getProgramBuilderDashboard);

// @route   POST /api/program-builder/sessions
// @desc    Create a new session and assign papers to it
// @access  Private (Admin/Editor only)
router.post('/sessions', authMiddleware, requireEditor, createSession);

// @route   PUT /api/program-builder/sessions/:sessionId
// @desc    Update session details and paper assignments
// @access  Private (Admin/Editor only)
router.put('/sessions/:sessionId', authMiddleware, requireEditor, updateSession);

// @route   DELETE /api/program-builder/sessions/:sessionId
// @desc    Delete session and return papers to unassigned pool
// @access  Private (Admin/Editor only)
router.delete('/sessions/:sessionId', authMiddleware, requireEditor, deleteSession);

// @route   POST /api/program-builder/suggestions
// @desc    Get smart grouping suggestions for papers
// @access  Private (Admin/Editor only)
router.post('/suggestions', authMiddleware, requireEditor, getGroupingSuggestions);

module.exports = router;
