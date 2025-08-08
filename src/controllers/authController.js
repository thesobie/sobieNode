const authService = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');

// @desc    Login user
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
  
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // Implementation depends on your auth strategy (JWT, sessions, etc.)
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  // This would typically require authentication middleware
  // For now, returning a placeholder response
  res.status(200).json({
    success: true,
    message: 'Profile endpoint - requires authentication',
    data: {
      id: 'user-id',
      email: 'user@example.com',
      name: 'User Name'
    }
  });
});

module.exports = {
  login,
  register,
  logout,
  getProfile
};
