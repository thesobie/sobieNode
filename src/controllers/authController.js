const authService = require('../services/authService');
const jwtService = require('../services/jwtService');
const { asyncHandler } = require('../utils/asyncHandler');

// @desc    Login user with email/password
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  const result = await authService.login(email, password);
  
  // Set secure cookies
  jwtService.setAuthCookies(res, result.tokens);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      user: result.user,
      tokens: result.tokens
    }
  });
});

// @desc    Request magic link for passwordless login
// @route   POST /api/auth/magic-link
// @access  Public
const requestMagicLink = asyncHandler(async (req, res) => {
  const { email, method = 'email' } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email address'
    });
  }

  const result = await authService.requestMagicLink(email, method);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      method: result.method,
      expiresIn: result.expiresIn
    }
  });
});

// @desc    Login with magic link token
// @route   POST /api/auth/magic-login
// @access  Public
const magicLogin = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Magic link token is required'
    });
  }

  const result = await authService.loginWithMagicLink(token);
  
  // Set secure cookies
  jwtService.setAuthCookies(res, result.tokens);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      user: result.user,
      tokens: result.tokens
    }
  });
});

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  
  // Set secure cookies for immediate login
  jwtService.setAuthCookies(res, result.tokens);
  
  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      user: result.user,
      tokens: result.tokens,
      emailVerificationSent: result.emailVerificationSent
    }
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  let refreshToken = req.body.refreshToken;
  
  // Try to get refresh token from cookies if not in body
  if (!refreshToken) {
    refreshToken = req.cookies.refreshToken;
  }

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  const result = await authService.refreshToken(refreshToken);
  
  // Update access token cookie
  res.cookie('accessToken', result.accessToken, {
    ...jwtService.getSecureCookieOptions(result.accessTokenExpiry - Date.now())
  });
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      accessToken: result.accessToken,
      accessTokenExpiry: result.accessTokenExpiry
    }
  });
});

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification token is required'
    });
  }

  const result = await authService.verifyEmail(token);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      user: result.user
    }
  });
});

// @desc    Resend email verification
// @route   POST /api/auth/resend-verification
// @access  Public
const resendEmailVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required'
    });
  }

  const result = await authService.resendEmailVerification(email);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required'
    });
  }

  const result = await authService.requestPasswordReset(email);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      expiresIn: result.expiresIn
    }
  });
});

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: 'Reset token and new password are required'
    });
  }

  const result = await authService.resetPassword(token, password);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

// @desc    Change password (authenticated user)
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  const result = await authService.changePassword(req.user._id, currentPassword, newPassword);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // Clear authentication cookies
  jwtService.clearAuthCookies(res);
  
  const result = await authService.logout();
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user.toJSON()
    }
  });
});

// @desc    Validate current session
// @route   GET /api/auth/validate
// @access  Public
const validateSession = asyncHandler(async (req, res) => {
  let token = jwtService.extractTokenFromHeader(req.header('Authorization'));
  
  if (!token) {
    token = jwtService.extractTokenFromCookie(req.cookies);
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
      valid: false
    });
  }

  const result = await authService.validateSession(token);
  
  if (!result.valid) {
    return res.status(401).json({
      success: false,
      message: result.reason,
      valid: false
    });
  }

  res.status(200).json({
    success: true,
    valid: true,
    data: {
      user: result.user,
      tokenInfo: {
        expiresAt: result.decoded.exp * 1000,
        issuedAt: result.decoded.iat * 1000,
        timeUntilExpiry: jwtService.getTimeUntilExpiry(token)
      }
    }
  });
});

module.exports = {
  login,
  requestMagicLink,
  magicLogin,
  register,
  refreshToken,
  verifyEmail,
  resendEmailVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  getMe,
  validateSession
};
