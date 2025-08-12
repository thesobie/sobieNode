const mongoose = require('mongoose');

const conferenceSchema = new mongoose.Schema({
  // Basic Conference Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    unique: true,
    min: 1999,
    max: 2030
  },
  edition: {
    type: String, // e.g., "25th Annual"
    required: true
  },
  
  // Dates and Location
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  location: {
    venue: {
      type: String,
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    conferenceCenter: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Conference Leadership
  officers: {
    president: {
      name: String,
      email: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    vicePresident: {
      name: String,
      email: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    secretaryTreasurer: {
      name: String,
      email: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    conferenceChairman: {
      name: String,
      email: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    studentSessionCoordinator: {
      name: String,
      email: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    jobieEditor: {
      name: String,
      email: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    webmasters: [{
      name: String,
      email: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    programDesigner: {
      name: String,
      email: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },

  // Board of Directors
  boardOfDirectors: [{
    name: String,
    affiliation: String,
    position: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Keynote Information
  keynote: {
    speaker: {
      name: String,
      title: String,
      affiliation: String,
      bio: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    title: String,
    description: String,
    date: Date,
    time: String,
    location: String
  },

  // Special Events
  specialEvents: [{
    name: String,
    description: String,
    date: Date,
    time: String,
    location: String,
    type: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'reception', 'roundtable', 'memorial', 'award', 'other']
    },
    speakers: [{
      name: String,
      title: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  }],

  // Conference Statistics
  statistics: {
    totalSessions: Number,
    totalPresentations: Number,
    totalAttendees: Number,
    totalInstitutions: Number,
    studentPresentations: Number,
    facultyPresentations: Number,
    roundtableSessions: Number,
    openSessions: Number
  },

  // Conference Tracks and Categories
  tracks: [{
    name: String,
    description: String,
    sessionCount: Number,
    coordinator: {
      name: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  }],

  // Registration Information
  registration: {
    registrationDates: {
      earlyBird: Date,
      regular: Date,
      late: Date,
      onSite: Date
    },
    fees: {
      faculty: {
        earlyBird: Number,
        regular: Number,
        late: Number,
        onSite: Number
      },
      student: {
        earlyBird: Number,
        regular: Number,
        late: Number,
        onSite: Number
      },
      industry: {
        earlyBird: Number,
        regular: Number,
        late: Number,
        onSite: Number
      }
    },
    registrationPlatform: String,
    contactEmail: String
  },

  // Memorial/Dedications
  memorials: [{
    dedicatedTo: String,
    title: String,
    description: String,
    obituaryLink: String,
    relationship: String // e.g., "Former Conference Chair", "Founder"
  }],

  // Conference Theme and Description
  theme: String,
  description: String,
  aboutText: String,

  // Past Presidents (for historical context)
  pastPresidents: [{
    year: Number,
    name: String,
    affiliation: String
  }],

  // Conference Status
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },

  // Next Conference Preview
  nextConference: {
    year: Number,
    dates: String,
    location: String,
    preliminaryInfo: String
  },

  // Documents and Resources
  documents: [{
    type: {
      type: String,
      enum: ['program', 'proceedings', 'schedule', 'abstract_book', 'sponsor_materials']
    },
    title: String,
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// Note: year index is automatically created by unique: true constraint
conferenceSchema.index({ startDate: 1, endDate: 1 });
conferenceSchema.index({ status: 1 });
conferenceSchema.index({ 'location.city': 1, 'location.state': 1 });

// Virtual for conference duration
conferenceSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }
  return null;
});

// Virtual for conference status
conferenceSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now;
});

// Virtual for conference upcoming
conferenceSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  return this.startDate > now;
});

// Virtual for conference past
conferenceSchema.virtual('isPast').get(function() {
  const now = new Date();
  return this.endDate < now;
});

// Instance methods
conferenceSchema.methods.getOfficerByRole = function(role) {
  return this.officers[role] || null;
};

conferenceSchema.methods.getBoardMember = function(name) {
  return this.boardOfDirectors.find(member => 
    member.name.toLowerCase().includes(name.toLowerCase())
  );
};

// Static methods
conferenceSchema.statics.getCurrentConference = function() {
  const now = new Date();
  return this.findOne({
    startDate: { $lte: now },
    endDate: { $gte: now },
    status: 'active'
  });
};

conferenceSchema.statics.getUpcomingConference = function() {
  const now = new Date();
  return this.findOne({
    startDate: { $gt: now },
    status: { $in: ['planning', 'active'] }
  }).sort({ startDate: 1 });
};

conferenceSchema.statics.getConferenceByYear = function(year) {
  return this.findOne({ year: year });
};

// Pre-save middleware
conferenceSchema.pre('save', function(next) {
  // Auto-generate full name if not provided
  if (!this.fullName && this.name && this.edition) {
    this.fullName = `${this.name} ${this.edition} Academic Conference`;
  }
  
  // Calculate statistics from sessions if not manually set
  if (!this.statistics.totalSessions) {
    // This would be calculated from related Session documents
    // For now, we'll leave it to be manually updated
  }
  
  next();
});

module.exports = mongoose.model('Conference', conferenceSchema);
