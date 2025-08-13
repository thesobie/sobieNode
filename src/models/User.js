const mongoose = require('mongoose');
const contentModerator = require('../utils/contentModeration');

const userSchema = new mongoose.Schema({
  // Basic Authentication
  email: {
    type: String,
    required: [true, 'Please provide a primary email'],
    unique: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email'
    ]
  },
  secondaryEmail: {
    type: String,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid secondary email'
    ]
  },
  password: {
    type: String,
    required: function() {
      return !this.magicLinkEnabled;
    },
    minlength: [8, 'Password must be at least 8 characters'],
    validate: {
      validator: function(password) {
        // Skip validation if password is already hashed (during user updates)
        if (password && password.startsWith('$2b$')) {
          return true;
        }
        
        // Password strength requirements
        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return strongPassword.test(password);
      },
      message: 'Password must contain at least 8 characters with: 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)'
    },
    select: false // Don't include password in queries by default
  },
  magicLinkEnabled: {
    type: Boolean,
    default: false
  },
  magicLinkToken: {
    type: String,
    select: false
  },
  magicLinkExpires: {
    type: Date,
    select: false
  },

  // Name Information
  name: {
    firstName: {
      type: String,
      required: [true, 'Please provide a first name'],
      trim: true,
      maxlength: [50, 'First name cannot be more than 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Please provide a last name'],
      trim: true,
      maxlength: [50, 'Last name cannot be more than 50 characters']
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: [50, 'Middle name cannot be more than 50 characters']
    },
    prefix: {
      type: String,
      enum: ['Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.', 'Mx.', 'other', ''],
      default: ''
    },
    prefixCustom: {
      type: String,
      trim: true,
      maxlength: [20, 'Custom prefix cannot be more than 20 characters']
      // Only used when prefix is 'other'
    },
    suffix: {
      type: String,
      enum: ['Jr.', 'Sr.', 'II', 'III', 'IV', 'Ph.D.', 'M.D.', 'J.D.', 'Ed.D.', 'M.A.', 'M.S.', 'B.A.', 'B.S.', 'other', ''],
      default: ''
    },
    suffixCustom: {
      type: String,
      trim: true,
      maxlength: [20, 'Custom suffix cannot be more than 20 characters']
      // Only used when suffix is 'other'
    },
    preferredName: {
      type: String,
      trim: true,
      maxlength: [50, 'Preferred name cannot be more than 50 characters']
    },
    pronouns: {
      type: String,
      enum: ['he/him', 'she/her', 'they/them', 'ze/zir', 'prefer not to say', 'other'],
      default: 'prefer not to say'
    },
    pronounsCustom: {
      type: String,
      trim: true,
      maxlength: [20, 'Custom pronouns cannot be more than 20 characters']
    }
  },

  // Conference Nametag Information
  nametag: {
    preferredSalutation: {
      type: String,
      trim: true,
      maxlength: [100, 'Preferred salutation cannot be more than 100 characters'],
      // This will be used for the conference nametag (e.g., "Dr. Smith")
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot be more than 100 characters']
      // Alternative display name for nametag if different from formal name
    }
  },

  // User Type and Role
  userType: {
    type: String,
    enum: ['student', 'academic', 'other'],
    required: [true, 'Please specify user type']
  },
  studentLevel: {
    type: String,
    enum: ['undergraduate', 'graduate', 'doctorate'],
    required: function() {
      return this.userType === 'student';
    }
  },
  
  // Application-level roles (system permissions)
  appRoles: {
    type: [String],
    enum: ['user', 'admin', 'developer'],
    default: ['user'],
    validate: {
      validator: function(roles) {
        // Ensure at least one app role is assigned
        return roles && roles.length > 0;
      },
      message: 'User must have at least one application role assigned'
    }
  },
  
  // SOBIE community roles (conference-specific)
  sobieRoles: {
    type: [String],
    enum: [
      'attendee',
      'researcher', 
      'presenter',
      'vendor',
      'volunteer',
      'session-chair',
      'panelist',
      'keynote-speaker',
      'activity-coordinator',
      'officer',
      'conference-chairperson',
      'editor',
      'reviewer',
      'in-memoriam'
    ],
    default: ['attendee'],
    validate: {
      validator: function(roles) {
        // Memorial users don't need other SOBIE roles
        if (roles.includes('in-memoriam')) {
          return true;
        }
        // Otherwise ensure at least one SOBIE role is assigned
        return roles && roles.length > 0;
      },
      message: 'User must have at least one SOBIE role assigned'
    }
  },
  
  // Role-specific metadata
  roleDetails: {
    // Officer details (when sobieRoles includes 'officer')
    officerRole: {
      type: String,
      enum: ['president', 'vice-president', 'treasurer', 'secretary', 'board-member'],
      required: function() {
        return this.sobieRoles && this.sobieRoles.includes('officer');
      }
    },
    
    // Activity coordinator details (when sobieRoles includes 'activity-coordinator')
    activityType: {
      type: String,
      enum: ['golf', 'trivia', 'volleyball', 'social-event', 'networking', 'other'],
      required: function() {
        return this.sobieRoles && this.sobieRoles.includes('activity-coordinator');
      }
    },
    
    // Custom activity type (when activityType is 'other')
    customActivityType: {
      type: String,
      trim: true,
      maxlength: [50, 'Custom activity type cannot exceed 50 characters'],
      required: function() {
        return this.roleDetails && this.roleDetails.activityType === 'other';
      }
    },
    
    // Years served in role (for officers, chairs, etc.)
    yearsServed: [{
      year: {
        type: Number,
        min: 2000,
        max: new Date().getFullYear() + 5
      },
      role: {
        type: String,
        enum: ['officer', 'conference-chairperson', 'editor', 'activity-coordinator', 'session-chair']
      },
      description: {
        type: String,
        trim: true,
        maxlength: [200, 'Role description cannot exceed 200 characters']
      }
    }]
  },

  // Legacy roles field (deprecated, keeping for backward compatibility)
  roles: {
    type: [String],
    enum: ['user', 'reviewer', 'committee', 'admin', 'editor', 'conference-chairperson', 'president', 'activity-coordinator', 'in-memoriam'],
    default: ['user'],
    validate: {
      validator: function(roles) {
        // Ensure at least one role is assigned
        return roles && roles.length > 0;
      },
      message: 'User must have at least one role assigned'
    }
  },

  // Affiliation Information
  affiliation: {
    organization: {
      type: String,
      required: [true, 'Please provide your organization/institution'],
      trim: true,
      maxlength: [200, 'Organization name cannot be more than 200 characters']
    },
    college: {
      type: String,
      trim: true,
      maxlength: [200, 'College name cannot be more than 200 characters']
    },
    department: {
      type: String,
      trim: true,
      maxlength: [200, 'Department name cannot be more than 200 characters']
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [100, 'Job title cannot be more than 100 characters']
      // e.g., "Associate Professor", "Manager", "President"
    },
    position: {
      type: String,
      trim: true,
      maxlength: [100, 'Position cannot be more than 100 characters']
      // Additional position information if needed
    }
  },

  // Contact Information
  contact: {
    phones: [{
      number: {
        type: String,
        required: true,
        trim: true,
        match: [/^\+?[\d\s\-\(\)\.]+$/, 'Please provide a valid phone number']
      },
      type: {
        type: String,
        enum: ['mobile', 'work', 'home'],
        required: true
      },
      primary: {
        type: Boolean,
        default: false
      }
    }],
    addresses: [{
      street: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Street address cannot be more than 200 characters']
      },
      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'City cannot be more than 100 characters']
      },
      state: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'State cannot be more than 50 characters']
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
        maxlength: [20, 'Zip code cannot be more than 20 characters']
      },
      country: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Country cannot be more than 100 characters']
      },
      type: {
        type: String,
        enum: ['work', 'home'],
        required: true
      },
      primary: {
        type: Boolean,
        default: false
      }
    }],
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please provide a valid website URL']
    },
    linkedIn: {
      type: String,
      trim: true
    },
    orcid: {
      type: String,
      trim: true,
      match: [/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'Please provide a valid ORCID ID (e.g., 0000-0000-0000-0000)']
    },
    googleScholar: {
      type: String,
      trim: true
    },
    researchGate: {
      type: String,
      trim: true
    },
    academia: {
      type: String,
      trim: true
    }
  },

  // Profile Information
  profile: {
    photo: {
      type: String,
      trim: true,
      // This will store the URL/path to the uploaded photo
      // Could be a cloud storage URL (AWS S3, Cloudinary, etc.) or local path
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot be more than 1000 characters']
    },
    interests: {
      type: [String],
      validate: {
        validator: function(v) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 interests'
      }
    },
    expertiseAreas: {
      type: [String],
      validate: {
        validator: function(v) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 expertise areas'
      }
    },
    socialLinks: {
      type: [{
        url: {
          type: String,
          required: true,
          trim: true,
          match: [/^https?:\/\/.+/, 'Please provide a valid URL starting with http:// or https://']
        },
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Link title cannot be more than 100 characters']
        },
        description: {
          type: String,
          trim: true,
          maxlength: [200, 'Link description cannot be more than 200 characters']
        },
        category: {
          type: String,
          enum: ['website', 'portfolio', 'github', 'publication', 'social', 'academic', 'blog', 'other'],
          default: 'other'
        },
        customCategory: {
          type: String,
          trim: true,
          maxlength: [50, 'Custom category name cannot be more than 50 characters'],
          // Only used when category is 'other'
        },
        isPublic: {
          type: Boolean,
          default: true
          // Individual privacy setting for each link
        }
      }],
      validate: {
        validator: function(v) {
          return !v || v.length <= 10;
        },
        message: 'Cannot have more than 10 social links'
      }
    }
  },

  // Conference Preferences
  preferences: {
    accessibility: {
      type: String,
      trim: true,
      maxlength: [500, 'Accessibility needs cannot be more than 500 characters']
    },
    newsletter: {
      type: Boolean,
      default: true
    },
    communicationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      textMessagesOk: { type: Boolean, default: false },
      emailCommunications: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: true }
    }
  },

  // SOBIE Participation Interest
  participationInterest: {
    conferenceTrackChair: { type: Boolean, default: false },
    panelParticipant: { type: Boolean, default: false },
    moderator: { type: Boolean, default: false },
    reviewer: { type: Boolean, default: false },
    socialEventCoordinator: { type: Boolean, default: false },
    editor: { type: Boolean, default: false },
    conferenceChairperson: { type: Boolean, default: false },
    presidentRole: { type: Boolean, default: false }
  },

  // Privacy Settings - what's visible to other SOBIE community members
  privacySettings: {
    name: { type: Boolean, default: true },
    photo: { type: Boolean, default: true },
    contactInfo: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      address: { type: Boolean, default: false }
    },
    bio: { type: Boolean, default: true },
    socialLinks: { type: Boolean, default: true },
    sobieHistory: {
      attendance: { type: Boolean, default: true },
      service: { type: Boolean, default: true },
      publications: { type: Boolean, default: true }
    },
    affiliation: { type: Boolean, default: true }
  },

  // SOBIE History (to be populated by other systems)
  sobieHistory: {
    attendance: [{
      year: { type: Number },
      role: { type: String }, // attendee, presenter, keynote, etc.
      sessionsAttended: [String]
    }],
    service: [{
      year: { type: Number },
      role: { type: String }, // reviewer, track chair, committee member, etc.
      description: { type: String }
    }],
    publications: [{
      year: { type: Number },
      title: { type: String },
      type: { type: String }, // paper, poster, presentation
      coAuthors: [String],
      abstract: { type: String }
    }]
  },

  // System Fields
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Memorial Fields for 'in-memoriam' users
  memorial: {
    dateOfPassing: {
      type: Date,
      required: function() {
        return this.roles && this.roles.includes('in-memoriam');
      }
    },
    memorialNote: {
      type: String,
      maxlength: [500, 'Memorial note cannot exceed 500 characters'],
      trim: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return this.roles && this.roles.includes('in-memoriam');
      }
    },
    addedDate: {
      type: Date,
      default: Date.now,
      required: function() {
        return this.roles && this.roles.includes('in-memoriam');
      }
    }
  },
  
  isHistoricalData: {
    type: Boolean,
    default: false,
    index: true
  },
  historicalDataSource: {
    type: String,
    enum: ['conference_papers', 'presentation_records', 'committee_lists', 'registration_data', 'manual_import', 'other'],
    required: function() {
      return this.isHistoricalData;
    }
  },
  historicalDataNotes: {
    type: String,
    maxlength: [500, 'Historical data notes cannot exceed 500 characters']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date
  },
  profileCreatedDate: {
    type: Date,
    default: Date.now
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for better query performance
userSchema.index({ createdAt: -1 });
userSchema.index({ 'affiliation.organization': 1 });
userSchema.index({ userType: 1 });
userSchema.index({ lastLogin: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  const { prefix, prefixCustom, firstName, middleName, lastName, suffix, suffixCustom } = this.name;
  let fullName = '';
  
  // Handle prefix (use custom if prefix is 'other')
  const displayPrefix = prefix === 'other' && prefixCustom ? prefixCustom : prefix;
  if (displayPrefix && displayPrefix !== '') fullName += displayPrefix + ' ';
  
  fullName += firstName;
  if (middleName) fullName += ' ' + middleName;
  fullName += ' ' + lastName;
  
  // Handle suffix (use custom if suffix is 'other')
  const displaySuffix = suffix === 'other' && suffixCustom ? suffixCustom : suffix;
  if (displaySuffix && displaySuffix !== '') fullName += ' ' + displaySuffix;
  
  return fullName.trim();
});

// Virtual for display name (used for nametags)
userSchema.virtual('displayNameForNametag').get(function() {
  if (this.nametag.preferredSalutation) {
    return this.nametag.preferredSalutation;
  }
  if (this.nametag.displayName) {
    return this.nametag.displayName;
  }
  return this.fullName;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for active user status (logged in within last 2 years)
userSchema.virtual('isActiveUser').get(function() {
  if (!this.lastLogin) return false;
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return this.lastLogin > twoYearsAgo;
});

// Virtual for username (email is the username)
userSchema.virtual('username').get(function() {
  return this.email;
});

// Virtual for primary phone
userSchema.virtual('primaryPhone').get(function() {
  if (!this.contact.phones || this.contact.phones.length === 0) return null;
  const primary = this.contact.phones.find(phone => phone.primary);
  return primary || this.contact.phones[0];
});

// Virtual for primary address
userSchema.virtual('primaryAddress').get(function() {
  if (!this.contact.addresses || this.contact.addresses.length === 0) return null;
  const primary = this.contact.addresses.find(address => address.primary);
  return primary || this.contact.addresses[0];
});

// Virtual for social link display category
userSchema.virtual('profile.socialLinks.displayCategory').get(function() {
  return this.category === 'other' && this.customCategory ? this.customCategory : this.category;
});

// Virtual for memorial status
userSchema.virtual('isInMemoriam').get(function() {
  return (this.roles && this.roles.includes('in-memoriam')) || 
         (this.sobieRoles && this.sobieRoles.includes('in-memoriam'));
});

// Virtual for memorial display information
userSchema.virtual('memorialDisplay').get(function() {
  if (!this.isInMemoriam || !this.memorial) return null;
  
  return {
    dateOfPassing: this.memorial.dateOfPassing,
    memorialNote: this.memorial.memorialNote,
    yearsPassed: this.memorial.dateOfPassing ? 
      new Date().getFullYear() - this.memorial.dateOfPassing.getFullYear() : null,
    formattedDate: this.memorial.dateOfPassing ? 
      this.memorial.dateOfPassing.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : null
  };
});

// Virtual methods for app role checking
userSchema.virtual('isAdmin').get(function() {
  return (this.roles && this.roles.includes('admin')) || 
         (this.appRoles && this.appRoles.includes('admin'));
});

userSchema.virtual('isDeveloper').get(function() {
  return this.appRoles && this.appRoles.includes('developer');
});

// Virtual methods for SOBIE role checking
userSchema.virtual('isAttendee').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('attendee');
});

userSchema.virtual('isPresenter').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('presenter');
});

