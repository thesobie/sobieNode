const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, requireEmailVerification } = require('../middleware/auth');

// Public routes (no authentication required)

// POST /api/auth/register - Register new user
router.post('/register', authController.register);

// POST /api/auth/login - Traditional email/password login
router.post('/login', authController.login);

// POST /api/auth/magic-link - Request magic link for passwordless login
router.post('/magic-link', authController.requestMagicLink);

// POST /api/auth/magic-login - Login using magic link token
router.post('/magic-login', authController.magicLogin);

// POST /api/auth/refresh - Refresh access token using refresh token
router.post('/refresh', authController.refreshToken);

// POST /api/auth/verify-email - Verify email address with token
router.post('/verify-email', authController.verifyEmail);

// POST /api/auth/resend-verification - Resend email verification
router.post('/resend-verification', authController.resendEmailVerification);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', authController.resetPassword);

// GET /api/auth/validate - Validate current session/token
router.get('/validate', authController.validateSession);

// Protected routes (authentication required)

// GET /api/auth/me - Get current user profile
router.get('/me', authMiddleware, authController.getMe);

// PUT /api/auth/change-password - Change password (for authenticated users)
router.put('/change-password', authMiddleware, authController.changePassword);

// POST /api/auth/logout - Logout current user
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
