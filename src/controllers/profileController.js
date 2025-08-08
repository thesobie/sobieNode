const userService = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');
const { authMiddleware, requireEmailVerification } = require('../middleware/auth');
const mongoose = require('mongoose');

// @desc    Get current user's full profile
// @route   GET /api/profile/me
// @access  Private
const getMyProfile = asyncHandler(async (req, res) => {
  // Return full profile data for the authenticated user
  res.status(200).json({
    success: true,
    data: {
      user: req.user.toJSON()
    }
  });
});

// @desc    Update current user's profile
// @route   PUT /api/profile/me
// @access  Private
const updateMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Prevent updating sensitive fields
  const restrictedFields = ['_id', 'email', 'password', 'roles', 'isActive', 'isEmailVerified', 'loginAttempts', 'lockUntil', 'magicLinkToken', 'emailVerificationToken'];
  
  const updateData = { ...req.body };
  restrictedFields.forEach(field => delete updateData[field]);
  
  // Update user profile
  const updatedUser = await userService.updateUser(userId, updateData);
  
  if (!updatedUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser
    }
  });
});

// @desc    Get public user profile
// @route   GET /api/profile/:id
// @access  Public
const getPublicProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.getUserById(id);
  
  if (!user || !user.isActive) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Use the user's privacy-aware public profile method
  const publicProfile = user.getPublicProfile();

  res.status(200).json({
    success: true,
    data: publicProfile
  });
});

// @desc    Update user privacy settings
// @route   PUT /api/profile/me/privacy
// @access  Private
const updatePrivacySettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { privacySettings } = req.body;
  
  if (!privacySettings) {
    return res.status(400).json({
      success: false,
      message: 'Privacy settings are required'
    });
  }
  
  const updatedUser = await userService.updateUser(userId, { privacySettings });
  
  res.status(200).json({
    success: true,
    message: 'Privacy settings updated successfully',
    data: {
      privacySettings: updatedUser.privacySettings
    }
  });
});

// @desc    Upload profile photo
// @route   POST /api/profile/me/photo
// @access  Private
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  // TODO: Implement file upload with multer and cloud storage
  // For now, accept photo URL in request body
  const { photoUrl } = req.body;
  
  if (!photoUrl) {
    return res.status(400).json({
      success: false,
      message: 'Photo URL is required'
    });
  }
  
  const userId = req.user._id;
  const updatedUser = await userService.updateUser(userId, {
    'profile.photo': photoUrl
  });
  
  res.status(200).json({
    success: true,
    message: 'Profile photo updated successfully',
    data: {
      photoUrl: updatedUser.profile.photo
    }
  });
});

// @desc    Get nametag information
// @route   GET /api/profile/:id/nametag
// @access  Public
const getNametagInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.getUserById(id);
  
  if (!user || !user.isActive) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const nametagInfo = {
    displayName: user.displayNameForNametag,
    pronouns: user.name.pronouns === 'other' && user.name.pronounsCustom ? 
      user.name.pronounsCustom : user.name.pronouns,
    organization: user.affiliation.organization,
    title: user.affiliation.jobTitle,
    userType: user.userType,
    studentLevel: user.studentLevel,
    roles: user.getRoleDisplayNames()
  };

  res.status(200).json({
    success: true,
    data: nametagInfo
  });
});

// @desc    Search user profiles
// @route   GET /api/profiles/search
// @access  Public
const searchProfiles = asyncHandler(async (req, res) => {
  const { organization, department, userType, studentLevel, role, q, limit = 50, page = 1 } = req.query;
  
  let filter = { isActive: true };
  
  if (organization) {
    filter['affiliation.organization'] = new RegExp(organization, 'i');
  }
  
  if (department) {
    filter['affiliation.department'] = new RegExp(department, 'i');
  }
  
  if (userType) {
    filter.userType = userType;
  }
  
  if (studentLevel) {
    filter.studentLevel = studentLevel;
  }
  
  if (role) {
    filter.roles = { $in: [role] };
  }
  
  if (q) {
    // Search in name fields, organization, and job title
    filter.$or = [
      { 'name.firstName': new RegExp(q, 'i') },
      { 'name.lastName': new RegExp(q, 'i') },
      { 'name.preferredName': new RegExp(q, 'i') },
      { 'affiliation.organization': new RegExp(q, 'i') },
      { 'affiliation.jobTitle': new RegExp(q, 'i') },
      { 'affiliation.department': new RegExp(q, 'i') }
    ];
  }
  
  const User = require('../models/User');
  const limitNum = Math.min(parseInt(limit), 100); // Cap at 100 results
  const skipNum = (parseInt(page) - 1) * limitNum;
  
  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .select('name affiliation userType studentLevel contact roles privacySettings')
      .limit(limitNum)
      .skip(skipNum)
      .sort({ 'name.lastName': 1, 'name.firstName': 1 }),
    User.countDocuments(filter)
  ]);

  // Filter results based on privacy settings
  const publicProfiles = users.map(user => user.getPublicProfile());

  res.status(200).json({
    success: true,
    count: publicProfiles.length,
    totalCount,
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalCount / limitNum),
    data: publicProfiles
  });
});