userSchema.virtual('isResearcher').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('researcher');
});

userSchema.virtual('isVendor').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('vendor');
});

userSchema.virtual('isVolunteer').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('volunteer');
});

userSchema.virtual('isSessionChair').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('session-chair');
});

userSchema.virtual('isPanelist').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('panelist');
});

userSchema.virtual('isKeynoteSpeaker').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('keynote-speaker');
});

userSchema.virtual('isActivityCoordinator').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('activity-coordinator');
});

userSchema.virtual('isOfficer').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('officer');
});

userSchema.virtual('isConferenceChairperson').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('conference-chairperson');
});

userSchema.virtual('isEditor').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('editor');
});

userSchema.virtual('isReviewer').get(function() {
  return this.sobieRoles && this.sobieRoles.includes('reviewer');
});

// Virtual for role display information
userSchema.virtual('roleDisplay').get(function() {
  const display = {
    appRoles: this.appRoles || [],
    sobieRoles: this.sobieRoles || [],
    roleDetails: {}
  };

  // Add officer role details
  if (this.isOfficer && this.roleDetails && this.roleDetails.officerRole) {
    display.roleDetails.officerRole = this.roleDetails.officerRole;
  }

  // Add activity coordinator details
  if (this.isActivityCoordinator && this.roleDetails) {
    if (this.roleDetails.activityType) {
      display.roleDetails.activityType = this.roleDetails.activityType === 'other' && this.roleDetails.customActivityType ?
        this.roleDetails.customActivityType : this.roleDetails.activityType;
    }
  }

  // Add years served
  if (this.roleDetails && this.roleDetails.yearsServed && this.roleDetails.yearsServed.length > 0) {
    display.roleDetails.yearsServed = this.roleDetails.yearsServed;
  }

  return display;
});

