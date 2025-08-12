const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getProceedingsDashboard,
  inviteToProceedings,
  respondToInvitation,
  submitProceedingsPaper,
  getMyProceedings,
  assignProceedingsEditor
} = require('../controllers/proceedingsController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/proceedings/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proceedings-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only PDF files for proceedings papers
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for proceedings submissions'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// User routes (with authentication)
// @route   GET /api/proceedings/me
// @desc    Get user's proceedings status and submissions
// @access  Private
router.get('/me', authMiddleware, getMyProceedings);

// @route   POST /api/proceedings/:id/respond
// @desc    Respond to proceedings invitation (accept/decline)
// @access  Private
router.post('/:id/respond', authMiddleware, respondToInvitation);

// @route   POST /api/proceedings/:id/submit
// @desc    Submit final paper for proceedings
// @access  Private
router.post('/:id/submit', authMiddleware, upload.single('proceedingsPaper'), submitProceedingsPaper);

// Admin routes (with admin authentication)
// @route   GET /api/proceedings/dashboard
// @desc    Get proceedings dashboard for admins
// @access  Private (Admin only)
router.get('/dashboard', authMiddleware, requireAdmin, getProceedingsDashboard);

// @route   POST /api/proceedings/:id/invite
// @desc    Invite presentation to submit to proceedings
// @access  Private (Admin only)
router.post('/:id/invite', authMiddleware, requireAdmin, inviteToProceedings);

// @route   POST /api/proceedings/:id/assign-editor
// @desc    Assign editor for proceedings review
// @access  Private (Admin only)
router.post('/:id/assign-editor', authMiddleware, requireAdmin, assignProceedingsEditor);

module.exports = router;
