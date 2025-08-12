const mongoose = require('mongoose');

const communityInterestSchema = new mongoose.Schema({
  // User and Activity Association
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityActivity',
    required: [true, 'Activity ID is required']
  },
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: [true, 'Conference ID is required']
  },
  
  // Interest Status
  status: {
    type: String,
    enum: ['interested', 'maybe', 'not_interested', 'waitlist', 'confirmed', 'cancelled'],
    default: 'interested'
  },
  
  // Contact Preferences for Coordinator
  contactPreferences: {
    shareEmail: { type: Boolean, default: true },
    sharePhone: { type: Boolean, default: false },
    preferredContactMethod: {
      type: String,
      enum: ['email', 'phone', 'both'],
      default: 'email'
    },
    contactTimePreference: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'anytime'],
      default: 'anytime'
    }
  },
  
  // Activity-Specific Interest Details
  activityDetails: {
    // Golf-specific details
    golf: {
      handicap: { 
        type: Number, 
        min: -10, 
        max: 54 
      },
      skillLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'professional']
      },
      ownClubs: { type: Boolean, default: false },
      preferredTeeTime: {
        type: String,
        enum: ['early_morning', 'morning', 'afternoon', 'late_afternoon']
      },
      transportationNeeded: { type: Boolean, default: false }
    },
    
    // Volleyball-specific details
    volleyball: {
      skillLevel: {
        type: String,
        enum: ['recreational', 'intermediate', 'competitive']
      },
      preferredPosition: {
        type: String,
        enum: ['setter', 'outside_hitter', 'middle_blocker', 'libero', 'any']
      },
      experienceYears: { type: Number, min: 0, max: 50 }
    },
    
    // Trivia-specific details
    trivia: {
      strongCategories: [{
        type: String,
        enum: ['history', 'science', 'sports', 'entertainment', 'geography', 'literature', 'current_events', 'business', 'technology']
      }],
      teamPreference: {
        type: String,
        enum: ['form_new_team', 'join_existing', 'no_preference'],
        default: 'no_preference'
      },
      competitiveLevel: {
        type: String,
        enum: ['casual', 'competitive', 'very_competitive'],
        default: 'casual'
      }
    },
    
    // Dining-specific details
    dining: {
      dietaryRestrictions: [{
        type: String,
        enum: ['vegetarian', 'vegan', 'gluten-free', 'kosher', 'halal', 'none']
      }],
      cuisinePreferences: [String],
      allergies: [String],
      pricePreference: {
        type: String,
        enum: ['budget', 'moderate', 'upscale', 'any']
      }
    },
    
    // General fields for other activities
    other: {
      notes: { 
        type: String, 
        maxlength: [500, 'Notes cannot be more than 500 characters'] 
      },
      customResponses: [{
        question: String,
        answer: String
      }]
    }
  },
  
  // Availability Information
  availability: {
    dates: [{
      date: Date,
      available: Boolean,
      timePreferences: [String] // e.g., ['morning', 'afternoon']
    }],
    generalAvailability: {
      type: String,
      enum: ['very_flexible', 'somewhat_flexible', 'limited', 'specific_times_only'],
      default: 'somewhat_flexible'
    },
    notes: { 
      type: String, 
      maxlength: [200, 'Availability notes cannot be more than 200 characters'] 
    }
  },
  
  // Coordinator Communication Log
  communicationLog: [{
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['initial_contact', 'follow_up', 'confirmation', 'update', 'cancellation']
    },
    method: {
      type: String,
      enum: ['email', 'phone', 'text', 'in_person']
    },
    notes: String,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Notification Preferences
  notifications: {
    activityUpdates: { type: Boolean, default: true },
    reminderEmails: { type: Boolean, default: true },
    coordinatorMessages: { type: Boolean, default: true },
    groupCommunications: { type: Boolean, default: true }
  },
  
  // Registration Details
  registrationDetails: {
    registeredAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ['conference_website', 'email_invitation', 'word_of_mouth', 'coordinator_contact', 'other'],
      default: 'conference_website'
    },
    priorityLevel: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  },
  
  // Group/Team Assignment (for team-based activities)
  teamAssignment: {
    teamId: String,
    teamName: String,
    role: String, // captain, member, etc.
    assignedAt: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
communityInterestSchema.index({ userId: 1, activityId: 1 }, { unique: true });
communityInterestSchema.index({ activityId: 1, status: 1 });
communityInterestSchema.index({ conferenceId: 1, status: 1 });
communityInterestSchema.index({ userId: 1, conferenceId: 1 });

// Virtual for user display information
communityInterestSchema.virtual('userDisplayInfo', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
  select: 'name email contact.phones affiliation'
});

// Virtual for activity information
communityInterestSchema.virtual('activityInfo', {
  ref: 'CommunityActivity',
  localField: 'activityId',
  foreignField: '_id',
  justOne: true
});

// Instance method to get contact information for coordinator
communityInterestSchema.methods.getContactInfo = function() {
  const contact = {
    userId: this.userId,
    status: this.status,
    registeredAt: this.registrationDetails.registeredAt,
    contactPreferences: this.contactPreferences
  };
  
  // This will be populated with actual user data when needed
  return contact;
};

// Instance method to update status with logging
communityInterestSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '') {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add to communication log
  this.communicationLog.push({
    type: 'update',
    method: 'system',
    notes: `Status changed from ${oldStatus} to ${newStatus}. ${notes}`,
    sentBy: updatedBy
  });
  
  return this.save();
};

// Instance method to add communication log entry
communityInterestSchema.methods.addCommunication = function(type, method, notes, sentBy) {
  this.communicationLog.push({
    type,
    method,
    notes,
    sentBy
  });
  
  return this.save();
};

// Static method to get interests by activity
communityInterestSchema.statics.getByActivity = function(activityId, status = null) {
  const filter = { activityId };
  if (status) filter.status = status;
  
  return this.find(filter)
    .populate('userId', 'name email contact affiliation privacySettings')
    .sort({ 'registrationDetails.registeredAt': 1 });
};

// Static method to get interests by user
communityInterestSchema.statics.getByUser = function(userId, conferenceId = null) {
  const filter = { userId };
  if (conferenceId) filter.conferenceId = conferenceId;
  
  return this.find(filter)
    .populate('activityId', 'name type description status coordinatorId')
    .populate('conferenceId', 'name year location')
    .sort({ createdAt: -1 });
};

// Static method to get coordinator summary
communityInterestSchema.statics.getCoordinatorSummary = function(coordinatorId, conferenceId) {
  return this.aggregate([
    {
      $lookup: {
        from: 'communityactivities',
        localField: 'activityId',
        foreignField: '_id',
        as: 'activity'
      }
    },
    {
      $unwind: '$activity'
    },
    {
      $match: {
        'activity.coordinatorId': coordinatorId,
        conferenceId: conferenceId
      }
    },
    {
      $group: {
        _id: '$activityId',
        activityName: { $first: '$activity.name' },
        activityType: { $first: '$activity.type' },
        totalInterests: { $sum: 1 },
        interestedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] }
        },
        confirmedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        waitlistCount: {
          $sum: { $cond: [{ $eq: ['$status', 'waitlist'] }, 1, 0] }
        },
        interests: { $push: '$$ROOT' }
      }
    },
    {
      $sort: { activityName: 1 }
    }
  ]);
};

module.exports = mongoose.model('CommunityInterest', communityInterestSchema);
