const mongoose = require('mongoose');

const communityActivitySchema = new mongoose.Schema({
  // Activity Information
  name: {
    type: String,
    required: [true, 'Activity name is required'],
    trim: true,
    maxlength: [100, 'Activity name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Activity description cannot be more than 500 characters']
  },
  category: {
    type: String,
    enum: ['sports', 'social', 'educational', 'dining', 'entertainment', 'other'],
    required: [true, 'Activity category is required']
  },
  type: {
    type: String,
    enum: ['golf', 'volleyball', 'trivia', 'dining', 'tours', 'networking', 'other'],
    required: [true, 'Activity type is required']
  },
  
  // Activity Configuration
  maxParticipants: {
    type: Number,
    min: [1, 'Maximum participants must be at least 1'],
    max: [1000, 'Maximum participants cannot exceed 1000']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  requiresSkillLevel: {
    type: Boolean,
    default: false
  },
  requiresEquipment: {
    type: Boolean,
    default: false
  },
  
  // Conference Association
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: [true, 'Conference ID is required']
  },
  
  // Activity Coordinator
  coordinatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Activity coordinator is required']
  },
  
  // Activity-Specific Fields
  activitySpecific: {
    // Golf-specific fields
    golf: {
      handicapRequired: { type: Boolean, default: false },
      skillLevels: [{
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'professional']
      }],
      courseName: { type: String, trim: true },
      greenFees: { type: Number, min: 0 },
      cartRental: { type: Number, min: 0 }
    },
    
    // Volleyball-specific fields
    volleyball: {
      skillLevels: [{
        type: String,
        enum: ['recreational', 'intermediate', 'competitive']
      }],
      format: {
        type: String,
        enum: ['beach', 'indoor', 'both'],
        default: 'indoor'
      }
    },
    
    // Trivia-specific fields
    trivia: {
      topics: [String],
      teamSize: { type: Number, min: 1, max: 10, default: 4 },
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'mixed'],
        default: 'mixed'
      }
    },
    
    // Dining-specific fields
    dining: {
      cuisineType: String,
      priceRange: {
        type: String,
        enum: ['$', '$$', '$$$', '$$$$']
      },
      dietaryOptions: [{
        type: String,
        enum: ['vegetarian', 'vegan', 'gluten-free', 'kosher', 'halal']
      }]
    },
    
    // General fields for other activities
    other: {
      customFields: [{
        name: String,
        value: String,
        type: {
          type: String,
          enum: ['text', 'number', 'boolean', 'date'],
          default: 'text'
        }
      }]
    }
  },
  
  // Scheduling Information
  scheduledDate: Date,
  scheduledTime: String,
  duration: {
    type: Number, // in minutes
    min: [15, 'Duration must be at least 15 minutes'],
    max: [1440, 'Duration cannot exceed 24 hours']
  },
  location: {
    venue: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    notes: String
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['planning', 'open', 'full', 'in_progress', 'completed', 'cancelled'],
    default: 'planning'
  },
  
  // Communication
  communicationChannels: {
    email: { type: Boolean, default: true },
    phone: { type: Boolean, default: false },
    slack: { type: String, trim: true }, // Slack channel/group
    whatsapp: { type: String, trim: true } // WhatsApp group link
  }
}, {
  timestamps: true
});

// Indexes for better query performance
communityActivitySchema.index({ conferenceId: 1, isActive: 1 });
communityActivitySchema.index({ type: 1, status: 1 });
communityActivitySchema.index({ coordinatorId: 1 });

// Virtual for participant count
communityActivitySchema.virtual('participantCount', {
  ref: 'CommunityInterest',
  localField: '_id',
  foreignField: 'activityId',
  count: true,
  match: { status: 'interested' }
});

// Virtual for activity full name
communityActivitySchema.virtual('fullName').get(function() {
  return `${this.name} - ${this.type}`;
});

// Instance method to check if activity is full
communityActivitySchema.methods.isFull = async function() {
  if (!this.maxParticipants) return false;
  
  const CommunityInterest = mongoose.model('CommunityInterest');
  const currentParticipants = await CommunityInterest.countDocuments({
    activityId: this._id,
    status: 'interested'
  });
  
  return currentParticipants >= this.maxParticipants;
};

// Instance method to get available spots
communityActivitySchema.methods.getAvailableSpots = async function() {
  if (!this.maxParticipants) return 'Unlimited';
  
  const CommunityInterest = mongoose.model('CommunityInterest');
  const currentParticipants = await CommunityInterest.countDocuments({
    activityId: this._id,
    status: 'interested'
  });
  
  return Math.max(0, this.maxParticipants - currentParticipants);
};

// Static method to get activities by conference
communityActivitySchema.statics.getByConference = function(conferenceId, status = null) {
  const filter = { conferenceId, isActive: true };
  if (status) filter.status = status;
  
  return this.find(filter)
    .populate('coordinatorId', 'name email contact.phones')
    .populate('conferenceId', 'name year location')
    .sort({ type: 1, name: 1 });
};

// Static method to get activities by coordinator
communityActivitySchema.statics.getByCoordinator = function(coordinatorId) {
  return this.find({ coordinatorId, isActive: true })
    .populate('conferenceId', 'name year location')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('CommunityActivity', communityActivitySchema);