userSchema.virtual('isEditor').get(function() {
  return this.roles && this.roles.includes('editor');
});

userSchema.virtual('isConferenceChairperson').get(function() {
  return this.roles && this.roles.includes('conference-chairperson');
});

userSchema.virtual('isPresident').get(function() {
  return this.roles && this.roles.includes('president');
});

userSchema.virtual('isReviewer').get(function() {
  return this.roles && this.roles.includes('reviewer');
});

userSchema.virtual('isCommitteeMember').get(function() {
  return this.roles && this.roles.includes('committee');
});

userSchema.virtual('isActivityCoordinator').get(function() {
  return this.roles && this.roles.includes('activity-coordinator');
});

// Virtual for primary role (highest priority role for display purposes)
userSchema.virtual('primaryRole').get(function() {
  if (!this.roles || this.roles.length === 0) return 'user';
  
  // Priority order: president > admin > conference-chairperson > editor > committee > reviewer > activity-coordinator > user
  const rolePriority = ['president', 'admin', 'conference-chairperson', 'editor', 'committee', 'reviewer', 'activity-coordinator', 'user'];
  
  for (const role of rolePriority) {
    if (this.roles.includes(role)) {
      return role;
    }
  }
  
  return this.roles[0]; // fallback to first role
});

// Instance method to check if user has specific role
userSchema.methods.hasRole = function(role) {
  return this.roles && this.roles.includes(role);
};

