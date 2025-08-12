const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const accountRecoveryController = require('../controllers/accountRecoveryController');
const { authMiddleware, requireEmailVerification } = require('../middleware/auth');
const { validationMiddleware: validate } = require('../middleware/validation');
const { body } = require('express-validator');

// Public routes (no authentication required)

// POST /api/auth/register - Register new user
router.post('/register', authController.register);

// POST /api/auth/login - Traditional email/password login
router.post('/login', authController.login);

// POST /api/auth/magic-link - Request magic link for passwordless login
router.post('/magic-link', authController.requestMagicLink);

// POST /api/auth/magic-login - Login using magic link token
router.post('/magic-login', authController.magicLogin);

// GET /api/auth/magic-login - Login using magic link token (for email links)
router.get('/magic-login', authController.magicLogin);

// POST /api/auth/refresh - Refresh access token using refresh token
router.post('/refresh', authController.refreshToken);

// POST /api/auth/verify-email - Verify email address with token
router.post('/verify-email', authController.verifyEmail);

// GET /api/auth/verify-email - Verify email address with token (for email links)
router.get('/verify-email', authController.verifyEmail);

// POST /api/auth/resend-verification - Resend email verification
router.post('/resend-verification', authController.resendEmailVerification);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', authController.resetPassword);

// GET /api/auth/reset-password - Reset password with token (for email links)
router.get('/reset-password', authController.resetPassword);

// GET /api/auth/validate - Validate current session/token
router.get('/validate', authController.validateSession);

// Account Recovery Routes (for existing community members)

// GET /api/auth/recovery-info - Get account recovery information and instructions
router.get('/recovery-info', accountRecoveryController.getRecoveryInfo);

// POST /api/auth/find-account - Search for existing user account
router.post('/find-account', [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('institution').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Institution must be 1-100 characters'),
  body('alternateEmail').optional().isEmail().normalizeEmail().withMessage('Please provide a valid alternate email'),
  validate
], accountRecoveryController.findAccount);

// POST /api/auth/check-email - Check if email exists in system (privacy-friendly)
router.post('/check-email', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  validate
], accountRecoveryController.checkEmailExists);

// POST /api/auth/recover-account - Request account recovery for specific user
router.post('/recover-account', [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('recoveryMethod').optional().isIn(['magic_link', 'password_reset']).withMessage('Recovery method must be "magic_link" or "password_reset"'),
  validate
], accountRecoveryController.recoverAccount);

// Protected routes (authentication required)

// GET /api/auth/me - Get current user profile
router.get('/me', authMiddleware, authController.getMe);

// PUT /api/auth/change-password - Change password (for authenticated users)
router.put('/change-password', authMiddleware, authController.changePassword);

// POST /api/auth/logout - Logout current user
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
