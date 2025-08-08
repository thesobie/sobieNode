const userService = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');

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
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Return only public information suitable for conference directory
  const publicProfile = {
    _id: user._id,
    fullName: user.fullName,
    displayNameForNametag: user.displayNameForNametag,
    pronouns: user.name.pronouns,
    userType: user.userType,
    studentLevel: user.studentLevel,
    affiliation: user.affiliation,
    contact: {
      website: user.contact.website,
      linkedIn: user.contact.linkedIn,
      orcid: user.contact.orcid
    }
  };

  res.status(200).json({
    success: true,
    data: publicProfile
  });
});

// @desc    Update user profile
// @route   PUT /api/profile/:id
// @access  Private (user can only update their own profile)
const updateProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  // TODO: Add authentication middleware to verify user can update this profile
  
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
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const nametagInfo = {
    displayName: user.displayNameForNametag,
    pronouns: user.name.pronouns,
    organization: user.affiliation.organization,
    title: user.affiliation.jobTitle,
    userType: user.userType,
    studentLevel: user.studentLevel
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
  const { organization, department, userType, studentLevel, q } = req.query;
  
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
  
  if (q) {
    // Search in name fields and organization
    filter.$or = [
      { 'name.firstName': new RegExp(q, 'i') },
      { 'name.lastName': new RegExp(q, 'i') },
      { 'affiliation.organization': new RegExp(q, 'i') },
      { 'affiliation.jobTitle': new RegExp(q, 'i') }
    ];
  }
  
  const User = require('../models/User');
  const users = await User.find(filter)
    .select('name affiliation userType studentLevel contact')
    .limit(50)
    .sort({ 'name.lastName': 1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get conference statistics
// @route   GET /api/profiles/stats
// @access  Public
const getConferenceStats = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  
  const stats = await User.aggregate([
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
    },
    {
      $project: {
        _id: 0,
        totalUsers: 1,
        totalOrganizations: { $size: '$organizations' },
        organizations: 1,
        userTypeBreakdown: {
          $reduce: {
            input: '$byUserType',
            initialValue: {
              student: { undergraduate: 0, graduate: 0, doctorate: 0, total: 0 },
              academic: 0,
              other: 0
            },
            in: {
              $cond: [
                { $eq: ['$$this.userType', 'student'] },
                {
                  student: {
                    undergraduate: {
                      $cond: [
                        { $eq: ['$$this.studentLevel', 'undergraduate'] },
                        { $add: ['$$value.student.undergraduate', 1] },
                        '$$value.student.undergraduate'
                      ]
                    },
                    graduate: {
                      $cond: [
                        { $eq: ['$$this.studentLevel', 'graduate'] },
                        { $add: ['$$value.student.graduate', 1] },
                        '$$value.student.graduate'
                      ]
                    },
                    doctorate: {
                      $cond: [
                        { $eq: ['$$this.studentLevel', 'doctorate'] },
                        { $add: ['$$value.student.doctorate', 1] },
                        '$$value.student.doctorate'
                      ]
                    },
                    total: { $add: ['$$value.student.total', 1] }
                  },
                  academic: '$$value.academic',
                  other: '$$value.other'
                },
                {
                  $cond: [
                    { $eq: ['$$this.userType', 'academic'] },
                    {
                      student: '$$value.student',
                      academic: { $add: ['$$value.academic', 1] },
                      other: '$$value.other'
                    },
                    {
                      student: '$$value.student',
                      academic: '$$value.academic',
                      other: { $add: ['$$value.other', 1] }
                    }
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: stats[0] || {
      totalUsers: 0,
      totalOrganizations: 0,
      organizations: [],
      userTypeBreakdown: {
        student: { undergraduate: 0, graduate: 0, doctorate: 0, total: 0 },
        academic: 0,
        other: 0
      }
    }
  });
});

module.exports = {
  getPublicProfile,
  updateProfile,
  getNametagInfo,
  searchProfiles,
  getConferenceStats
};