// Instance method to add role
userSchema.methods.addRole = function(role) {
  if (!this.roles) this.roles = [];
  if (!this.roles.includes(role)) {
    this.roles.push(role);
  }
  return this;
};

// Instance method to remove role
userSchema.methods.removeRole = function(role) {
  if (!this.roles) return this;
  this.roles = this.roles.filter(r => r !== role);
  // Ensure at least 'user' role remains
  if (this.roles.length === 0) {
    this.roles = ['user'];
  }
  return this;
};

// Instance method to get role display names
userSchema.methods.getRoleDisplayNames = function() {
  if (!this.roles) return ['User'];
  
  const roleDisplayMap = {
    'user': 'User',
    'reviewer': 'Reviewer',
    'committee': 'Committee Member',
    'admin': 'Administrator',
    'editor': 'Editor',
    'conference-chairperson': 'Conference Chairperson',
    'president': 'President',
    'activity-coordinator': 'Activity Coordinator'
  };
  
  return this.roles.map(role => roleDisplayMap[role] || role);
};

// Pre-save middleware to ensure only one primary phone/address
userSchema.pre('save', function(next) {
  // Content moderation checks
  const moderationErrors = [];

  // Check bio content
  if (this.profile.bio) {
    const bioCheck = contentModerator.checkContent(this.profile.bio);
    if (!bioCheck.isClean && bioCheck.severity === 'high') {
      moderationErrors.push('Bio contains inappropriate content that cannot be accepted.');
    } else if (!bioCheck.isClean && bioCheck.severity === 'medium') {
      // For medium severity, clean the content but warn
      this.profile.bio = bioCheck.cleanedText;
    }
  }

  // Check interests
  if (this.profile.interests && this.profile.interests.length > 0) {
    const interestsCheck = contentModerator.checkArray(this.profile.interests);
    if (!interestsCheck.isClean) {
      const severity = contentModerator.calculateSeverity(interestsCheck.violations);
      if (severity === 'high') {
        moderationErrors.push('One or more interests contain inappropriate content.');
      } else {
        this.profile.interests = interestsCheck.cleanedItems;
      }
    }
  }

  // Check expertise areas
  if (this.profile.expertiseAreas && this.profile.expertiseAreas.length > 0) {
    const expertiseCheck = contentModerator.checkArray(this.profile.expertiseAreas);
    if (!expertiseCheck.isClean) {
      const severity = contentModerator.calculateSeverity(expertiseCheck.violations);
      if (severity === 'high') {
        moderationErrors.push('One or more expertise areas contain inappropriate content.');
      } else {
        this.profile.expertiseAreas = expertiseCheck.cleanedItems;
      }
    }
  }

  // Check social links
  if (this.profile.socialLinks && this.profile.socialLinks.length > 0) {
    const socialLinksCheck = contentModerator.checkSocialLinks(this.profile.socialLinks);
    if (!socialLinksCheck.isClean) {
      const severity = contentModerator.calculateSeverity(socialLinksCheck.violations);
      if (severity === 'high') {
        moderationErrors.push('One or more social links contain inappropriate content.');
      } else {
        this.profile.socialLinks = socialLinksCheck.cleanedLinks;
      }
    }
  }

  // Check custom name fields
  if (this.name.prefixCustom) {
    const prefixCheck = contentModerator.checkContent(this.name.prefixCustom);
    if (!prefixCheck.isClean && prefixCheck.severity === 'high') {
      moderationErrors.push('Custom prefix contains inappropriate content.');
    } else if (!prefixCheck.isClean) {
      this.name.prefixCustom = prefixCheck.cleanedText;
    }
  }

  if (this.name.suffixCustom) {
    const suffixCheck = contentModerator.checkContent(this.name.suffixCustom);
    if (!suffixCheck.isClean && suffixCheck.severity === 'high') {
      moderationErrors.push('Custom suffix contains inappropriate content.');
    } else if (!suffixCheck.isClean) {
      this.name.suffixCustom = suffixCheck.cleanedText;
    }
  }

  if (this.name.pronounsCustom) {
    const pronounsCheck = contentModerator.checkContent(this.name.pronounsCustom);
    if (!pronounsCheck.isClean && pronounsCheck.severity === 'high') {
      moderationErrors.push('Custom pronouns contain inappropriate content.');
    } else if (!pronounsCheck.isClean) {
      this.name.pronounsCustom = pronounsCheck.cleanedText;
    }
  }

  // Check nametag fields
  if (this.nametag.preferredSalutation) {
    const salutationCheck = contentModerator.checkContent(this.nametag.preferredSalutation);
    if (!salutationCheck.isClean && salutationCheck.severity === 'high') {
      moderationErrors.push('Preferred salutation contains inappropriate content.');
    } else if (!salutationCheck.isClean) {
      this.nametag.preferredSalutation = salutationCheck.cleanedText;
    }
  }

  if (this.nametag.displayName) {
    const displayNameCheck = contentModerator.checkContent(this.nametag.displayName);
    if (!displayNameCheck.isClean && displayNameCheck.severity === 'high') {
      moderationErrors.push('Display name contains inappropriate content.');
    } else if (!displayNameCheck.isClean) {
      this.nametag.displayName = displayNameCheck.cleanedText;
    }
  }

  // Check job title and position
  if (this.affiliation.jobTitle) {
    const jobTitleCheck = contentModerator.checkContent(this.affiliation.jobTitle);
    if (!jobTitleCheck.isClean && jobTitleCheck.severity === 'high') {
      moderationErrors.push('Job title contains inappropriate content.');
    } else if (!jobTitleCheck.isClean) {
      this.affiliation.jobTitle = jobTitleCheck.cleanedText;
    }
  }

  if (this.affiliation.position) {
    const positionCheck = contentModerator.checkContent(this.affiliation.position);
    if (!positionCheck.isClean && positionCheck.severity === 'high') {
      moderationErrors.push('Position contains inappropriate content.');
    } else if (!positionCheck.isClean) {
      this.affiliation.position = positionCheck.cleanedText;
    }
  }

  // If there are high-severity violations, reject the save
  if (moderationErrors.length > 0) {
    return next(new Error('Content moderation failed: ' + moderationErrors.join(' ')));
  }

  // Validate social links - ensure customCategory is provided when category is 'other'
  if (this.profile.socialLinks && this.profile.socialLinks.length > 0) {
    for (let link of this.profile.socialLinks) {
      if (link.category === 'other' && (!link.customCategory || link.customCategory.trim() === '')) {
        return next(new Error('Custom category name is required when category is "other"'));
      }
    }
  }

  // Validate name fields - ensure custom values are provided when 'other' is selected
  if (this.name.prefix === 'other' && (!this.name.prefixCustom || this.name.prefixCustom.trim() === '')) {
    return next(new Error('Custom prefix is required when prefix is "other"'));
  }
  
  if (this.name.suffix === 'other' && (!this.name.suffixCustom || this.name.suffixCustom.trim() === '')) {
    return next(new Error('Custom suffix is required when suffix is "other"'));
  }

  if (this.name.pronouns === 'other' && (!this.name.pronounsCustom || this.name.pronounsCustom.trim() === '')) {
    return next(new Error('Custom pronouns are required when pronouns is "other"'));
  }

  // Ensure only one primary phone
  if (this.contact.phones && this.contact.phones.length > 0) {
    let primaryCount = 0;
    this.contact.phones.forEach((phone, index) => {
      if (phone.primary) {
        primaryCount++;
        if (primaryCount > 1) {
          phone.primary = false;
        }
      }
    });
    // If no primary set, make first one primary
    if (primaryCount === 0) {
      this.contact.phones[0].primary = true;
    }
  }

  // Ensure only one primary address
  if (this.contact.addresses && this.contact.addresses.length > 0) {
    let primaryCount = 0;
    this.contact.addresses.forEach((address, index) => {
      if (address.primary) {
        primaryCount++;
        if (primaryCount > 1) {
          address.primary = false;
        }
      }
    });
    // If no primary set, make first one primary
    if (primaryCount === 0) {
      this.contact.addresses[0].primary = true;
    }
  }

  next();
});

