const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  // Session Identification
  sessionNumber: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Analytics', 'Pedagogy', 'Student Research', 'General Business', 'Economics', 
           'Healthcare', 'International', 'Finance', 'Sports', 'Accounting', 'Management', 
           'Round Table', 'Open', 'Keynote', 'Plenary']
  },
  track: {
    type: String,
    enum: ['general', 'research', 'industry', 'student', 'workshop', 'keynote']
  },

  // Conference and Scheduling
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: true
  },
  conferenceYear: {
    type: Number,
    required: true
  },
  
  // Date and Time
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true // Format: "9:00 AM"
  },
  endTime: {
    type: String,
    required: true // Format: "10:15 AM"
  },
  
  // Location
  location: {
    room: {
      type: String,
      required: true // e.g., "Terrace 1", "Bayview Room"
    },
    building: String,
    venue: String
  },

  // Session Leadership
  chair: {
    name: String,
    affiliation: String,
    email: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  moderators: [{
    name: String,
    affiliation: String,
    email: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Session Type Details
  sessionType: {
    type: String,
    enum: ['presentation', 'roundtable', 'panel', 'keynote', 'open', 'breakfast', 'special'],
    default: 'presentation'
  },
  
  // For Round Table Sessions
  roundTableTopic: String,
  roundTableDescription: String,

  // Session Status
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },

  // Presentations in this session
  presentations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResearchPresentation'
  }],

  // Session Notes and Description
  description: String,
  notes: String,
  specialInstructions: String,

  // Attendance and Evaluation
  attendance: {
    estimated: Number,
    actual: Number
  },
  
  feedback: [{
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Technical Requirements
  technicalRequirements: {
    projector: { type: Boolean, default: false },
    microphone: { type: Boolean, default: false },
    flipChart: { type: Boolean, default: false },
    internet: { type: Boolean, default: false },
    recording: { type: Boolean, default: false },
    livestream: { type: Boolean, default: false },
    other: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
sessionSchema.index({ conferenceId: 1, sessionNumber: 1 });
sessionSchema.index({ conferenceYear: 1, date: 1, startTime: 1 });
sessionSchema.index({ category: 1, track: 1 });
sessionSchema.index({ 'location.room': 1, date: 1 });
sessionSchema.index({ 'chair.userId': 1 });

// Virtual for session duration in minutes
sessionSchema.virtual('durationMinutes').get(function() {
  if (this.startTime && this.endTime) {
    // Parse time strings and calculate difference
    const start = this.parseTimeString(this.startTime);
    const end = this.parseTimeString(this.endTime);
    return end - start;
  }
  return null;
});

// Virtual for formatted time range
sessionSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Virtual for day of week
sessionSchema.virtual('dayOfWeek').get(function() {
  if (this.date) {
    return this.date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return null;
});

// Instance methods
sessionSchema.methods.parseTimeString = function(timeStr) {
  // Convert "9:00 AM" to minutes since midnight
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = (hours % 12) * 60 + minutes;
  if (period === 'PM') totalMinutes += 12 * 60;
  return totalMinutes;
};

sessionSchema.methods.addPresentation = function(presentationId) {
  if (!this.presentations.includes(presentationId)) {
    this.presentations.push(presentationId);
  }
};

sessionSchema.methods.removePresentation = function(presentationId) {
  this.presentations = this.presentations.filter(
    id => id.toString() !== presentationId.toString()
  );
};

sessionSchema.methods.isActive = function() {
  const now = new Date();
  const sessionStart = new Date(this.date);
  const sessionEnd = new Date(this.date);
  
  // Set session times (approximate)
  const startMinutes = this.parseTimeString(this.startTime);
  const endMinutes = this.parseTimeString(this.endTime);
  
  sessionStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  sessionEnd.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  
  return now >= sessionStart && now <= sessionEnd;
};

// Static methods
sessionSchema.statics.getSessionsByDay = function(conferenceId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    conferenceId: conferenceId,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ startTime: 1, 'location.room': 1 });
};

sessionSchema.statics.getSessionsByRoom = function(conferenceId, room) {
  return this.find({
    conferenceId: conferenceId,
    'location.room': room
  }).sort({ date: 1, startTime: 1 });
};

sessionSchema.statics.getSessionsByCategory = function(conferenceId, category) {
  return this.find({
    conferenceId: conferenceId,
    category: category
  }).sort({ date: 1, startTime: 1 });
};

sessionSchema.statics.getCurrentSession = function() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.findOne({
    date: { $gte: today, $lt: tomorrow },
    status: 'in_progress'
  });
};

// Pre-save middleware
sessionSchema.pre('save', function(next) {
  // Ensure session number is unique within conference
  if (this.isNew) {
    this.constructor.findOne({
      conferenceId: this.conferenceId,
      sessionNumber: this.sessionNumber
    })
    .then(existingSession => {
      if (existingSession) {
        const error = new Error(`Session number ${this.sessionNumber} already exists for this conference`);
        next(error);
      } else {
        next();
      }
    })
    .catch(next);
  } else {
    next();
  }
});

// ===== PROGRAM BUILDER ENHANCEMENT METHODS =====

// Virtual for session duration in minutes
sessionSchema.virtual('durationMinutes').get(function() {
  if (this.startTime && this.endTime) {
    const start = parseTime(this.startTime);
    const end = parseTime(this.endTime);
    return end - start;
  }
  return null;
});

// Virtual for presentation count
sessionSchema.virtual('presentationCount').get(function() {
  return this.presentations ? this.presentations.length : 0;
});

// Virtual for session capacity status
sessionSchema.virtual('capacityStatus').get(function() {
  const count = this.presentationCount;
  if (count === 0) return 'empty';
  if (count <= 3) return 'light';
  if (count <= 5) return 'optimal';
  if (count <= 7) return 'full';
  return 'overloaded';
});

// Helper function to parse time strings like "9:00 AM"
function parseTime(timeStr) {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;
  
  if (period === 'PM' && hours !== 12) {
    totalMinutes += 12 * 60;
  } else if (period === 'AM' && hours === 12) {
    totalMinutes -= 12 * 60;
  }
  
  return totalMinutes;
}

// Static method to get program overview for a conference
sessionSchema.statics.getProgramOverview = function(conferenceId) {
  return this.aggregate([
    { $match: { conferenceId: mongoose.Types.ObjectId(conferenceId) } },
    {
      $lookup: {
        from: 'researchpresentations',
        localField: 'presentations',
        foreignField: '_id',
        as: 'presentationDetails'
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          track: "$track"
        },
        sessions: {
          $push: {
            _id: "$_id",
            sessionNumber: "$sessionNumber",
            title: "$title",
            category: "$category",
            startTime: "$startTime",
            endTime: "$endTime",
            location: "$location",
            chair: "$chair",
            moderators: "$moderators",
            presentationCount: { $size: "$presentationDetails" },
            status: "$status"
          }
        },
        totalSessions: { $sum: 1 },
        totalPresentations: { $sum: { $size: "$presentationDetails" } }
      }
    },
    {
      $sort: { "_id.date": 1, "_id.track": 1 }
    }
  ]);
};

