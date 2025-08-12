const userService = require('../services/userService');
const notificationService = require('../services/notificationService');
const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// @desc    Get all users with filtering and pagination (Admin only)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    search, 
    userType, 
    studentLevel, 
    organization, 
    isActive, 
    isEmailVerified,
    roles,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  let filter = {};

  // Text search across multiple fields
  if (search) {
    filter.$or = [
      { 'name.firstName': new RegExp(search, 'i') },
      { 'name.lastName': new RegExp(search, 'i') },
      { 'name.preferredName': new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { 'affiliation.organization': new RegExp(search, 'i') },
      { 'affiliation.department': new RegExp(search, 'i') },
      { 'affiliation.jobTitle': new RegExp(search, 'i') }
    ];
  }

  // Filter by user type
  if (userType) {
    filter.userType = userType;
  }

  // Filter by student level
  if (studentLevel) {
    filter.studentLevel = studentLevel;
  }

  // Filter by organization
  if (organization) {
    filter['affiliation.organization'] = new RegExp(organization, 'i');
  }

  // Filter by active status
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  // Filter by email verification status
  if (isEmailVerified !== undefined) {
    filter.isEmailVerified = isEmailVerified === 'true';
  }

  // Filter by roles
  if (roles) {
    const roleArray = roles.split(',');
    filter.roles = { $in: roleArray };
  }

  const User = require('../models/User');
  const limitNum = Math.min(parseInt(limit), 100); // Cap at 100 results
  const skipNum = (parseInt(page) - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .select('-password -magicLinkToken -emailVerificationToken')
      .limit(limitNum)
      .skip(skipNum)
      .sort(sort)
      .populate('roles'),
    User.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    totalCount,
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalCount / limitNum),
    data: users
  });
});

// @desc    Get detailed user by ID (Admin only)
// @route   GET /api/admin/users/:id
// @access  Admin
const getUserById = asyncHandler(async (req, res) => {
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

  // Return full user data (admin view)
  res.status(200).json({
    success: true,
    data: {
      user: user.toJSON()
    }
  });
});

// @desc    Create new user manually (Admin only)
// @route   POST /api/admin/users
// @access  Admin
const createUser = asyncHandler(async (req, res) => {
  const userData = req.body;

  // Admin can bypass email verification
  if (userData.skipEmailVerification) {
    userData.isEmailVerified = true;
  }

  const newUser = await userService.createUser(userData);

  // Send welcome email if not skipping verification
  if (!userData.skipEmailVerification) {
    try {
      await notificationService.sendEmailVerification(newUser);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the user creation if email fails
    }
  }

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: newUser
    }
  });
});

// @desc    Update user (Admin only)
// @route   PUT /api/admin/users/:id
// @access  Admin
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  const updatedUser = await userService.updateUser(id, updateData);

  if (!updatedUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: updatedUser
    }
  });
});

// @desc    Delete/deactivate user (Admin only)
// @route   DELETE /api/admin/users/:id
// @access  Admin
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent = false } = req.query;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  const User = require('../models/User');

  if (permanent === 'true') {
    // Permanent deletion
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User permanently deleted'
    });
  } else {
    // Soft delete (deactivate)
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        user: user.toJSON()
      }
    });
  }
});

// @desc    Assign/remove roles from user (Admin only)
// @route   PUT /api/admin/users/:id/roles
// @access  Admin
const updateUserRoles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { roles, action = 'set' } = req.body; // action: 'set', 'add', 'remove'

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  if (!Array.isArray(roles)) {
    return res.status(400).json({
      success: false,
      message: 'Roles must be an array'
    });
  }

  const User = require('../models/User');
  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Validate roles
  const validRoles = ['organizer', 'reviewer', 'presenter', 'attendee', 'sponsor', 'volunteer'];
  const invalidRoles = roles.filter(role => !validRoles.includes(role));
  
  if (invalidRoles.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`
    });
  }

  // Update roles based on action
  switch (action) {
    case 'set':
      user.roles = roles;
      break;
    case 'add':
      roles.forEach(role => {
        if (!user.roles.includes(role)) {
          user.roles.push(role);
        }
      });
      break;
    case 'remove':
      user.roles = user.roles.filter(role => !roles.includes(role));
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "set", "add", or "remove"'
      });
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: `User roles ${action === 'set' ? 'updated' : action === 'add' ? 'added' : 'removed'} successfully`,
    data: {
      userId: user._id,
      roles: user.roles
    }
  });
});

// @desc    Bulk update users (Admin only)
// @route   PUT /api/admin/users/bulk
// @access  Admin
const bulkUpdateUsers = asyncHandler(async (req, res) => {
  const { userIds, updateData } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'User IDs array is required'
    });
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Update data is required'
    });
  }

  // Validate user IDs
  const invalidIds = userIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid user IDs: ${invalidIds.join(', ')}`
    });
  }

  const User = require('../models/User');
  
  // Prevent updating sensitive fields in bulk
  const restrictedFields = ['password', 'email', '_id', 'createdAt'];
  restrictedFields.forEach(field => delete updateData[field]);

  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: updateData }
  );

  res.status(200).json({
    success: true,
    message: `Bulk update completed. ${result.modifiedCount} users updated.`,
    data: {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    }
  });
});