// Pre-save middleware to update lastLogin timestamp
userSchema.pre('save', function(next) {
  if (this.isModified('lastLogin')) {
    // Update isActive flag based on last login
    this.isActive = this.isActiveUser;
  }
  next();
});

// Pre-save middleware for role synchronization and validation
userSchema.pre('save', function(next) {
  // Sync legacy roles with new dual role system for backward compatibility
  if (this.isModified('roles') || this.isModified('appRoles') || this.isModified('sobieRoles')) {
    
    // If legacy roles are being set, sync to new system
    if (this.isModified('roles') && this.roles) {
      // Extract app roles from legacy roles
      const appRoles = this.roles.filter(role => ['user', 'admin', 'developer'].includes(role));
      if (appRoles.length > 0) {
        this.appRoles = [...new Set([...this.appRoles, ...appRoles])];
      }
      
      // Extract SOBIE roles from legacy roles
      const sobieRoleMapping = {
        'reviewer': 'reviewer',
        'committee': 'volunteer',
        'editor': 'editor',
        'conference-chairperson': 'conference-chairperson',
        'president': 'officer',
        'activity-coordinator': 'activity-coordinator',
        'in-memoriam': 'in-memoriam'
      };
      
      const sobieRoles = this.roles
        .map(role => sobieRoleMapping[role])
        .filter(role => role);
        
      if (sobieRoles.length > 0) {
        this.sobieRoles = [...new Set([...this.sobieRoles, ...sobieRoles])];
      }
      
      // Set officer role for president
      if (this.roles.includes('president')) {
        if (!this.roleDetails) this.roleDetails = {};
        this.roleDetails.officerRole = 'president';
      }
    }
    
    // Ensure default roles are set
    if (!this.appRoles || this.appRoles.length === 0) {
      this.appRoles = ['user'];
    }
    
    if (!this.sobieRoles || this.sobieRoles.length === 0) {
      // Don't set default SOBIE roles for memorial users
      if (!this.isInMemoriam) {
        this.sobieRoles = ['attendee'];
      }
    }
  }
  
  next();
});

// Pre-save middleware for memorial role validation
userSchema.pre('save', function(next) {
  const hasInMemoriamRole = (this.roles && this.roles.includes('in-memoriam')) ||
                           (this.sobieRoles && this.sobieRoles.includes('in-memoriam'));
  
  // If user has 'in-memoriam' role, ensure memorial fields are properly set
  if (hasInMemoriamRole) {
    if (!this.memorial) {
      this.memorial = {};
    }
    
    // Set defaults if not provided
    if (!this.memorial.addedDate) {
      this.memorial.addedDate = new Date();
    }
    
    // Validate required fields
    if (!this.memorial.dateOfPassing) {
      return next(new Error('Date of passing is required for in-memoriam users'));
    }
    
    if (!this.memorial.addedBy) {
      return next(new Error('Admin who added memorial status is required'));
    }
    
    // Ensure in-memoriam is in both role systems for consistency
    if (!this.roles.includes('in-memoriam')) {
      this.roles.push('in-memoriam');
    }
    if (!this.sobieRoles.includes('in-memoriam')) {
      this.sobieRoles.push('in-memoriam');
    }
    
    // Set user as inactive
    this.isActive = false;
  } else {
    // If user no longer has 'in-memoriam' role, clear memorial data
    if (this.memorial && Object.keys(this.memorial).length > 0) {
      this.memorial = undefined;
    }
  }
  
  next();
});

