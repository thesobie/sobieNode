const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const conferenceController = require('../controllers/conferenceController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

/**
 * Conference Registration Routes
 * Handles all conference registration related endpoints
 */

// Validation middleware
const registrationValidation = [
  body('registrationInfo.personalInfo.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be 1-50 characters'),
  
  body('registrationInfo.personalInfo.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be 1-50 characters'),
  
  body('registrationInfo.personalInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('registrationInfo.affiliation.organization')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Organization is required and must be 1-200 characters'),
  
  body('registrationInfo.professional.discipline')
    .optional()
    .isIn([
      'accounting', 'analytics', 'economics', 'finance', 'information_systems',
      'international_business', 'management', 'marketing', 'operations',
      'entrepreneurship', 'strategy', 'other'
    ])
    .withMessage('Invalid discipline'),
  
  body('registrationInfo.professional.academicLevel')
    .optional()
    .isIn(['undergraduate', 'masters', 'doctoral', 'faculty', 'professional', 'other'])
    .withMessage('Invalid academic level'),
  
  body('preferences.attendanceType')
    .optional()
    .isIn(['in_person', 'virtual', 'hybrid'])
    .withMessage('Invalid attendance type'),
  
  body('preferences.sessionInterests')
    .optional()
    .isArray()
    .withMessage('Session interests must be an array'),
  
  body('preferences.sessionInterests.*')
    .optional()
    .isIn([
      'keynote', 'research_presentations', 'panels', 'workshops', 
      'networking', 'poster_sessions', 'roundtables', 'special_sessions'
    ])
    .withMessage('Invalid session interest'),
  
  body('additionalInfo.howDidYouHear')
    .optional()
    .isIn([
      'colleague', 'website', 'social_media', 'email', 'conference', 
      'academic_network', 'previous_attendee', 'other'
    ])
    .withMessage('Invalid "how did you hear" option')
];

const confirmationValidation = [
  body()
    .custom((body) => {
      if (!body.confirmationCode && !body.confirmationToken) {
        throw new Error('Either confirmation code or confirmation token is required');
      }
      return true;
    }),
  
  body('confirmationCode')
    .optional()
    .isLength({ min: 8, max: 8 })
    .isAlphanumeric()
    .withMessage('Confirmation code must be 8 alphanumeric characters'),
  
  body('confirmationToken')
    .optional()
    .isLength({ min: 64, max: 128 })
    .isAlphanumeric()
    .withMessage('Invalid confirmation token format')
];

// Public endpoints (no authentication required)

/**
 * @route   GET /api/conference/current
 * @desc    Get current conference information
 * @access  Public
 */
router.get('/current', conferenceController.getCurrentConference);

// User endpoints (authentication required)

/**
 * @route   GET /api/conference/my-registration
 * @desc    Get current user's registration status
 * @access  Private (User)
 */
router.get('/my-registration', authMiddleware, conferenceController.getMyRegistration);

/**
 * @route   GET /api/conference/registration-form
 * @desc    Get registration form with pre-filled user data
 * @access  Private (User)
 */
router.get('/registration-form', authMiddleware, conferenceController.getRegistrationForm);

/**
 * @route   POST /api/conference/register
 * @desc    Submit conference registration
 * @access  Private (User)
 * @body    Registration data including personal info, affiliation, preferences
 */
router.post('/register', authMiddleware, registrationValidation, conferenceController.submitRegistration);

/**
 * @route   PUT /api/conference/registration
 * @desc    Update conference registration (before confirmation only)
 * @access  Private (User)
 * @body    Updated registration data
 */
router.put('/registration', authMiddleware, registrationValidation, conferenceController.updateRegistration);

/**
 * @route   POST /api/conference/confirm
 * @desc    Confirm registration with code or token
 * @access  Public (can be used from email link)
 * @body    { confirmationCode: "ABC12345" } or { confirmationToken: "long-token" }
 */
router.post('/confirm', confirmationValidation, conferenceController.confirmRegistration);

/**
 * @route   POST /api/conference/resend-confirmation
 * @desc    Resend confirmation email
 * @access  Private (User)
 */
router.post('/resend-confirmation', authMiddleware, conferenceController.resendConfirmation);

/**
 * @route   POST /api/conference/cancel
 * @desc    Cancel conference registration
 * @access  Private (User)
 * @body    { reason: "Optional cancellation reason" }
 */
router.post('/cancel', authMiddleware, [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must be 500 characters or less')
], conferenceController.cancelRegistration);

// Admin endpoints (admin authentication required)

/**
 * @route   GET /api/conference/admin/stats
 * @desc    Get registration statistics
 * @access  Private (Admin)
 * @query   year - Conference year (defaults to current year)
 */
router.get('/admin/stats', requireAdmin, conferenceController.getRegistrationStats);

/**
 * @route   GET /api/conference/admin/registrations
 * @desc    Get all registrations with filtering
 * @access  Private (Admin)
 * @query   year, status, discipline, attendanceType, confirmed, paymentStatus, page, limit
 */
router.get('/admin/registrations', requireAdmin, conferenceController.getAllRegistrations);

/**
 * @route   GET /api/conference/admin/payment-stats
 * @desc    Get payment statistics
 * @access  Private (Admin)
 * @query   year - Conference year (defaults to current year)
 */
router.get('/admin/payment-stats', requireAdmin, conferenceController.getPaymentStatistics);

/**
 * @route   PUT /api/conference/admin/payment/:registrationId
 * @desc    Update payment information for a registration
 * @access  Private (Admin)
 * @param   registrationId - Registration ID
 * @body    Payment update data
 */
router.put('/admin/payment/:registrationId', requireAdmin, [
  body('action')
    .isIn(['set_payment_required', 'waive_payment', 'record_payment', 'apply_discount', 'process_refund', 'update_notes'])
    .withMessage('Invalid payment action'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'check', 'credit_card', 'purchase_order', 'wire_transfer', 'waived', 'scholarship', 'other'])
    .withMessage('Invalid payment method'),
  
  body('transactionDetails.checkNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Check number must be 50 characters or less'),
  
  body('transactionDetails.purchaseOrderNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Purchase order number must be 50 characters or less'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be 1000 characters or less')
], conferenceController.updatePayment);

// Payment endpoints (user can view their own, admin can view all)

/**
 * @route   GET /api/conference/payment/:registrationId
 * @desc    Get payment details for a registration
 * @access  Private (User - own registration, Admin - any registration)
 * @param   registrationId - Registration ID
 */
router.get('/payment/:registrationId', authMiddleware, conferenceController.getPaymentDetails);

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('Conference router error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'You are already registered for this conference',
      error: 'Duplicate registration'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Conference registration error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;
