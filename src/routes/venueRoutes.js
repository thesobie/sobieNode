const express = require('express');
const router = express.Router();
const {
  getSanDestinInfo,
  updateAccommodationPreference,
  getVenueStatistics,
  sendResortInfoEmail
} = require('../controllers/venueController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Venue Routes
 * Handles San Destin resort booking integration and accommodation management
 */

// Validation rules
const conferenceIdValidation = [
  param('conferenceId').isMongoId().withMessage('Invalid conference ID format')
];

const accommodationUpdateValidation = [
  body('registrationId').isMongoId().withMessage('Valid registration ID is required'),
  body('accommodationType').isIn(['on-resort', 'off-resort', 'undecided']).withMessage('Invalid accommodation type'),
  body('specialRequests').optional().isLength({ max: 500 }).withMessage('Special requests too long'),
  body('discountCodeUsed').optional().isBoolean().withMessage('Discount code usage must be true or false')
];

const resortInfoEmailValidation = [
  body('registrationId').isMongoId().withMessage('Valid registration ID is required')
];

// @route   GET /api/venue/san-destin/:conferenceId
// @desc    Get San Destin resort information and available discount codes
// @access  Authenticated
router.get('/san-destin/:conferenceId',
  authMiddleware,
  conferenceIdValidation,
  validationMiddleware,
  getSanDestinInfo
);

// @route   PUT /api/venue/accommodation-preference
// @desc    Update user's accommodation preferences
// @access  Authenticated
router.put('/accommodation-preference',
  authMiddleware,
  accommodationUpdateValidation,
  validationMiddleware,
  updateAccommodationPreference
);

// @route   POST /api/venue/send-resort-info
// @desc    Send resort information email to registrant
// @access  Authenticated
router.post('/send-resort-info',
  authMiddleware,
  resortInfoEmailValidation,
  validationMiddleware,
  sendResortInfoEmail
);

// Admin routes
// @route   GET /api/venue/admin/statistics/:conferenceId
// @desc    Get venue booking statistics for conference
// @access  Admin
router.get('/admin/statistics/:conferenceId',
  authMiddleware,
  requireRole('admin', 'super_admin'),
  conferenceIdValidation,
  validationMiddleware,
  getVenueStatistics
);

module.exports = router;