// Pre-save middleware for role-specific validation
userSchema.pre('save', function(next) {
  // Validate officer role details
  if (this.sobieRoles && this.sobieRoles.includes('officer')) {
    if (!this.roleDetails || !this.roleDetails.officerRole) {
      return next(new Error('Officer role details are required for officers'));
    }
  }
  
  // Validate activity coordinator details
  if (this.sobieRoles && this.sobieRoles.includes('activity-coordinator')) {
    if (!this.roleDetails || !this.roleDetails.activityType) {
      return next(new Error('Activity type is required for activity coordinators'));
    }
    
    if (this.roleDetails.activityType === 'other' && !this.roleDetails.customActivityType) {
      return next(new Error('Custom activity type is required when activity type is "other"'));
    }
  }
  
  next();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const bcrypt = require('bcryptjs');
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  const payload = {
    id: this._id,
    email: this.email,
    roles: this.roles,
    primaryRole: this.primaryRole
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Instance method to generate magic link token
userSchema.methods.generateMagicLinkToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  // Hash token and set to field
  this.magicLinkToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Set expire time (10 minutes)
  this.magicLinkExpires = Date.now() + 10 * 60 * 1000;
  
  return token;
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  // Hash token and set to field
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Set expire time (24 hours)
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  
  return token;
};

// Static method to find user by magic link token
userSchema.statics.findByMagicLinkToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return this.findOne({
    magicLinkToken: hashedToken,
    magicLinkExpires: { $gt: Date.now() }
  });
};

// Static method to find user by email verification token
userSchema.statics.findByEmailVerificationToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
};

// Static methods for memorial management
userSchema.statics.findMemorialUsers = function(options = {}) {
  const query = { 
    $or: [
      { roles: 'in-memoriam' },
      { sobieRoles: 'in-memoriam' }
    ]
  };
  
  // Add year filter if provided
  if (options.year) {
    const startOfYear = new Date(options.year, 0, 1);
    const endOfYear = new Date(options.year, 11, 31, 23, 59, 59);
    query['memorial.dateOfPassing'] = {
      $gte: startOfYear,
      $lte: endOfYear
    };
  }
  
  return this.find(query)
    .populate('memorial.addedBy', 'name.first name.last email')
    .sort({ 'memorial.dateOfPassing': -1 });
};

userSchema.statics.addMemorialStatus = async function(userId, memorialData, adminId) {
  const user = await this.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Add 'in-memoriam' role to both role systems for consistency
  if (!user.roles.includes('in-memoriam')) {
    user.roles.push('in-memoriam');
  }
  if (!user.sobieRoles.includes('in-memoriam')) {
    user.sobieRoles.push('in-memoriam');
  }
  
  // Set memorial data
  user.memorial = {
    dateOfPassing: memorialData.dateOfPassing,
    memorialNote: memorialData.memorialNote || '',
    addedBy: adminId,
    addedDate: new Date()
  };
  
  await user.save();
  return user;
};

userSchema.statics.removeMemorialStatus = async function(userId) {
  const user = await this.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Remove 'in-memoriam' role from both systems
  user.roles = user.roles.filter(role => role !== 'in-memoriam');
  user.sobieRoles = user.sobieRoles.filter(role => role !== 'in-memoriam');
  
  // Clear memorial data
  user.memorial = undefined;
  
  await user.save();
  return user;
};

