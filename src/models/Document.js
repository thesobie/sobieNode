const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  // File Information
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['program', 'proceedings', 'schedule', 'poster', 'presentation', 'abstract', 'sponsor_material', 'other']
  },
  subcategory: {
    type: String,
    maxlength: 100
  },

  // File Details
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v === 'application/pdf';
      },
      message: 'Only PDF files are allowed'
    }
  },
  checksum: {
    type: String,
    required: true // For file integrity verification
  },

  // Conference Context
  conferenceYear: {
    type: Number,
    required: true,
    min: 1999, // Support all SOBIE history from 1999
    max: 2030
  },
  track: {
    type: String,
    enum: ['general', 'research', 'industry', 'student', 'workshop', 'keynote']
  },
  session: {
    type: String,
    maxlength: 100
  },

  // Access Control
  isPublic: {
    type: Boolean,
    default: false
  },
  allowedRoles: [{
    type: String,
    enum: ['attendee', 'presenter', 'reviewer', 'organizer', 'sponsor', 'volunteer']
  }],
  requiredRegistration: {
    type: Boolean,
    default: true
  },

  // Version Control
  version: {
    type: String,
    default: '1.0'
  },
  previousVersions: [{
    filename: String,
    filePath: String,
    version: String,
    uploadedAt: Date,
    replacedBy: String
  }],

  // Upload Information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },

  // Download Tracking
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloaded: {
    type: Date
  },

  // Content Analysis (optional)
  pageCount: {
    type: Number
  },
  extractedText: {
    type: String,
    select: false // Only load when specifically requested
  },
  keywords: [String],

  // Status
  status: {
    type: String,
    enum: ['processing', 'active', 'archived', 'deleted', 'historical'],
    default: 'processing'
  },
  publishDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
documentSchema.index({ conferenceYear: 1, category: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ isPublic: 1, status: 1 });
documentSchema.index({ conferenceYear: 1, track: 1, session: 1 });
documentSchema.index({ publishDate: 1, expiryDate: 1 });

// Virtual for public URL
documentSchema.virtual('publicUrl').get(function() {
  if (this.isPublic && this.status === 'active') {
    return `/api/documents/${this._id}/download`;
  }
  return null;
});

// Virtual for file extension
documentSchema.virtual('fileExtension').get(function() {
  return this.filename.split('.').pop().toLowerCase();
});

// Instance method to check access permission
documentSchema.methods.canAccess = function(user) {
  // Public documents
  if (this.isPublic && this.status === 'active') {
    return true;
  }

  // User must be authenticated
  if (!user) {
    return false;
  }

  // Uploader always has access
  if (this.uploadedBy.toString() === user._id.toString()) {
    return true;
  }

  // Admin/organizer access
  if (user.roles.includes('admin') || user.roles.includes('organizer')) {
    return true;
  }

  // Role-based access
  if (this.allowedRoles.length > 0) {
    return this.allowedRoles.some(role => user.roles.includes(role));
  }

  // Registration requirement
  if (this.requiredRegistration && !user.isEmailVerified) {
    return false;
  }

  return false;
};

// Static method to get directory structure
documentSchema.statics.getStorageDirectory = function(conferenceYear, category) {
  return `uploads/documents/${conferenceYear}/${category}`;
};

// Static method to get historical documents by year range
documentSchema.statics.getHistoricalDocuments = function(startYear, endYear, options = {}) {
  const query = {
    conferenceYear: { $gte: startYear, $lte: endYear }
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.isPublic !== undefined) {
    query.isPublic = options.isPublic;
  }
  
  if (options.status) {
    query.status = options.status;
  } else {
    query.status = { $in: ['active', 'archived', 'historical'] };
  }
  
  return this.find(query)
    .populate('uploadedBy', 'firstName lastName email')
    .sort({ conferenceYear: -1, category: 1 });
};

// Static method to get conference timeline
documentSchema.statics.getConferenceTimeline = function() {
  return this.aggregate([
    {
      $match: {
        status: { $in: ['active', 'archived', 'historical'] }
      }
    },
    {
      $group: {
        _id: '$conferenceYear',
        documentCount: { $sum: 1 },
        categories: { $addToSet: '$category' },
        hasProgram: {
          $sum: {
            $cond: [{ $eq: ['$category', 'program'] }, 1, 0]
          }
        },
        hasProceedings: {
          $sum: {
            $cond: [{ $eq: ['$category', 'proceedings'] }, 1, 0]
          }
        },
        totalSize: { $sum: '$fileSize' },
        publicDocuments: {
          $sum: {
            $cond: ['$isPublic', 1, 0]
          }
        }
      }
    },
    {
      $sort: { _id: -1 }
    }
  ]);
};

// Static method to get document statistics
documentSchema.statics.getDocumentStatistics = function() {
  return this.aggregate([
    {
      $match: {
        status: { $in: ['active', 'archived', 'historical'] }
      }
    },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        yearRange: {
          $push: '$conferenceYear'
        },
        categoryCounts: {
          $push: '$category'
        },
        publicDocuments: {
          $sum: {
            $cond: ['$isPublic', 1, 0]
          }
        },
        totalDownloads: { $sum: '$downloadCount' }
      }
    },
    {
      $project: {
        totalDocuments: 1,
        totalSize: 1,
        publicDocuments: 1,
        totalDownloads: 1,
        earliestYear: { $min: '$yearRange' },
        latestYear: { $max: '$yearRange' },
        yearsSpan: {
          $subtract: [
            { $max: '$yearRange' },
            { $min: '$yearRange' }
          ]
        },
        avgSizeBytes: { $divide: ['$totalSize', '$totalDocuments'] }
      }
    }
  ]);
};

// Pre-save middleware
documentSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Document', documentSchema);
