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
    minlength: [6, 'Password must be at least 6 characters'],
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
  role: {
    type: String,
    enum: ['user', 'reviewer', 'committee', 'admin', 'editor', 'conference-chairperson', 'president'],
    default: 'user'
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

// Pre-save middleware to hash password (you'll implement this when adding JWT)
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   
//   const bcrypt = require('bcryptjs');
//   this.password = await bcrypt.hash(this.password, 12);
//   next();
// });

// Instance method to check password (for future JWT implementation)
// userSchema.methods.comparePassword = async function(candidatePassword) {
//   const bcrypt = require('bcryptjs');
//   return await bcrypt.compare(candidatePassword, this.password);
// };

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

module.exports = mongoose.model('User', userSchema);