userSchema.statics.getMemorialStats = function() {
  return this.aggregate([
    { 
      $match: { 
        $or: [
          { roles: 'in-memoriam' },
          { sobieRoles: 'in-memoriam' }
        ]
      }
    },
    {
      $group: {
        _id: null,
        totalMemorialUsers: { $sum: 1 },
        byYear: {
          $push: {
            year: { $year: '$memorial.dateOfPassing' },
            name: { $concat: ['$name.first', ' ', '$name.last'] }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalMemorialUsers: 1,
        byYear: {
          $reduce: {
            input: '$byYear',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[{
                    k: { $toString: '$$this.year' },
                    v: { $concatArrays: [
                      { $ifNull: [{ $objectToArray: '$$value' }, []] },
                      ['$$this.name']
                    ]}
                  }]]
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

// Static methods for role management
userSchema.statics.findByAppRole = function(roleName, options = {}) {
  const query = { appRoles: roleName };
  
  let queryBuilder = this.find(query);
  
  if (options.includeInactive) {
    // Include inactive users
  } else {
    queryBuilder = queryBuilder.where({ isActive: true });
  }
  
  if (options.populate) {
    queryBuilder = queryBuilder.populate(options.populate);
  }
  
  return queryBuilder.sort(options.sort || { createdAt: -1 });
};

userSchema.statics.findBySobieRole = function(roleName, options = {}) {
  const query = { sobieRoles: roleName };
  
  let queryBuilder = this.find(query);
  
  if (options.includeInactive) {
    // Include inactive users
  } else {
    queryBuilder = queryBuilder.where({ isActive: true });
  }
  
  if (options.populate) {
    queryBuilder = queryBuilder.populate(options.populate);
  }
  
  return queryBuilder.sort(options.sort || { createdAt: -1 });
};

userSchema.statics.findOfficers = function(officerRole = null) {
  const query = { sobieRoles: 'officer' };
  
  if (officerRole) {
    query['roleDetails.officerRole'] = officerRole;
  }
  
  return this.find(query)
    .where({ isActive: true })
    .select('name appRoles sobieRoles roleDetails affiliation')
    .sort({ 'roleDetails.yearsServed.year': -1 });
};

userSchema.statics.findActivityCoordinators = function(activityType = null) {
  const query = { sobieRoles: 'activity-coordinator' };
  
  if (activityType) {
    query['roleDetails.activityType'] = activityType;
  }
  
  return this.find(query)
    .where({ isActive: true })
    .select('name appRoles sobieRoles roleDetails contact')
    .sort({ 'name.last': 1 });
};

userSchema.statics.getRoleStatistics = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        appRoleStats: {
          $push: '$appRoles'
        },
        sobieRoleStats: {
          $push: '$sobieRoles'
        },
        officerRoles: {
          $push: {
            $cond: [
              { $in: ['officer', '$sobieRoles'] },
              '$roleDetails.officerRole',
              null
            ]
          }
        },
        activityTypes: {
          $push: {
            $cond: [
              { $in: ['activity-coordinator', '$sobieRoles'] },
              '$roleDetails.activityType',
              null
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalUsers: 1,
        appRoles: {
          $reduce: {
            input: '$appRoleStats',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: {
                    $map: {
                      input: '$$this',
                      in: {
                        k: '$$this',
                        v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' }}, 0] }, 1] }
                      }
                    }
                  }
                }
              ]
            }
          }
        },
        sobieRoles: {
          $reduce: {
            input: '$sobieRoleStats',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: {
                    $map: {
                      input: '$$this',
                      in: {
                        k: '$$this',
                        v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' }}, 0] }, 1] }
                      }
                    }
                  }
                }
              ]
            }
          }
        },
        officerBreakdown: {
          $arrayToObject: {
            $map: {
              input: {
                $setUnion: [{ $filter: { input: '$officerRoles', cond: { $ne: ['$$this', null] } } }]
              },
              in: {
                k: '$$this',
                v: {
                  $size: {
                    $filter: {
                      input: '$officerRoles',
                      cond: { $eq: ['$$this', '$$this'] }
                    }
                  }
                }
              }
            }
          }
        },
        activityBreakdown: {
          $arrayToObject: {
            $map: {
              input: {
                $setUnion: [{ $filter: { input: '$activityTypes', cond: { $ne: ['$$this', null] } } }]
              },
              in: {
                k: '$$this',
                v: {
                  $size: {
                    $filter: {
                      input: '$activityTypes',
                      cond: { $eq: ['$$this', '$$this'] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]);
};

userSchema.statics.updateUserRoles = async function(userId, roleUpdates) {
  const user = await this.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Update app roles if provided
  if (roleUpdates.appRoles) {
    user.appRoles = roleUpdates.appRoles;
  }
  
  // Update SOBIE roles if provided
  if (roleUpdates.sobieRoles) {
    user.sobieRoles = roleUpdates.sobieRoles;
  }
  
  // Update role details if provided
  if (roleUpdates.roleDetails) {
    user.roleDetails = { ...user.roleDetails, ...roleUpdates.roleDetails };
  }
  
  await user.save();
  return user;
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  return this.updateOne({ 
    lastLogin: new Date(),
    loginAttempts: 0,
    $unset: { lockUntil: 1 }
  });
};

// Method to get public profile based on privacy settings
userSchema.methods.getPublicProfile = function() {
  const profile = {
    _id: this._id,
    userType: this.userType,
    studentLevel: this.studentLevel
  };

  if (this.privacySettings.name) {
    profile.fullName = this.fullName;
    profile.displayNameForNametag = this.displayNameForNametag;
    // Handle pronouns display (use custom if pronouns is 'other')
    profile.pronouns = this.name.pronouns === 'other' && this.name.pronounsCustom ? 
      this.name.pronounsCustom : this.name.pronouns;
  }

  if (this.privacySettings.photo && this.profile.photo) {
    profile.photo = this.profile.photo;
  }

  if (this.privacySettings.affiliation) {
    profile.affiliation = this.affiliation;
  }

  if (this.privacySettings.bio) {
    profile.bio = this.profile.bio;
    profile.interests = this.profile.interests;
    profile.expertiseAreas = this.profile.expertiseAreas;
  }

  if (this.privacySettings.contactInfo.email) {
    profile.email = this.email;
  }

  if (this.privacySettings.contactInfo.phone && this.primaryPhone) {
    profile.phone = this.primaryPhone;
  }

  if (this.privacySettings.socialLinks) {
    // Filter social links to only include public ones
    const publicSocialLinks = this.profile.socialLinks ? 
      this.profile.socialLinks.filter(link => link.isPublic) : [];
    
    profile.socialLinks = {
      website: this.contact.website,
      linkedIn: this.contact.linkedIn,
      orcid: this.contact.orcid,
      googleScholar: this.contact.googleScholar,
      researchGate: this.contact.researchGate,
      academia: this.contact.academia,
      customLinks: publicSocialLinks
    };
  }

  if (this.privacySettings.sobieHistory.attendance) {
    profile.sobieAttendance = this.sobieHistory.attendance;
  }

  if (this.privacySettings.sobieHistory.service) {
    profile.sobieService = this.sobieHistory.service;
  }

  if (this.privacySettings.sobieHistory.publications) {
    profile.sobiePublications = this.sobieHistory.publications;
  }

  // Always include memorial information for 'in-memoriam' users
  if (this.isInMemoriam) {
    profile.memorial = this.memorialDisplay;
  }

  return profile;
};

// Method to run content moderation check on user profile
userSchema.methods.runContentModerationCheck = function() {
  const violations = [];
  const warnings = [];

  // Check bio
  if (this.profile.bio) {
    const bioCheck = contentModerator.checkContent(this.profile.bio);
    if (!bioCheck.isClean) {
      if (bioCheck.severity === 'high') {
        violations.push({ field: 'bio', severity: 'high', violations: bioCheck.violations });
      } else {
        warnings.push({ field: 'bio', severity: bioCheck.severity, violations: bioCheck.violations });
      }
    }
  }

  // Check interests
  if (this.profile.interests && this.profile.interests.length > 0) {
    const interestsCheck = contentModerator.checkArray(this.profile.interests);
    if (!interestsCheck.isClean) {
      const severity = contentModerator.calculateSeverity(interestsCheck.violations);
      if (severity === 'high') {
        violations.push({ field: 'interests', severity: 'high', violations: interestsCheck.violations });
      } else {
        warnings.push({ field: 'interests', severity, violations: interestsCheck.violations });
      }
    }
  }

  // Check expertise areas
  if (this.profile.expertiseAreas && this.profile.expertiseAreas.length > 0) {
    const expertiseCheck = contentModerator.checkArray(this.profile.expertiseAreas);
    if (!expertiseCheck.isClean) {
      const severity = contentModerator.calculateSeverity(expertiseCheck.violations);
      if (severity === 'high') {
        violations.push({ field: 'expertiseAreas', severity: 'high', violations: expertiseCheck.violations });
      } else {
        warnings.push({ field: 'expertiseAreas', severity, violations: expertiseCheck.violations });
      }
    }
  }

  // Check social links
  if (this.profile.socialLinks && this.profile.socialLinks.length > 0) {
    const socialLinksCheck = contentModerator.checkSocialLinks(this.profile.socialLinks);
    if (!socialLinksCheck.isClean) {
      const severity = contentModerator.calculateSeverity(socialLinksCheck.violations);
      if (severity === 'high') {
        violations.push({ field: 'socialLinks', severity: 'high', violations: socialLinksCheck.violations });
      } else {
        warnings.push({ field: 'socialLinks', severity, violations: socialLinksCheck.violations });
      }
    }
  }

  return {
    isClean: violations.length === 0 && warnings.length === 0,
    hasViolations: violations.length > 0,
    hasWarnings: warnings.length > 0,
    violations,
    warnings,
    userMessages: [
      ...violations.map(v => contentModerator.getViolationMessages(v.violations)).flat(),
      ...warnings.map(w => contentModerator.getViolationMessages(w.violations)).flat()
    ]
  };
};

// Transform output to remove sensitive fields and format response
userSchema.methods.toJSON = function() {
  const userObject = this.toObject({ virtuals: true });
  delete userObject.password;
  delete userObject.magicLinkToken;
  delete userObject.magicLinkExpires;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  delete userObject.__v;
  return userObject;
};

// Get user's research submissions (as author or co-author)
userSchema.methods.getResearchSubmissions = function(status = null) {
  const ResearchSubmission = mongoose.model('ResearchSubmission');
  return ResearchSubmission.getByUser(this._id, status);
};

// Get user's research submission statistics
userSchema.methods.getSubmissionStats = async function() {
  const ResearchSubmission = mongoose.model('ResearchSubmission');
  
  const [allSubmissions, published, underReview, drafts] = await Promise.all([
    ResearchSubmission.getByUser(this._id),
    ResearchSubmission.getByUser(this._id, 'accepted'),
    ResearchSubmission.getByUser(this._id, 'under_review'),
    ResearchSubmission.getByUser(this._id, 'draft')
  ]);
  
  // Count roles in submissions
  let asCorrespondingAuthor = 0;
  let asCoAuthor = 0;
  let asFacultyAdvisor = 0;
  
  for (const submission of allSubmissions) {
    // Check if user is corresponding author
    if (submission.correspondingAuthor.userId && 
        submission.correspondingAuthor.userId.toString() === this._id.toString()) {
      asCorrespondingAuthor++;
    }
    
    // Check if user is co-author
    const coAuthorEntry = submission.coAuthors.find(author => 
      author.userId && author.userId.toString() === this._id.toString()
    );
    if (coAuthorEntry) {
      asCoAuthor++;
    }
    
    // Check if user is faculty advisor/sponsor
    if (submission.facultySponsors && submission.facultySponsors.length > 0) {
      const facultyEntry = submission.facultySponsors.find(sponsor =>
        sponsor.userId && sponsor.userId.toString() === this._id.toString()
      );
      if (facultyEntry) {
        asFacultyAdvisor++;
      }
    }
  }
  
  return {
    total: allSubmissions.length,
    published: published.length,
    underReview: underReview.length,
    drafts: drafts.length,
    roles: {
      correspondingAuthor: asCorrespondingAuthor,
      coAuthor: asCoAuthor,
      facultyAdvisor: asFacultyAdvisor
    },
    // Additional useful stats
    yearsActive: [...new Set(allSubmissions.map(s => s.conferenceYear))].sort(),
    collaborators: this.getCollaboratorCount(allSubmissions)
  };
};

// Helper method to count unique collaborators
userSchema.methods.getCollaboratorCount = function(submissions) {
  const collaboratorEmails = new Set();
  
  for (const submission of submissions) {
    // Add corresponding author if not this user
    if (submission.correspondingAuthor.email && 
        submission.correspondingAuthor.email.toLowerCase() !== this.email.toLowerCase()) {
      collaboratorEmails.add(submission.correspondingAuthor.email.toLowerCase());
    }
    
    // Add co-authors if not this user
    for (const coAuthor of submission.coAuthors) {
      if (coAuthor.email && 
          coAuthor.email.toLowerCase() !== this.email.toLowerCase()) {
        collaboratorEmails.add(coAuthor.email.toLowerCase());
      }
    }
  }
  
  return collaboratorEmails.size;
};

// Link existing submissions to newly created user account
userSchema.methods.linkExistingSubmissions = async function() {
  const ResearchSubmission = mongoose.model('ResearchSubmission');
  
  console.log(`🔗 Linking existing submissions for new user: ${this.email}`);
  
  // Find submissions where this email appears as a co-author but without userId
  const submissionsToUpdate = await ResearchSubmission.find({
    $and: [
      {
        $or: [
          { 'coAuthors.email': { $regex: new RegExp(`^${this.email}$`, 'i') } },
          { 'facultySponsors.email': { $regex: new RegExp(`^${this.email}$`, 'i') } }
        ]
      },
      {
        $or: [
          { 'coAuthors.userId': { $exists: false } },
          { 'coAuthors.userId': null },
          { 'facultySponsors.userId': { $exists: false } },
          { 'facultySponsors.userId': null }
        ]
      }
    ]
  });
  
  let updatedCount = 0;
  
  for (const submission of submissionsToUpdate) {
    let submissionUpdated = false;
    
    // Update co-authors
    for (const coAuthor of submission.coAuthors) {
      if (coAuthor.email && 
          coAuthor.email.toLowerCase() === this.email.toLowerCase() && 
          !coAuthor.userId) {
        coAuthor.userId = this._id;
        submissionUpdated = true;
        console.log(`  📝 Linked co-author in submission ${submission.submissionNumber}`);
      }
    }
    
    // Update faculty sponsors
    if (submission.facultySponsors) {
      for (const sponsor of submission.facultySponsors) {
        if (sponsor.email && 
            sponsor.email.toLowerCase() === this.email.toLowerCase() && 
            !sponsor.userId) {
          sponsor.userId = this._id;
          submissionUpdated = true;
          console.log(`  👨‍🎓 Linked faculty sponsor in submission ${submission.submissionNumber}`);
        }
      }
    }
    
    // Add to associated users if linked
    if (submissionUpdated) {
      submission.addAssociatedUser(this._id, 'coauthor');
      await submission.save();
      updatedCount++;
    }
  }
  
  console.log(`✅ Linked ${updatedCount} existing submissions to user ${this.email}`);
  return updatedCount;
};

module.exports = mongoose.model('User', userSchema);