// @desc    Get conference statistics
// @route   GET /api/profiles/stats
// @access  Public
const getConferenceStats = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  
  const [userStats, roleStats, recentActivity] = await Promise.all([
    // User type and organization statistics
    User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          byUserType: {
            $push: {
              userType: '$userType',
              studentLevel: '$studentLevel'
            }
          },
          organizations: { $addToSet: '$affiliation.organization' }
        }
      }
    ]),
    
    // Role statistics
    User.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$roles' },
      {
        $group: {
          _id: '$roles',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]),
    
    // Recent registrations (last 30 days)
    User.aggregate([
      {
        $match: {
          isActive: true,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ])
  ]);

  // Process user type breakdown
  let userTypeBreakdown = {
    student: { undergraduate: 0, graduate: 0, doctorate: 0, total: 0 },
    academic: 0,
    other: 0
  };

  if (userStats[0]?.byUserType) {
    userStats[0].byUserType.forEach(user => {
      if (user.userType === 'student') {
        userTypeBreakdown.student.total++;
        if (user.studentLevel) {
          userTypeBreakdown.student[user.studentLevel]++;
        }
      } else {
        userTypeBreakdown[user.userType]++;
      }
    });
  }

  // Process role breakdown
  const roleBreakdown = {};
  roleStats.forEach(role => {
    roleBreakdown[role._id] = role.count;
  });

  res.status(200).json({
    success: true,
    data: {
      totalUsers: userStats[0]?.totalUsers || 0,
      totalOrganizations: userStats[0]?.organizations?.length || 0,
      topOrganizations: userStats[0]?.organizations?.slice(0, 10) || [],
      userTypeBreakdown,
      roleBreakdown,
      recentRegistrations: recentActivity,
      emailVerificationRate: await User.countDocuments({ isActive: true, isEmailVerified: true }) / 
        Math.max(await User.countDocuments({ isActive: true }), 1)
    }
  });
});

// @desc    Get user's SOBIE history
// @route   GET /api/profile/me/sobie-history
// @access  Private
const getMySobieHistory = asyncHandler(async (req, res) => {
  const user = req.user;
  
  res.status(200).json({
    success: true,
    data: {
      attendance: user.sobieHistory.attendance || [],
      service: user.sobieHistory.service || [],
      publications: user.sobieHistory.publications || []
    }
  });
});

// @desc    Update user's SOBIE history
// @route   PUT /api/profile/me/sobie-history
// @access  Private
const updateMySobieHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { sobieHistory } = req.body;
  
  if (!sobieHistory) {
    return res.status(400).json({
      success: false,
      message: 'SOBIE history data is required'
    });
  }
  
  const updatedUser = await userService.updateUser(userId, { sobieHistory });
  
  res.status(200).json({
    success: true,
    message: 'SOBIE history updated successfully',
    data: {
      sobieHistory: updatedUser.sobieHistory
    }
  });
});

// @desc    Run content moderation check on profile
// @route   POST /api/profile/me/content-check
// @access  Private
const runContentModerationCheck = asyncHandler(async (req, res) => {
  const user = req.user;
  
  const moderationResult = user.runContentModerationCheck();
  
  res.status(200).json({
    success: true,
    data: {
      isClean: moderationResult.isClean,
      hasViolations: moderationResult.hasViolations,
      hasWarnings: moderationResult.hasWarnings,
      violations: moderationResult.violations,
      warnings: moderationResult.warnings,
      userMessages: moderationResult.userMessages
    }
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  getPublicProfile,
  updatePrivacySettings,
  uploadProfilePhoto,
  getNametagInfo,
  searchProfiles,
  getConferenceStats,
  getMySobieHistory,
  updateMySobieHistory,
  runContentModerationCheck
};
