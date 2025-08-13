const mongoose = require('mongoose');

/**
 * Social Event Model
 * Manages social events, networking sessions, banquets, and receptions for conferences
 */

const socialEventSchema = new mongoose.Schema({
  // Basic Event Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  eventType: {
    type: String,
    enum: [
      'banquet',
      'reception', 
      'networking',
      'welcome-reception',
      'closing-ceremony',
      'award-ceremony',
      'coffee-break',
      'lunch',
      'dinner',
      'cocktail-hour',
      'poster-session',
      'social-outing',
      'cultural-event'
    ],
    required: true
  },
  
  // Conference Association
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: true
  },
  
  // Schedule Information
  schedule: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    timeZone: {
      type: String,
      default: 'America/New_York'
    },
    duration: {
      type: Number, // minutes
      required: true
    }
  },
  
  // Location Details
  venue: {
    name: {
      type: String,
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    room: String,
    capacity: {
      type: Number,
      required: true
    },
    layout: {
      type: String,
      enum: ['theater', 'banquet', 'reception', 'classroom', 'cocktail', 'outdoor'],
      default: 'reception'
    }
  },
  
  // Registration and RSVPs
  registration: {
    required: {
      type: Boolean,
      default: false
    },
    deadline: Date,
    isPublic: {
      type: Boolean,
      default: true
    },
    allowGuestPlusOne: {
      type: Boolean,
      default: false
    },
    maxGuestsPerAttendee: {
      type: Number,
      default: 0
    }
  },
  
  // Attendees and RSVPs
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rsvpStatus: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'waitlist'],
      default: 'pending'
    },
    rsvpDate: {
      type: Date,
      default: Date.now
    },
    guestCount: {
      type: Number,
      default: 0
    },
    guests: [{
      name: String,
      relationship: String,
      dietaryRestrictions: [String]
    }],
    dietaryRestrictions: [String],
    specialRequests: String,
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkInTime: Date
  }],
  
  // Catering and Menu
  catering: {
    cateringCompany: String,
    menuType: {
      type: String,
      enum: ['buffet', 'plated', 'cocktail', 'coffee-service', 'none'],
      default: 'buffet'
    },
    menu: [{
      course: {
        type: String,
        enum: ['appetizer', 'main', 'dessert', 'beverage', 'snack']
      },
      items: [String],
      dietaryOptions: {
        vegetarian: Boolean,
        vegan: Boolean,
        glutenFree: Boolean,
        kosher: Boolean,
        halal: Boolean
      }
    }],
    estimatedCostPerPerson: Number,
    totalEstimatedCost: Number
  },
  
  // Entertainment and Activities
  activities: [{
    activityType: {
      type: String,
      enum: ['speaker', 'entertainment', 'networking', 'awards', 'games', 'tour']
    },
    title: String,
    description: String,
    startTime: Date,
    duration: Number, // minutes
    presenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Sponsors and Partners
  sponsors: [{
    sponsorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Could be organization user
    },
    sponsorName: String,
    sponsorshipLevel: {
      type: String,
      enum: ['title', 'presenting', 'platinum', 'gold', 'silver', 'bronze', 'supporting']
    },
    contribution: {
      monetary: Number,
      inkind: String
    },
    benefits: [String]
  }],
  
  // Communication
  communications: [{
    type: {
      type: String,
      enum: ['invitation', 'reminder', 'update', 'thank-you']
    },
    subject: String,
    message: String,
    sentDate: Date,
    recipients: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      emailStatus: {
        type: String,
        enum: ['sent', 'delivered', 'opened', 'clicked', 'bounced'],
        default: 'sent'
      }
    }]
  }],
  
  // Photography and Media
  media: {
    photographyAllowed: {
      type: Boolean,
      default: true
    },
    photographer: String,
    mediaReleaseRequired: {
      type: Boolean,
      default: false
    },
    socialMediaHashtag: String,
    liveStreamUrl: String
  },
  
  // Budget and Finance
  budget: {
    totalBudget: Number,
    expenses: [{
      category: {
        type: String,
        enum: ['venue', 'catering', 'entertainment', 'decoration', 'equipment', 'staff', 'marketing', 'other']
      },
      description: String,
      estimatedCost: Number,
      actualCost: Number,
      vendor: String,
      paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'overdue']
      }
    }],
    revenue: [{
      source: {
        type: String,
        enum: ['registration-fees', 'sponsorship', 'ticket-sales', 'other']
      },
      amount: Number,
      description: String
    }]
  },
  
  // Event Status and Settings
  status: {
    type: String,
    enum: ['draft', 'published', 'registration-open', 'registration-closed', 'in-progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  settings: {
    sendReminderEmails: {
      type: Boolean,
      default: true
    },
    reminderSchedule: [{
      daysBefore: Number,
      message: String
    }],
    requirePhotoConsent: {
      type: Boolean,
      default: false
    },
    allowRsvpChanges: {
      type: Boolean,
      default: true
    },
    rsvpChangeDeadline: Date
  },
  
  // Feedback and Evaluation
  feedback: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    suggestions: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Networking Features
  networking: {
    enableNetworking: {
      type: Boolean,
      default: true
    },
    iceBreakers: [String],
    networkingGoals: [String],
    meetingRooms: [{
      name: String,
      capacity: Number,
      equipment: [String]
    }]
  },
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
socialEventSchema.index({ conferenceId: 1, eventType: 1 });
socialEventSchema.index({ 'schedule.startDate': 1 });
socialEventSchema.index({ status: 1 });
socialEventSchema.index({ 'attendees.userId': 1 });

// Virtuals
socialEventSchema.virtual('totalAttendees').get(function() {
  return this.attendees.filter(attendee => attendee.rsvpStatus === 'accepted').length;
});

socialEventSchema.virtual('totalGuests').get(function() {
  return this.attendees.reduce((total, attendee) => {
    return total + (attendee.rsvpStatus === 'accepted' ? attendee.guestCount : 0);
  }, 0);
});

socialEventSchema.virtual('capacityRemaining').get(function() {
  return this.venue.capacity - this.totalAttendees - this.totalGuests;
});

socialEventSchema.virtual('isAtCapacity').get(function() {
  return this.capacityRemaining <= 0;
});

socialEventSchema.virtual('rsvpDeadlinePassed').get(function() {
  return this.registration.deadline && new Date() > this.registration.deadline;
});

// Methods
socialEventSchema.methods.addAttendee = function(userId, guestCount = 0) {
  const existingAttendee = this.attendees.find(attendee => 
    attendee.userId.toString() === userId.toString()
  );
  
  if (existingAttendee) {
    throw new Error('User is already registered for this event');
  }
  
  if (this.totalAttendees + this.totalGuests + 1 + guestCount > this.venue.capacity) {
    throw new Error('Event is at capacity');
  }
  
  this.attendees.push({
    userId,
    guestCount,
    rsvpStatus: 'accepted'
  });
  
  return this.save();
};

socialEventSchema.methods.updateRsvp = function(userId, status, guestCount) {
  const attendee = this.attendees.find(attendee => 
    attendee.userId.toString() === userId.toString()
  );
  
  if (!attendee) {
    throw new Error('User is not registered for this event');
  }
  
  attendee.rsvpStatus = status;
  if (guestCount !== undefined) {
    attendee.guestCount = guestCount;
  }
  attendee.rsvpDate = new Date();
  
  return this.save();
};

socialEventSchema.methods.checkInAttendee = function(userId) {
  const attendee = this.attendees.find(attendee => 
    attendee.userId.toString() === userId.toString()
  );
  
  if (!attendee) {
    throw new Error('User is not registered for this event');
  }
  
  if (attendee.rsvpStatus !== 'accepted') {
    throw new Error('User has not accepted the invitation');
  }
  
  attendee.checkedIn = true;
  attendee.checkInTime = new Date();
  
  return this.save();
};

socialEventSchema.methods.getDietaryRestrictionsSummary = function() {
  const restrictions = {};
  
  this.attendees.forEach(attendee => {
    if (attendee.rsvpStatus === 'accepted') {
      attendee.dietaryRestrictions.forEach(restriction => {
        restrictions[restriction] = (restrictions[restriction] || 0) + 1;
      });
      
      attendee.guests.forEach(guest => {
        guest.dietaryRestrictions.forEach(restriction => {
          restrictions[restriction] = (restrictions[restriction] || 0) + 1;
        });
      });
    }
  });
  
  return restrictions;
};

// Middleware
socialEventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

socialEventSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('SocialEvent', socialEventSchema);
