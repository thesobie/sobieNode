const { catchAsync } = require('../utils/catchAsync');
const CommunityActivity = require('../models/CommunityActivity');
const CommunityInterest = require('../models/CommunityInterest');
const User = require('../models/User');
const Conference = require('../models/Conference');
const mongoose = require('mongoose');

// @desc    Get community activities dashboard for users
// @route   GET /api/community/:conferenceId/activities
// @access  Private
const getCommunityActivities = catchAsync(async (req, res) => {
  const { conferenceId } = req.params;
  const { type, status, includeMyInterests } = req.query;

  // Build filter
  const filter = { conferenceId, isActive: true };
  if (type) filter.type = type;
  if (status) filter.status = status;

  // Get activities
  const activities = await CommunityActivity.find(filter)
    .populate('coordinatorId', 'name email contact')
    .populate('conferenceId', 'name year location')
    .sort({ type: 1, name: 1 });

  // If user wants to include their interests, fetch them
  let userInterests = [];
  if (includeMyInterests === 'true' && req.user) {
    userInterests = await CommunityInterest.find({
      userId: req.user._id,
      conferenceId
    }).select('activityId status activityDetails');
  }

  // Enhance activities with participation info and user interest status
  const enhancedActivities = await Promise.all(
    activities.map(async (activity) => {
      const participantCount = await CommunityInterest.countDocuments({
        activityId: activity._id,
        status: 'interested'
      });

      const availableSpots = await activity.getAvailableSpots();
      const isFull = await activity.isFull();

      // Check if user has expressed interest
      const userInterest = userInterests.find(
        interest => interest.activityId.toString() === activity._id.toString()
      );

      return {
        ...activity.toObject(),
        participantCount,
        availableSpots,
        isFull,
        userInterest: userInterest || null
      };
    })
  );

  res.json({
    success: true,
    data: {
      activities: enhancedActivities,
      totalActivities: enhancedActivities.length,
      activityTypes: [...new Set(enhancedActivities.map(a => a.type))],
      statistics: {
        totalParticipants: enhancedActivities.reduce((sum, a) => sum + a.participantCount, 0),
        openActivities: enhancedActivities.filter(a => a.status === 'open').length,
        fullActivities: enhancedActivities.filter(a => a.isFull).length
      }
    }
  });
});

// @desc    Express interest in a community activity
// @route   POST /api/community/:conferenceId/activities/:activityId/interest
// @access  Private
const expressInterest = catchAsync(async (req, res) => {
  const { conferenceId, activityId } = req.params;
  const userId = req.user._id;
  const {
    contactPreferences,
    activityDetails,
    availability,
    notifications
  } = req.body;

  // Check if activity exists and is active
  const activity = await CommunityActivity.findOne({
    _id: activityId,
    conferenceId,
    isActive: true
  });

  if (!activity) {
    return res.status(404).json({
      success: false,
      message: 'Activity not found or not available'
    });
  }

  // Check if user already expressed interest
  const existingInterest = await CommunityInterest.findOne({
    userId,
    activityId,
    conferenceId
  });

  if (existingInterest) {
    return res.status(400).json({
      success: false,
      message: 'You have already expressed interest in this activity',
      data: { existingInterest }
    });
  }

  // Check if activity is full
  const isFull = await activity.isFull();
  const status = isFull ? 'waitlist' : 'interested';

  // Create interest record
  const interest = new CommunityInterest({
    userId,
    activityId,
    conferenceId,
    status,
    contactPreferences: {
      shareEmail: contactPreferences?.shareEmail !== false, // Default true
      sharePhone: contactPreferences?.sharePhone || false,
      preferredContactMethod: contactPreferences?.preferredContactMethod || 'email',
      contactTimePreference: contactPreferences?.contactTimePreference || 'anytime'
    },
    activityDetails: activityDetails || {},
    availability: availability || {},
    notifications: {
      activityUpdates: notifications?.activityUpdates !== false,
      reminderEmails: notifications?.reminderEmails !== false,
      coordinatorMessages: notifications?.coordinatorMessages !== false,
      groupCommunications: notifications?.groupCommunications !== false
    },
    registrationDetails: {
      registeredAt: new Date(),
      source: 'conference_website',
      priorityLevel: 'medium'
    }
  });

  await interest.save();

  // Populate user information for coordinator notification
  await interest.populate('userId', 'name email contact affiliation');

  // Notify activity coordinator
  await notifyActivityCoordinator(activity, interest, 'new_interest');

  // Get updated participant count
  const participantCount = await CommunityInterest.countDocuments({
    activityId,
    status: { $in: ['interested', 'confirmed'] }
  });

  res.status(201).json({
    success: true,
    message: `Interest registered successfully${isFull ? ' - added to waitlist' : ''}`,
    data: {
      interest: interest.toObject(),
      status,
      participantCount,
      isOnWaitlist: isFull
    }
  });
});