// Static method to find scheduling conflicts
sessionSchema.statics.findSchedulingConflicts = function(conferenceId) {
  return this.aggregate([
    { $match: { conferenceId: mongoose.Types.ObjectId(conferenceId) } },
    {
      $group: {
        _id: {
          date: "$date",
          startTime: "$startTime",
          endTime: "$endTime"
        },
        sessions: {
          $push: {
            _id: "$_id",
            title: "$title",
            location: "$location.room"
          }
        },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { "_id.date": 1 } }
  ]);
};

// Instance method to check if session can accommodate more presentations
sessionSchema.methods.canAccommodateMore = function(maxPresentations = 6) {
  return this.presentations.length < maxPresentations;
};

// Instance method to get session timing details
sessionSchema.methods.getTimingDetails = function() {
  const start = parseTime(this.startTime);
  const end = parseTime(this.endTime);
  const duration = end - start;
  const presentationCount = this.presentations.length;
  
  return {
    duration: duration,
    durationFormatted: `${Math.floor(duration / 60)}h ${duration % 60}m`,
    avgTimePerPresentation: presentationCount > 0 ? Math.floor(duration / presentationCount) : 0,
    canFitMore: duration >= (presentationCount + 1) * 15, // Assuming 15 min per presentation
    recommendedPresentations: Math.floor(duration / 15)
  };
};

// Instance method to validate session scheduling
sessionSchema.methods.validateScheduling = function() {
  const issues = [];
  
  // Check for minimum duration
  const timing = this.getTimingDetails();
  if (timing.duration < 60) {
    issues.push('Session duration is less than 60 minutes');
  }
  
  // Check for too many presentations
  if (this.presentations.length > 6) {
    issues.push('Too many presentations for session duration');
  }
  
  // Check if chair/moderator is assigned
  if (!this.chair || !this.chair.name) {
    issues.push('No session chair assigned');
  }
  
  // Check location
  if (!this.location || !this.location.room) {
    issues.push('No room assigned');
  }
  
  return {
    isValid: issues.length === 0,
    issues: issues,
    recommendations: this.getRecommendations()
  };
};

// Instance method to get recommendations for session improvement
sessionSchema.methods.getRecommendations = function() {
  const recommendations = [];
  const timing = this.getTimingDetails();
  
  if (this.presentations.length === 0) {
    recommendations.push('Add research presentations to this session');
  }
  
  if (this.presentations.length < 3 && timing.duration >= 90) {
    recommendations.push('Consider adding more presentations or reducing session duration');
  }
  
  if (!this.moderators || this.moderators.length === 0) {
    recommendations.push('Assign a moderator to help manage Q&A and timing');
  }
  
  if (!this.description) {
    recommendations.push('Add a session description to help attendees understand the theme');
  }
  
  return recommendations;
};

module.exports = mongoose.model('Session', sessionSchema);
