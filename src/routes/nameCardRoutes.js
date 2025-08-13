const express = require('express');
const router = express.Router();
const { 
  generateAllNameCards, 
  generateSingleNameCard, 
  getNameCardPreview, 
  getAttendeesList 
} = require('../controllers/nameCardController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Name Card Routes
 * Admin routes for generating printable name cards for conference attendees
 * All routes require admin authentication
 */

// Apply authentication and admin restriction to all routes
router.use(authMiddleware);
router.use(requireRole('admin', 'super_admin'));

// Validation rules
const conferenceIdValidation = [
  param('conferenceId').isMongoId().withMessage('Invalid conference ID format')
];

const registrationIdValidation = [
  param('registrationId').isMongoId().withMessage('Invalid registration ID format')
];

const generateNameCardsValidation = [
  query('conferenceId').isMongoId().withMessage('Conference ID is required and must be valid'),
  query('format').optional().isIn(['pdf', 'png']).withMessage('Format must be pdf or png'),
  query('includeLogos').optional().isBoolean().withMessage('includeLogos must be true or false')
];

const attendeesListValidation = [
  param('conferenceId').isMongoId().withMessage('Invalid conference ID format'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search query too long')
];

// @route   GET /api/admin/name-cards/generate
// @desc    Generate name cards for all confirmed attendees
// @access  Admin
router.get('/generate', 
  generateNameCardsValidation,
  validationMiddleware,
  generateAllNameCards
);

// @route   GET /api/admin/name-cards/attendee/:registrationId
// @desc    Generate name card for specific attendee
// @access  Admin
router.get('/attendee/:registrationId',
  registrationIdValidation,
  query('format').optional().isIn(['pdf', 'png']).withMessage('Format must be pdf or png'),
  query('includeLogos').optional().isBoolean().withMessage('includeLogos must be true or false'),
  validationMiddleware,
  generateSingleNameCard
);

// @route   GET /api/admin/name-cards/preview/:registrationId
// @desc    Get name card preview data for specific attendee
// @access  Admin
router.get('/preview/:registrationId',
  registrationIdValidation,
  validationMiddleware,
  getNameCardPreview
);

// @route   GET /api/admin/name-cards/attendees/:conferenceId
// @desc    Get list of attendees for name card generation
// @access  Admin
router.get('/attendees/:conferenceId',
  attendeesListValidation,
  validationMiddleware,
  getAttendeesList
);

module.exports = router;
