const mongoose = require('mongoose');

const userSuggestionSchema = new mongoose.Schema({
  // Submitter Information
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submitterEmail: {
    type: String,
    required: true
  },
  submitterName: {
    firstName: String,
    lastName: String
  },

  // Suggestion Details
  suggestionType: {
    type: String,
    enum: [
      'missing_presentation',     // Add missing research presentation
      'missing_author',          // Add missing author to existing presentation
      'incorrect_info',          // Correct existing information
      'missing_conference',      // Add missing conference year
      'missing_session',         // Add missing session information
      'author_affiliation',      // Correct author affiliation
      'presentation_details',    // Update presentation details
      'service_record',          // Add service/volunteer record
      'award_recognition',       // Add missing awards
      'other'                   // Other suggestions
    ],
    required: true
  },

  // Target Information (what they're suggesting about)
  targetType: {
    type: String,
    enum: ['presentation', 'user', 'conference', 'session', 'general'],
    required: true
  },
  
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  
  targetModel: {
    type: String,
    enum: ['ResearchPresentation', 'User', 'Conference', 'Session']
  },

  // Suggestion Content
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },

  // Specific suggestion data
  suggestedChanges: {
    // For missing presentations
    presentationInfo: {
      title: String,
      authors: [String],
      year: Number,
      conference: String,
      session: String,
      abstract: String,
      discipline: String,
      methodology: String
    },
    
    // For author corrections
    authorInfo: {
      name: String,
      affiliation: String,
      email: String,
      role: String
    },
    
    // For general corrections
    currentValue: String,
    suggestedValue: String,
    fieldName: String,
    
    // For service records
    serviceInfo: {
      year: Number,
      role: String,
      description: String,
      conference: String
    },
    
    // Supporting evidence
    evidence: {
      sourceDocuments: [String],
      urls: [String],
      contactInfo: String,
      additionalNotes: String
    }
  },

  // Priority and Category
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  category: {
    type: String,
    enum: ['data_quality', 'missing_content', 'historical_accuracy', 'user_experience', 'technical'],
    required: true
  },

  // Contact and Follow-up
  contactPreference: {
    type: String,
    enum: ['email', 'none'],
    default: 'email'
  },
  
  allowPublicContact: {
    type: Boolean,
    default: false
  },

  // Admin Review
  status: {
    type: String,
    enum: ['pending', 'in_review', 'approved', 'rejected', 'implemented', 'duplicate'],
    default: 'pending'
  },
  
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  reviewedAt: Date,
  
  reviewNotes: {
    type: String,
    maxlength: 1000
  },
  
  implementedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  implementedAt: Date,
  
  implementationNotes: {
    type: String,
    maxlength: 1000
  },

  // Impact and Tracking
  impact: {
    recordsAffected: Number,
    usersAffected: Number,
    dataQualityScore: Number
  },
  
  relatedSuggestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSuggestion'
  }],

  // Metadata
  isPublic: {
    type: Boolean,
    default: false
  },
  
  tags: [String],
  
  attachments: [{
    filename: String,
    filePath: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSuggestionSchema.index({ submittedBy: 1, createdAt: -1 });
userSuggestionSchema.index({ status: 1, priority: 1 });
userSuggestionSchema.index({ suggestionType: 1, targetType: 1 });
userSuggestionSchema.index({ reviewedBy: 1, reviewedAt: -1 });
userSuggestionSchema.index({ category: 1, status: 1 });

// Virtual for submitter full name
userSuggestionSchema.virtual('submitterFullName').get(function() {
  if (this.submitterName) {
    return `${this.submitterName.firstName || ''} ${this.submitterName.lastName || ''}`.trim();
  }
  return 'Unknown';
});

// Virtual for days since submission
userSuggestionSchema.virtual('daysSinceSubmission').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for status display
userSuggestionSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending': '⏳ Pending Review',
    'in_review': '👀 Under Review',
    'approved': '✅ Approved',
    'rejected': '❌ Rejected',
    'implemented': '🎉 Implemented',
    'duplicate': '🔄 Duplicate'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for priority display
userSuggestionSchema.virtual('priorityDisplay').get(function() {
  const priorityMap = {
    'low': '🟢 Low',
    'medium': '🟡 Medium',
    'high': '🟠 High',
    'urgent': '🔴 Urgent'
  };
  return priorityMap[this.priority] || this.priority;
});

// Instance methods
userSuggestionSchema.methods.approve = function(reviewerId, notes) {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

userSuggestionSchema.methods.reject = function(reviewerId, notes) {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

userSuggestionSchema.methods.implement = function(implementerId, notes) {
  this.status = 'implemented';
  this.implementedBy = implementerId;
  this.implementedAt = new Date();
  this.implementationNotes = notes;
  return this.save();
};

userSuggestionSchema.methods.markDuplicate = function(reviewerId, originalSuggestionId) {
  this.status = 'duplicate';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.relatedSuggestions.push(originalSuggestionId);
  return this.save();
};

// Static methods
userSuggestionSchema.statics.getByUser = function(userId) {
  return this.find({ submittedBy: userId })
    .populate('reviewedBy', 'name email')
    .populate('implementedBy', 'name email')
    .sort({ createdAt: -1 });
};

userSuggestionSchema.statics.getPendingReviews = function() {
  return this.find({ status: 'pending' })
    .populate('submittedBy', 'name email affiliation')
    .sort({ priority: -1, createdAt: 1 });
};

userSuggestionSchema.statics.getAdminDashboard = function(filters = {}) {
  const query = {};
  
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category = filters.category;
  if (filters.suggestionType) query.suggestionType = filters.suggestionType;
  
  return this.find(query)
    .populate('submittedBy', 'name email affiliation')
    .populate('reviewedBy', 'name email')
    .populate('implementedBy', 'name email')
    .sort({ priority: -1, createdAt: -1 });
};

userSuggestionSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalSuggestions: { $sum: 1 },
        byStatus: { 
          $push: {
            status: '$status',
            count: 1
          }
        },
        byType: {
          $push: {
            type: '$suggestionType',
            count: 1
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            count: 1
          }
        },
        avgDaysToReview: {
          $avg: {
            $divide: [
              { $subtract: ['$reviewedAt', '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
userSuggestionSchema.pre('save', function(next) {
  // Auto-set priority based on suggestion type
  if (this.isNew && !this.priority) {
    const urgentTypes = ['incorrect_info', 'missing_conference'];
    const highTypes = ['missing_presentation', 'missing_author'];
    
    if (urgentTypes.includes(this.suggestionType)) {
      this.priority = 'urgent';
    } else if (highTypes.includes(this.suggestionType)) {
      this.priority = 'high';
    }
  }
  
  // Auto-categorize if not set
  if (this.isNew && !this.category) {
    const categoryMap = {
      'missing_presentation': 'missing_content',
      'missing_author': 'missing_content',
      'incorrect_info': 'data_quality',
      'missing_conference': 'historical_accuracy',
      'author_affiliation': 'data_quality',
      'presentation_details': 'data_quality'
    };
    
    this.category = categoryMap[this.suggestionType] || 'other';
  }
  
  next();
});

module.exports = mongoose.model('UserSuggestion', userSuggestionSchema);
