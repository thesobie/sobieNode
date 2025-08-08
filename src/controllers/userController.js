const userService = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Public
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.getUserById(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Public
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  
  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Public
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.updateUser(id, req.body);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get user public profile
// @route   GET /api/users/:id/public
// @access  Public
const getUserPublicProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.getUserById(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const publicProfile = user.getPublicProfile();
  res.status(200).json({
    success: true,
    data: publicProfile
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.deleteUser(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  getUserPublicProfile,
  createUser,
  updateUser,
  deleteUser
};