// @desc    Update user's interest in an activity
// @route   PUT /api/community/:conferenceId/activities/:activityId/interest
// @access  Private
const updateInterest = catchAsync(async (req, res) => {
  const { conferenceId, activityId } = req.params;
  const userId = req.user._id;
  const updates = req.body;

  const interest = await CommunityInterest.findOne({
    userId,
    activityId,
    conferenceId
  });

  if (!interest) {
    return res.status(404).json({
      success: false,
      message: 'Interest record not found'
    });
  }

  // Update allowed fields
  const allowedUpdates = ['contactPreferences', 'activityDetails', 'availability', 'notifications'];
  allowedUpdates.forEach(field => {
    if (updates[field]) {
      interest[field] = { ...interest[field], ...updates[field] };
    }
  });

  await interest.save();

  res.json({
    success: true,
    message: 'Interest updated successfully',
    data: { interest }
  });
});

// @desc    Withdraw interest from an activity
// @route   DELETE /api/community/:conferenceId/activities/:activityId/interest
// @access  Private
const withdrawInterest = catchAsync(async (req, res) => {
  const { conferenceId, activityId } = req.params;
  const userId = req.user._id;

  const interest = await CommunityInterest.findOne({
    userId,
    activityId,
    conferenceId
  }).populate('activityId', 'name coordinatorId');

  if (!interest) {
    return res.status(404).json({
      success: false,
      message: 'Interest record not found'
    });
  }

  // Update status instead of deleting (for record keeping)
  interest.status = 'cancelled';
  interest.communicationLog.push({
    type: 'cancellation',
    method: 'system',
    notes: 'User withdrew interest',
    sentBy: userId
  });

  await interest.save();

  // Notify coordinator of withdrawal
  await notifyActivityCoordinator(interest.activityId, interest, 'interest_withdrawn');

  res.json({
    success: true,
    message: 'Interest withdrawn successfully'
  });
});

// @desc    Get user's community interests
// @route   GET /api/community/:conferenceId/my-interests
// @access  Private
const getMyInterests = catchAsync(async (req, res) => {
  const { conferenceId } = req.params;
  const userId = req.user._id;

  const interests = await CommunityInterest.find({
    userId,
    conferenceId,
    status: { $ne: 'cancelled' }
  })
    .populate('activityId', 'name type description status coordinatorId scheduledDate location')
    .populate('conferenceId', 'name year location')
    .sort({ createdAt: -1 });

  // Group by status for better organization
  const groupedInterests = {
    interested: interests.filter(i => i.status === 'interested'),
    confirmed: interests.filter(i => i.status === 'confirmed'),
    waitlist: interests.filter(i => i.status === 'waitlist'),
    maybe: interests.filter(i => i.status === 'maybe')
  };

  res.json({
    success: true,
    data: {
      interests,
      groupedInterests,
      totalInterests: interests.length,
      statistics: {
        confirmedActivities: groupedInterests.confirmed.length,
        waitlistActivities: groupedInterests.waitlist.length,
        pendingActivities: groupedInterests.interested.length + groupedInterests.maybe.length
      }
    }
  });
});

// @desc    Get activity coordinator dashboard
// @route   GET /api/community/:conferenceId/coordinator/dashboard
// @access  Private (Activity Coordinator role required)
const getCoordinatorDashboard = catchAsync(async (req, res) => {
  const { conferenceId } = req.params;
  const coordinatorId = req.user._id;

  // Verify user has coordinator role
  if (!req.user.hasRole('activity-coordinator') && !req.user.hasRole('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Activity Coordinator role required.'
    });
  }

  // Get coordinator's activities
  const activities = await CommunityActivity.find({
    coordinatorId,
    conferenceId,
    isActive: true
  }).populate('conferenceId', 'name year location');

  // Get summary statistics
  const summary = await CommunityInterest.getCoordinatorSummary(coordinatorId, mongoose.Types.ObjectId(conferenceId));

  // Get recent communications
  const recentCommunications = await CommunityInterest.find({
    'communicationLog.sentBy': coordinatorId,
    conferenceId
  })
    .populate('userId', 'name email')
    .populate('activityId', 'name type')
    .sort({ 'communicationLog.date': -1 })
    .limit(10)
    .select('communicationLog userId activityId');

  // Calculate overall statistics
  const totalInterests = summary.reduce((sum, activity) => sum + activity.totalInterests, 0);
  const totalConfirmed = summary.reduce((sum, activity) => sum + activity.confirmedCount, 0);
  const totalWaitlist = summary.reduce((sum, activity) => sum + activity.waitlistCount, 0);

  res.json({
    success: true,
    data: {
      activities,
      summary,
      recentCommunications,
      statistics: {
        totalActivities: activities.length,
        totalInterests,
        totalConfirmed,
        totalWaitlist,
        averageInterestsPerActivity: activities.length > 0 ? (totalInterests / activities.length).toFixed(1) : 0
      }
    }
  });
});