// @desc    Send notification to users (Admin only)
// @route   POST /api/admin/notifications/send
// @access  Admin
const sendNotification = asyncHandler(async (req, res) => {
  const { 
    recipients, // 'all', 'filtered', or array of user IDs
    filters, // filters for 'filtered' option
    subject,
    message,
    type = 'email', // 'email' or 'sms'
    priority = 'normal' // 'low', 'normal', 'high'
  } = req.body;

  if (!subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'Subject and message are required'
    });
  }

  const User = require('../models/User');
  let targetUsers = [];

  // Determine target users based on recipients type
  if (recipients === 'all') {
    targetUsers = await User.find({ isActive: true }, 'email name');
  } else if (recipients === 'filtered' && filters) {
    targetUsers = await User.find({ isActive: true, ...filters }, 'email name');
  } else if (Array.isArray(recipients)) {
    const validIds = recipients.filter(id => mongoose.Types.ObjectId.isValid(id));
    targetUsers = await User.find({ _id: { $in: validIds }, isActive: true }, 'email name');
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid recipients specification'
    });
  }

  if (targetUsers.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid recipients found'
    });
  }

  // Send notifications
  const results = {
    total: targetUsers.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const user of targetUsers) {
    try {
      if (type === 'email') {
        await notificationService.sendCustomEmail(user.email, subject, message, {
          name: user.fullName,
          priority
        });
      }
      // TODO: Add SMS functionality when available
      results.sent++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        userId: user._id,
        email: user.email,
        error: error.message
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `Notification sent. ${results.sent} successful, ${results.failed} failed.`,
    data: results
  });
});

// @desc    Get admin dashboard statistics (Admin only)
// @route   GET /api/admin/dashboard/stats
// @access  Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  
  const [
    totalUsers,
    activeUsers,
    verifiedUsers,
    usersByType,
    usersByRole,
    recentRegistrations,
    loginActivity
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isEmailVerified: true }),
    
    // Users by type
    User.aggregate([
      { $group: { _id: '$userType', count: { $sum: 1 } } }
    ]),
    
    // Users by role
    User.aggregate([
      { $unwind: '$roles' },
      { $group: { _id: '$roles', count: { $sum: 1 } } }
    ]),
    
    // Recent registrations (last 30 days)
    User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]),
    
    // Login activity (last 30 days)
    User.aggregate([
      {
        $match: {
          lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalUsers,
        activeUsers,
        verifiedUsers,
        inactiveUsers: totalUsers - activeUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0
      },
      usersByType: usersByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentRegistrations,
      loginActivity
    }
  });
});

// @desc    Export users data (Admin only)
// @route   GET /api/admin/users/export
// @access  Admin
const exportUsers = asyncHandler(async (req, res) => {
  const { format = 'json', filters = {} } = req.query;

  const User = require('../models/User');
  const users = await User.find(filters)
    .select('-password -magicLinkToken -emailVerificationToken')
    .sort({ createdAt: -1 });

  if (format === 'csv') {
    // Convert to CSV format
    const csvHeaders = [
      'ID', 'Email', 'First Name', 'Last Name', 'User Type', 'Organization',
      'Job Title', 'Department', 'Active', 'Email Verified', 'Created At', 'Roles'
    ];
    
    const csvData = users.map(user => [
      user._id,
      user.email,
      user.name?.firstName || '',
      user.name?.lastName || '',
      user.userType,
      user.affiliation?.organization || '',
      user.affiliation?.jobTitle || '',
      user.affiliation?.department || '',
      user.isActive,
      user.isEmailVerified,
      user.createdAt,
      user.roles?.join(';') || ''
    ]);

    const csv = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  } else {
    // JSON format
    res.status(200).json({
      success: true,
      count: users.length,
      exportedAt: new Date().toISOString(),
      data: users
    });
  }
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserRoles,
  bulkUpdateUsers,
  sendNotification,
  getDashboardStats,
  exportUsers
};
