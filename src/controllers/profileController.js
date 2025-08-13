const userService = require('../services/userService');
const photoUploadService = require('../services/photoUploadService');
const { catchAsync } = require('../utils/catchAsync');
const { authMiddleware, requireEmailVerification } = require('../middleware/auth');
const mongoose = require('mongoose');

// @desc    Get current user's full profile
// @route   GET /api/profile/me
// @access  Private
const getMyProfile = catchAsync(async (req, res) => {
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
const updateMyProfile = catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  // Prevent updating sensitive fields
  const restrictedFields = [
    '_id', 'email', 'password', 'roles', 'isActive', 'isEmailVerified', 
    'loginAttempts', 'lockUntil', 'magicLinkToken', 'emailVerificationToken',
    'createdAt', 'updatedAt', '__v'
  ];
  
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

// @desc    Get current user's profile summary
// @route   GET /api/profile/me/summary
// @access  Private
const getMyProfileSummary = catchAsync(async (req, res) => {
  const user = req.user;
  
  const summary = {
    id: user._id,
    name: user.fullName,
    email: user.email,
    organization: user.affiliation.organization,
    userType: user.userType,
    isEmailVerified: user.isEmailVerified,
    profileCompleteness: calculateProfileCompleteness(user),
    lastLogin: user.lastLogin,
    memberSince: user.createdAt
  };

  res.status(200).json({
    success: true,
    data: summary
  });
});

// @desc    Get public user profile
// @route   GET /api/profile/:id
// @access  Public
const getPublicProfile = catchAsync(async (req, res) => {
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

  // Allow viewing memorial users even if not active
  if (!user.isActive && !user.isInMemoriam) {
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
const updatePrivacySettings = catchAsync(async (req, res) => {
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
const uploadProfilePhoto = catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  // Validate uploaded file
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No photo file provided. Please select an image file to upload.'
    });
  }

  // Validate image file
  const validationErrors = photoUploadService.validateImageFile(req.file);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid image file',
      errors: validationErrors
    });
  }

  try {
    // Get image metadata
    const metadata = await photoUploadService.getImageMetadata(req.file.buffer);
    
    // Check image dimensions (optional minimum size check)
    if (metadata.width < 100 || metadata.height < 100) {
      return res.status(400).json({
        success: false,
        message: 'Image is too small. Minimum size: 100x100 pixels'
      });
    }

    // Delete existing photo if user has one
    const currentUser = await userService.getUserById(userId);
    if (currentUser.profile?.photo) {
      try {
        // Parse existing photo data to extract storage info for deletion
        let existingPhotoData;
        if (typeof currentUser.profile.photo === 'string') {
          // Legacy URL-only format
          existingPhotoData = { url: currentUser.profile.photo };
        } else if (typeof currentUser.profile.photo === 'object') {
          existingPhotoData = currentUser.profile.photo;
        }
        
        if (existingPhotoData) {
          await photoUploadService.deletePhoto(existingPhotoData);
        }
      } catch (deleteError) {
        console.error('Error deleting previous photo:', deleteError);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new photo
    const uploadResult = await photoUploadService.uploadPhoto(
      req.file.buffer,
      req.file.originalname,
      userId.toString()
    );

    // Prepare photo data for database
    const photoData = {
      url: uploadResult.url,
      sizes: uploadResult.sizes || {},
      metadata: {
        originalFilename: uploadResult.originalFilename,
        uploadedAt: uploadResult.uploadedAt,
        storageType: uploadResult.storageType,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        format: metadata.format,
        fileSize: req.file.size
      }
    };

    // Add storage-specific data
    if (uploadResult.key) photoData.key = uploadResult.key; // S3
    if (uploadResult.publicId) photoData.publicId = uploadResult.publicId; // Cloudinary
    if (uploadResult.path) photoData.path = uploadResult.path; // Local
    if (uploadResult.filename) photoData.filename = uploadResult.filename; // Local
    if (uploadResult.bucket) photoData.bucket = uploadResult.bucket; // S3

    // Update user profile with new photo
    const updatedUser = await userService.updateUser(userId, {
      'profile.photo': photoData
    });

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        photo: {
          url: photoData.url,
          sizes: photoData.sizes,
          metadata: {
            dimensions: photoData.metadata.dimensions,
            format: photoData.metadata.format,
            uploadedAt: photoData.metadata.uploadedAt
          }
        }
      }
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Remove profile photo
// @route   DELETE /api/profile/me/photo
// @access  Private
const removeProfilePhoto = catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  try {
    // Get current user to access photo data
    const currentUser = await userService.getUserById(userId);
    
    if (!currentUser.profile?.photo) {
      return res.status(404).json({
        success: false,
        message: 'No profile photo found to remove'
      });
    }

    // Delete photo from storage
    try {
      let photoData;
      if (typeof currentUser.profile.photo === 'string') {
        // Legacy URL-only format
        photoData = { url: currentUser.profile.photo };
      } else if (typeof currentUser.profile.photo === 'object') {
        photoData = currentUser.profile.photo;
      }
      
      if (photoData) {
        await photoUploadService.deletePhoto(photoData);
      }
    } catch (deleteError) {
      console.error('Error deleting photo from storage:', deleteError);
      // Continue with database removal even if storage deletion fails
    }

    // Remove photo from user profile
    const updatedUser = await userService.updateUser(userId, {
      $unset: { 'profile.photo': 1 }
    });
    
    res.status(200).json({
      success: true,
      message: 'Profile photo removed successfully'
    });
  } catch (error) {
    console.error('Photo removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove photo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get nametag information
// @route   GET /api/profile/:id/nametag
// @access  Public
const getNametagInfo = catchAsync(async (req, res) => {
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
const searchProfiles = catchAsync(async (req, res) => {
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
      .select('name affiliation userType studentLevel contact roles privacySettings profile')
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
const getConferenceStats = catchAsync(async (req, res) => {
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
const getMySobieHistory = catchAsync(async (req, res) => {
  const user = req.user;
  const userId = req.user._id;
  
  // Get linked research presentations
  const ResearchPresentation = require('../models/ResearchPresentation');
  const presentations = await ResearchPresentation.find({
    'authors.userId': userId
  })
    .populate('conferenceId', 'name year location')
    .populate('sessionId', 'title track')
    .sort({ conferenceYear: -1 });

  // Format presentations with user's role
  const presentationsWithRole = presentations.map(presentation => {
    const userAuthor = presentation.authors.find(author => 
      author.userId && author.userId.toString() === userId.toString()
    );
    
    return {
      _id: presentation._id,
      title: presentation.title,
      discipline: presentation.discipline,
      presentationType: presentation.presentationType,
      year: presentation.conferenceYear,
      conference: presentation.conferenceId,
      session: presentation.sessionId,
      userRole: userAuthor ? {
        role: userAuthor.role,
        isPresenter: userAuthor.isPresenter,
        isStudentAuthor: userAuthor.isStudentAuthor,
        order: userAuthor.order
      } : null,
      status: presentation.status,
      awards: presentation.awards || []
    };
  });

  // Group presentations by year
  const presentationsByYear = presentationsWithRole.reduce((acc, presentation) => {
    const year = presentation.year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(presentation);
    return acc;
  }, {});

  // Get manual SOBIE history
  const manualHistory = {
    attendance: user.sobieHistory?.attendance || [],
    service: user.sobieHistory?.service || [],
    publications: user.sobieHistory?.publications || []
  };

  // Calculate comprehensive statistics
  const stats = {
    totalPresentations: presentationsWithRole.length,
    totalAttendance: manualHistory.attendance.length,
    totalService: manualHistory.service.length,
    totalManualPublications: manualHistory.publications.length,
    yearsActive: [
      ...new Set([
        ...presentationsWithRole.map(p => p.year),
        ...manualHistory.attendance.map(a => a.year),
        ...manualHistory.service.map(s => s.year),
        ...manualHistory.publications.map(p => p.year)
      ])
    ].sort((a, b) => b - a),
    primaryAuthorCount: presentationsWithRole.filter(p => 
      p.userRole?.role === 'primary_author'
    ).length,
    presenterCount: presentationsWithRole.filter(p => 
      p.userRole?.isPresenter
    ).length,
    studentResearchCount: presentationsWithRole.filter(p => 
      p.userRole?.isStudentAuthor
    ).length,
    disciplinesPresented: [...new Set(presentationsWithRole.map(p => p.discipline))],
    rolesHeld: [
      ...new Set([
        ...presentationsWithRole.map(p => p.userRole?.role).filter(Boolean),
        ...manualHistory.service.map(s => s.role),
        ...manualHistory.attendance.map(a => a.role)
      ])
    ],
    awardsReceived: presentationsWithRole.flatMap(p => p.awards)
  };

  res.status(200).json({
    success: true,
    data: {
      // Linked research presentations
      researchPresentations: {
        total: presentationsWithRole.length,
        byYear: presentationsByYear,
        list: presentationsWithRole
      },
      
      // Manual SOBIE history entries
      manualHistory,
      
      // Comprehensive statistics
      statistics: stats,
      
      // Summary for quick display
      summary: {
        totalContributions: stats.totalPresentations + stats.totalService + stats.totalAttendance,
        yearsActive: stats.yearsActive.length,
        firstYear: stats.yearsActive[stats.yearsActive.length - 1] || null,
        mostRecentYear: stats.yearsActive[0] || null,
        primaryRoles: stats.rolesHeld.slice(0, 3),
        mainDisciplines: stats.disciplinesPresented.slice(0, 3),
        hasAwards: stats.awardsReceived.length > 0
      }
    }
  });
});

// @desc    Update user's SOBIE history
// @route   PUT /api/profile/me/sobie-history
// @access  Private
const updateMySobieHistory = catchAsync(async (req, res) => {
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

// @desc    Add single item to SOBIE history
// @route   POST /api/profile/me/sobie-history/:type
// @access  Private
const addSobieHistoryItem = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { type } = req.params; // attendance, service, or publications
  const itemData = req.body;
  
  if (!['attendance', 'service', 'publications'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid SOBIE history type. Must be: attendance, service, or publications'
    });
  }
  
  const user = await userService.getUserById(userId);
  if (!user.sobieHistory) {
    user.sobieHistory = { attendance: [], service: [], publications: [] };
  }
  
  if (!user.sobieHistory[type]) {
    user.sobieHistory[type] = [];
  }
  
  user.sobieHistory[type].push(itemData);
  await user.save();
  
  res.status(201).json({
    success: true,
    message: `${type} item added successfully`,
    data: {
      item: itemData,
      [type]: user.sobieHistory[type]
    }
  });
});

// @desc    Run content moderation check on profile
// @route   POST /api/profile/me/content-check
// @access  Private
const runContentModerationCheck = catchAsync(async (req, res) => {
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

// @desc    Get photo upload configuration and status
// @route   GET /api/profile/me/photo/config
// @access  Private
const getPhotoUploadConfig = catchAsync(async (req, res) => {
  const config = photoUploadService.checkStorageConfig();
  
  res.status(200).json({
    success: true,
    data: {
      maxFileSize: config.maxFileSize,
      maxFileSizeMB: Math.round(config.maxFileSize / 1024 / 1024),
      supportedFormats: config.supportedFormats,
      storageType: config.storageType,
      configured: config.configured,
      errors: config.errors.length > 0 ? config.errors : undefined,
      imageSizes: photoUploadService.IMAGE_SIZES,
      currentPhoto: req.user.profile?.photo || null
    }
  });
});

// @desc    Get profile completeness status
// @route   GET /api/profile/me/completeness
// @access  Private
const getProfileCompleteness = catchAsync(async (req, res) => {
  const user = req.user;
  const completeness = calculateProfileCompleteness(user);
  
  res.status(200).json({
    success: true,
    data: completeness
  });
});

// Helper function to calculate profile completeness
const calculateProfileCompleteness = (user) => {
  const fields = {
    basicInfo: {
      weight: 30,
      fields: ['name.firstName', 'name.lastName', 'affiliation.organization'],
      completed: 0
    },
    contact: {
      weight: 20,
      fields: ['email'],
      completed: 0
    },
    professional: {
      weight: 25,
      fields: ['userType', 'affiliation.jobTitle', 'affiliation.department'],
      completed: 0
    },
    profile: {
      weight: 15,
      fields: ['profile.bio', 'profile.interests'],
      completed: 0
    },
    verification: {
      weight: 10,
      fields: ['isEmailVerified'],
      completed: 0
    }
  };

  let totalScore = 0;
  const recommendations = [];

  // Check basic info
  const basicFields = ['name.firstName', 'name.lastName', 'affiliation.organization'];
  fields.basicInfo.completed = basicFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], user);
    return value && value.toString().trim() !== '';
  }).length;
  
  if (fields.basicInfo.completed < basicFields.length) {
    recommendations.push('Complete your basic information (name and organization)');
  }

  // Check contact
  fields.contact.completed = user.email ? 1 : 0;

  // Check professional info
  const professionalFields = ['userType', 'affiliation.jobTitle', 'affiliation.department'];
  fields.professional.completed = professionalFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], user);
    return value && value.toString().trim() !== '';
  }).length;
  
  if (!user.affiliation?.jobTitle) {
    recommendations.push('Add your job title');
  }
  if (!user.affiliation?.department) {
    recommendations.push('Add your department');
  }

  // Check profile details
  const profileFields = ['profile.bio', 'profile.interests'];
  let profileCompleted = 0;
  if (user.profile?.bio && user.profile.bio.trim() !== '') profileCompleted++;
  if (user.profile?.interests && user.profile.interests.length > 0) profileCompleted++;
  fields.profile.completed = profileCompleted;
  
  if (!user.profile?.bio) {
    recommendations.push('Add a professional bio');
  }
  if (!user.profile?.interests || user.profile.interests.length === 0) {
    recommendations.push('Add your areas of interest');
  }

  // Check verification
  fields.verification.completed = user.isEmailVerified ? 1 : 0;
  if (!user.isEmailVerified) {
    recommendations.push('Verify your email address');
  }

  // Calculate weighted score
  Object.values(fields).forEach(category => {
    const categoryScore = (category.completed / category.fields.length) * category.weight;
    totalScore += categoryScore;
  });

  return {
    overall: Math.round(totalScore),
    categories: fields,
    recommendations,
    isComplete: totalScore >= 80
  };
};

module.exports = {
  getMyProfile,
  getMyProfileSummary,
  updateMyProfile,
  getPublicProfile,
  updatePrivacySettings,
  uploadProfilePhoto,
  removeProfilePhoto,
  getPhotoUploadConfig,
  getNametagInfo,
  searchProfiles,
  getConferenceStats,
  getMySobieHistory,
  updateMySobieHistory,
  addSobieHistoryItem,
  runContentModerationCheck,
  getProfileCompleteness
};