// @desc    Get participants for coordinator's activity
// @route   GET /api/community/:conferenceId/coordinator/activities/:activityId/participants
// @access  Private (Activity Coordinator role required)
const getActivityParticipants = catchAsync(async (req, res) => {
  const { conferenceId, activityId } = req.params;
  const { status, includeContactInfo } = req.query;

  // Verify activity belongs to coordinator or user is admin
  const activity = await CommunityActivity.findOne({
    _id: activityId,
    conferenceId
  });

  if (!activity) {
    return res.status(404).json({
      success: false,
      message: 'Activity not found'
    });
  }

  if (activity.coordinatorId.toString() !== req.user._id.toString() && !req.user.hasRole('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view participants for your own activities.'
    });
  }

  // Build filter
  const filter = { activityId };
  if (status) filter.status = status;

  // Get participants
  const participants = await CommunityInterest.find(filter)
    .populate('userId', includeContactInfo === 'true' 
      ? 'name email contact affiliation privacySettings' 
      : 'name affiliation privacySettings'
    )
    .sort({ 'registrationDetails.registeredAt': 1 });

  // Filter contact info based on privacy settings and contact preferences
  const enhancedParticipants = participants.map(participant => {
    const user = participant.userId;
    const participantData = {
      ...participant.toObject(),
      contactInfo: {}
    };

    // Respect user privacy settings and contact preferences
    if (participant.contactPreferences.shareEmail && user.privacySettings?.contactInfo?.email !== false) {
      participantData.contactInfo.email = user.email;
    }

    if (participant.contactPreferences.sharePhone && user.privacySettings?.contactInfo?.phone !== false) {
      participantData.contactInfo.phone = user.primaryPhone;
    }

    return participantData;
  });

  // Group by status
  const groupedParticipants = {
    interested: enhancedParticipants.filter(p => p.status === 'interested'),
    confirmed: enhancedParticipants.filter(p => p.status === 'confirmed'),
    waitlist: enhancedParticipants.filter(p => p.status === 'waitlist'),
    maybe: enhancedParticipants.filter(p => p.status === 'maybe')
  };

  res.json({
    success: true,
    data: {
      activity: activity.toObject(),
      participants: enhancedParticipants,
      groupedParticipants,
      statistics: {
        total: enhancedParticipants.length,
        interested: groupedParticipants.interested.length,
        confirmed: groupedParticipants.confirmed.length,
        waitlist: groupedParticipants.waitlist.length,
        maybe: groupedParticipants.maybe.length
      }
    }
  });
});

// @desc    Create new community activity (Admin/Coordinator)
// @route   POST /api/community/:conferenceId/activities
// @access  Private (Admin or Activity Coordinator)
const createActivity = catchAsync(async (req, res) => {
  const { conferenceId } = req.params;
  const {
    name,
    description,
    category,
    type,
    maxParticipants,
    requiresSkillLevel,
    requiresEquipment,
    activitySpecific,
    scheduledDate,
    scheduledTime,
    duration,
    location,
    communicationChannels
  } = req.body;

  // Verify permissions
  if (!req.user.hasRole('admin') && !req.user.hasRole('activity-coordinator')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Activity Coordinator role required.'
    });
  }

  // Verify conference exists
  const conference = await Conference.findById(conferenceId);
  if (!conference) {
    return res.status(404).json({
      success: false,
      message: 'Conference not found'
    });
  }

  // Create activity
  const activity = new CommunityActivity({
    name,
    description,
    category,
    type,
    maxParticipants,
    requiresSkillLevel,
    requiresEquipment,
    conferenceId,
    coordinatorId: req.user._id,
    activitySpecific: activitySpecific || {},
    scheduledDate,
    scheduledTime,
    duration,
    location: location || {},
    communicationChannels: communicationChannels || {},
    status: 'planning'
  });

  await activity.save();

  res.status(201).json({
    success: true,
    message: 'Community activity created successfully',
    data: { activity }
  });
});

// Helper function to notify activity coordinator
async function notifyActivityCoordinator(activity, interest, type) {
  try {
    // This would integrate with your notification system
    // For now, we'll just log it
    console.log(`🔔 Coordinator Notification:`, {
      type,
      activity: activity.name || activity,
      user: interest.userId?.name || interest.userId,
      timestamp: new Date()
    });

    // TODO: Implement actual notification system (email, SMS, etc.)
    // Examples:
    // - Send email to coordinator
    // - Create in-app notification
    // - Send SMS if coordinator prefers
    // - Post to Slack channel if configured

  } catch (error) {
    console.error('Error sending coordinator notification:', error);
    // Don't throw error - notification failure shouldn't break the main flow
  }
}

module.exports = {
  getCommunityActivities,
  expressInterest,
  updateInterest,
  withdrawInterest,
  getMyInterests,
  getCoordinatorDashboard,
  getActivityParticipants,
  createActivity
};
