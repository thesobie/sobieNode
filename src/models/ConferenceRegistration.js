const mongoose = require('mongoose');
const crypto = require('crypto');

const conferenceRegistrationSchema = new mongoose.Schema({
  // Conference Information
  conference: {
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear()
    },
    name: {
      type: String,
      required: true,
      default: function() {
        return `SOBIE ${this.conference?.year || new Date().getFullYear()}`;
      }
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    location: {
      venue: String,
      city: String,
      state: String,
      country: String
    },
    registrationDeadline: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },

  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Registration Details (populated from user profile but can be updated)
  registrationInfo: {
    personalInfo: {
      firstName: {
        type: String,
        required: true
      },
      lastName: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true,
        lowercase: true
      },
      phone: {
        type: String,
        required: false
      }
    },
    affiliation: {
      organization: {
        type: String,
        required: true
      },
      department: String,
      position: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
      }
    },
    professional: {
      discipline: {
        type: String,
        enum: [
          'accounting', 'analytics', 'economics', 'finance', 'information_systems',
          'international_business', 'management', 'marketing', 'operations',
          'entrepreneurship', 'strategy', 'other'
        ]
      },
      academicLevel: {
        type: String,
        enum: ['undergraduate', 'masters', 'doctoral', 'faculty', 'professional', 'other']
      },
      yearsExperience: Number,
      researchInterests: [String]
    }
  },

  // Registration Status and Workflow
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'waitlisted'],
    default: 'pending'
  },

  // Email Confirmation System
  confirmation: {
    code: {
      type: String,
      required: true,
      default: function() {
        return crypto.randomBytes(32).toString('hex').toUpperCase().substring(0, 8);
      }
    },
    isConfirmed: {
      type: Boolean,
      default: false
    },
    confirmedAt: Date,
    confirmationEmailSent: {
      type: Boolean,
      default: false
    },
    confirmationEmailSentAt: Date,
    confirmationAttempts: {
      type: Number,
      default: 0
    },
    confirmationToken: {
      type: String,
      default: function() {
        return crypto.randomBytes(64).toString('hex');
      }
    },
    confirmationTokenExpires: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      }
    }
  },

  // Registration Preferences
  preferences: {
    attendanceType: {
      type: String,
      enum: ['in_person', 'virtual', 'hybrid'],
      default: 'in_person'
    },
    sessionInterests: [{
      type: String,
      enum: [
        'keynote', 'research_presentations', 'panels', 'workshops', 
        'networking', 'poster_sessions', 'roundtables', 'special_sessions'
      ]
    }],
    dietaryRestrictions: [String],
    accessibilityNeeds: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String
    }
  },

  // Additional Information
  additionalInfo: {
    firstTimeAttendee: {
      type: Boolean,
      default: false
    },
    previousSOBIEYears: [Number],
    howDidYouHear: {
      type: String,
      enum: [
        'colleague', 'website', 'social_media', 'email', 'conference', 
        'academic_network', 'previous_attendee', 'other'
      ]
    },
    specialRequests: String,
    marketingOptIn: {
      type: Boolean,
      default: false
    }
  },

  // Payment Information
  payment: {
    required: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    status: {
      type: String,
      enum: ['not_required', 'waived', 'pending', 'partial', 'completed', 'overdue', 'refunded', 'cancelled'],
      default: 'not_required'
    },
    
    // Payment Method and Details
    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'credit_card', 'purchase_order', 'wire_transfer', 'waived', 'scholarship', 'other'],
      default: null
    },
    
    // Transaction Details
    transactionDetails: {
      transactionId: String,
      checkNumber: String,
      purchaseOrderNumber: String,
      creditCardLast4: String,
      authorizationCode: String,
      batchNumber: String,
      referenceNumber: String
    },
    
    // Payment Timeline
    dueDate: Date,
    paidAt: Date,
    processedAt: Date,
    
    // Amount Breakdown
    amounts: {
      baseAmount: {
        type: Number,
        default: 0
      },
      discountAmount: {
        type: Number,
        default: 0
      },
      taxAmount: {
        type: Number,
        default: 0
      },
      processingFeeAmount: {
        type: Number,
        default: 0
      },
      totalAmount: {
        type: Number,
        default: 0
      },
      amountPaid: {
        type: Number,
        default: 0
      },
      amountDue: {
        type: Number,
        default: 0
      }
    },
    
    // Payment Category and Discounts
    category: {
      type: String,
      enum: ['student', 'faculty', 'professional', 'member', 'non_member', 'speaker', 'sponsor', 'vendor'],
      default: 'professional'
    },
    
    discountApplied: {
      discountType: {
        type: String,
        enum: ['student', 'early_bird', 'member', 'group', 'speaker', 'sponsor', 'scholarship', 'waived', 'other']
      },
      discountCode: String,
      discountPercentage: Number,
      discountAmount: Number,
      discountReason: String
    },
    
    // Administrative Notes
    adminNotes: String,
    internalNotes: String,
    
    // Payment History
    paymentHistory: [{
      date: {
        type: Date,
        default: Date.now
      },
      action: {
        type: String,
        enum: ['payment_received', 'payment_processed', 'payment_refunded', 'payment_cancelled', 'status_updated', 'amount_adjusted']
      },
      amount: Number,
      method: String,
      details: String,
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      transactionId: String,
      notes: String
    }],
    
    // Refund Information
    refund: {
      refundRequested: {
        type: Boolean,
        default: false
      },
      refundRequestedAt: Date,
      refundReason: String,
      refundAmount: Number,
      refundProcessedAt: Date,
      refundTransactionId: String,
      refundMethod: String,
      refundProcessedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    
    // Processing Information
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastPaymentUpdate: {
      type: Date,
      default: Date.now
    }
  },

  // Research Submission Status (separate from registration)
  researchSubmission: {
    hasSubmitted: {
      type: Boolean,
      default: false
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchSubmission'
    },
    submissionStatus: {
      type: String,
      enum: ['not_submitted', 'submitted', 'under_review', 'accepted', 'rejected'],
      default: 'not_submitted'
    }
  },

  // Administrative Fields
  admin: {
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    tags: [String],
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'flagged', 'rejected'],
      default: 'approved'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
conferenceRegistrationSchema.index({ user: 1, 'conference.year': 1 }, { unique: true });
conferenceRegistrationSchema.index({ 'confirmation.confirmationToken': 1 });
conferenceRegistrationSchema.index({ 'confirmation.code': 1 });
conferenceRegistrationSchema.index({ status: 1 });
conferenceRegistrationSchema.index({ 'conference.year': 1, status: 1 });
conferenceRegistrationSchema.index({ createdAt: -1 });

// Virtual fields
conferenceRegistrationSchema.virtual('fullName').get(function() {
  return `${this.registrationInfo.personalInfo.firstName} ${this.registrationInfo.personalInfo.lastName}`;
});

conferenceRegistrationSchema.virtual('isConfirmationExpired').get(function() {
  return this.confirmation.confirmationTokenExpires < new Date();
});

conferenceRegistrationSchema.virtual('daysUntilConference').get(function() {
  if (!this.conference.startDate) return null;
  const now = new Date();
  const startDate = new Date(this.conference.startDate);
  const diffTime = startDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

conferenceRegistrationSchema.virtual('registrationSummary').get(function() {
  return {
    id: this._id,
    conference: this.conference.name,
    year: this.conference.year,
    status: this.status,
    confirmed: this.confirmation.isConfirmed,
    fullName: this.fullName,
    email: this.registrationInfo.personalInfo.email,
    organization: this.registrationInfo.affiliation.organization,
    attendanceType: this.preferences.attendanceType,
    registeredDate: this.createdAt,
    daysUntilConference: this.daysUntilConference,
    paymentStatus: this.payment.status,
    paymentRequired: this.payment.required,
    amountDue: this.payment.amounts.amountDue || 0,
    paymentMethod: this.payment.paymentMethod
  };
});

conferenceRegistrationSchema.virtual('paymentSummary').get(function() {
  return {
    required: this.payment.required,
    status: this.payment.status,
    amount: this.payment.amounts.totalAmount || 0,
    amountPaid: this.payment.amounts.amountPaid || 0,
    amountDue: this.payment.amounts.amountDue || 0,
    method: this.payment.paymentMethod,
    dueDate: this.payment.dueDate,
    paidAt: this.payment.paidAt,
    category: this.payment.category,
    discountApplied: this.payment.discountApplied?.discountType,
    transactionId: this.payment.transactionDetails?.transactionId,
    checkNumber: this.payment.transactionDetails?.checkNumber,
    purchaseOrderNumber: this.payment.transactionDetails?.purchaseOrderNumber,
    statusDisplay: this.getPaymentStatusDisplay()
  };
});

conferenceRegistrationSchema.virtual('isPaymentOverdue').get(function() {
  if (!this.payment.required || this.payment.status === 'completed' || this.payment.status === 'not_required' || this.payment.status === 'waived') {
    return false;
  }
  return this.payment.dueDate && new Date() > this.payment.dueDate;
});

// Instance methods
conferenceRegistrationSchema.methods.generateNewConfirmationCode = function() {
  this.confirmation.code = crypto.randomBytes(32).toString('hex').toUpperCase().substring(0, 8);
  this.confirmation.confirmationToken = crypto.randomBytes(64).toString('hex');
  this.confirmation.confirmationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  this.confirmation.confirmationAttempts = 0;
  return this.confirmation.code;
};

conferenceRegistrationSchema.methods.confirmRegistration = function() {
  this.confirmation.isConfirmed = true;
  this.confirmation.confirmedAt = new Date();
  this.status = 'confirmed';
  return this.save();
};

conferenceRegistrationSchema.methods.cancelRegistration = function(reason = '') {
  this.status = 'cancelled';
  this.admin.notes = this.admin.notes ? 
    `${this.admin.notes}\n\nCancelled: ${reason}` : 
    `Cancelled: ${reason}`;
  return this.save();
};

conferenceRegistrationSchema.methods.isRegistrationValid = function() {
  const now = new Date();
  return (
    this.status === 'confirmed' &&
    this.conference.isActive &&
    this.conference.registrationDeadline > now &&
    this.confirmation.isConfirmed
  );
};

conferenceRegistrationSchema.methods.canSubmitResearch = function() {
  return (
    this.isRegistrationValid() &&
    !this.researchSubmission.hasSubmitted
  );
};

// Payment Management Methods
conferenceRegistrationSchema.methods.getPaymentStatusDisplay = function() {
  const statusMap = {
    'not_required': 'Not Required',
    'waived': 'Waived',
    'pending': 'Payment Pending',
    'partial': 'Partially Paid',
    'completed': 'Paid in Full',
    'overdue': 'Overdue',
    'refunded': 'Refunded',
    'cancelled': 'Cancelled'
  };
  return statusMap[this.payment.status] || 'Unknown';
};

conferenceRegistrationSchema.methods.setPaymentRequired = function(amount, dueDate, category = 'professional') {
  this.payment.required = true;
  this.payment.amounts.baseAmount = amount;
  this.payment.amounts.totalAmount = amount;
  this.payment.amounts.amountDue = amount;
  this.payment.dueDate = dueDate;
  this.payment.category = category;
  this.payment.status = 'pending';
  this.payment.lastPaymentUpdate = new Date();
  return this;
};

conferenceRegistrationSchema.methods.waivePayment = function(reason, processedBy) {
  this.payment.status = 'waived';
  this.payment.required = false;
  this.payment.amounts.amountDue = 0;
  this.payment.discountApplied = {
    discountType: 'waived',
    discountReason: reason,
    discountAmount: this.payment.amounts.totalAmount || 0,
    discountPercentage: 100
  };
  this.payment.processedBy = processedBy;
  this.payment.lastPaymentUpdate = new Date();
  
  // Add to payment history
  this.payment.paymentHistory.push({
    action: 'status_updated',
    details: `Payment waived: ${reason}`,
    processedBy: processedBy,
    notes: reason
  });
  
  return this;
};

conferenceRegistrationSchema.methods.recordPayment = function(paymentData, processedBy) {
  const {
    amount,
    paymentMethod,
    transactionDetails = {},
    notes = ''
  } = paymentData;

  // Update payment amounts
  this.payment.amounts.amountPaid = (this.payment.amounts.amountPaid || 0) + amount;
  this.payment.amounts.amountDue = Math.max(0, (this.payment.amounts.totalAmount || 0) - this.payment.amounts.amountPaid);
  
  // Update payment method and transaction details
  this.payment.paymentMethod = paymentMethod;
  Object.assign(this.payment.transactionDetails, transactionDetails);
  
  // Update status
  if (this.payment.amounts.amountDue <= 0) {
    this.payment.status = 'completed';
    this.payment.paidAt = new Date();
  } else if (this.payment.amounts.amountPaid > 0) {
    this.payment.status = 'partial';
  }
  
  this.payment.processedBy = processedBy;
  this.payment.processedAt = new Date();
  this.payment.lastPaymentUpdate = new Date();
  
  // Add to payment history
  this.payment.paymentHistory.push({
    action: 'payment_received',
    amount: amount,
    method: paymentMethod,
    details: `Payment of $${amount} received via ${paymentMethod}`,
    processedBy: processedBy,
    transactionId: transactionDetails.transactionId,
    notes: notes
  });
  
  return this;
};

conferenceRegistrationSchema.methods.applyDiscount = function(discountData, processedBy) {
  const {
    discountType,
    discountCode,
    discountPercentage,
    discountAmount,
    discountReason
  } = discountData;

  // Calculate discount
  let finalDiscountAmount = discountAmount;
  if (discountPercentage && !discountAmount) {
    finalDiscountAmount = (this.payment.amounts.baseAmount || 0) * (discountPercentage / 100);
  }

  // Apply discount
  this.payment.discountApplied = {
    discountType,
    discountCode,
    discountPercentage,
    discountAmount: finalDiscountAmount,
    discountReason
  };

  // Update amounts
  this.payment.amounts.discountAmount = finalDiscountAmount;
  this.payment.amounts.totalAmount = Math.max(0, (this.payment.amounts.baseAmount || 0) - finalDiscountAmount);
  this.payment.amounts.amountDue = Math.max(0, this.payment.amounts.totalAmount - (this.payment.amounts.amountPaid || 0));
  
  // Update status if now free
  if (this.payment.amounts.totalAmount <= 0) {
    this.payment.status = 'not_required';
    this.payment.required = false;
  }
  
  this.payment.lastUpdatedBy = processedBy;
  this.payment.lastPaymentUpdate = new Date();
  
  // Add to payment history
  this.payment.paymentHistory.push({
    action: 'amount_adjusted',
    amount: -finalDiscountAmount,
    details: `Discount applied: ${discountType} - $${finalDiscountAmount}`,
    processedBy: processedBy,
    notes: discountReason
  });
  
  return this;
};

conferenceRegistrationSchema.methods.processRefund = function(refundData, processedBy) {
  const {
    refundAmount,
    refundReason,
    refundMethod,
    refundTransactionId
  } = refundData;

  this.payment.refund = {
    refundRequested: true,
    refundRequestedAt: this.payment.refund.refundRequestedAt || new Date(),
    refundReason,
    refundAmount,
    refundProcessedAt: new Date(),
    refundTransactionId,
    refundMethod,
    refundProcessedBy: processedBy
  };

  // Update payment amounts
  this.payment.amounts.amountPaid = Math.max(0, (this.payment.amounts.amountPaid || 0) - refundAmount);
  this.payment.amounts.amountDue = (this.payment.amounts.totalAmount || 0) - this.payment.amounts.amountPaid;
  
  // Update status
  if (refundAmount >= (this.payment.amounts.totalAmount || 0)) {
    this.payment.status = 'refunded';
  } else if (this.payment.amounts.amountPaid > 0) {
    this.payment.status = 'partial';
  } else {
    this.payment.status = 'pending';
  }
  
  this.payment.lastUpdatedBy = processedBy;
  this.payment.lastPaymentUpdate = new Date();
  
  // Add to payment history
  this.payment.paymentHistory.push({
    action: 'payment_refunded',
    amount: -refundAmount,
    method: refundMethod,
    details: `Refund of $${refundAmount} processed via ${refundMethod}`,
    processedBy: processedBy,
    transactionId: refundTransactionId,
    notes: refundReason
  });
  
  return this;
};

// Static methods
conferenceRegistrationSchema.statics.getCurrentConference = function() {
  const currentYear = new Date().getFullYear();
  return this.findOne({
    'conference.year': currentYear,
    'conference.isActive': true
  }).sort({ 'conference.startDate': -1 });
};

conferenceRegistrationSchema.statics.getRegistrationStats = function(year) {
  const matchYear = year || new Date().getFullYear();
  
  return this.aggregate([
    { $match: { 'conference.year': matchYear } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        confirmed: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        withResearchSubmissions: {
          $sum: { $cond: ['$researchSubmission.hasSubmitted', 1, 0] }
        },
        byAttendanceType: {
          $push: '$preferences.attendanceType'
        },
        byDiscipline: {
          $push: '$registrationInfo.professional.discipline'
        },
        firstTimeAttendees: {
          $sum: { $cond: ['$additionalInfo.firstTimeAttendee', 1, 0] }
        }
      }
    }
  ]);
};

conferenceRegistrationSchema.statics.findByConfirmationToken = function(token) {
  return this.findOne({
    'confirmation.confirmationToken': token,
    'confirmation.confirmationTokenExpires': { $gt: new Date() }
  });
};

conferenceRegistrationSchema.statics.findByConfirmationCode = function(code) {
  return this.findOne({
    'confirmation.code': code.toUpperCase(),
    'confirmation.confirmationTokenExpires': { $gt: new Date() }
  });
};

// Pre-save middleware
conferenceRegistrationSchema.pre('save', function(next) {
  // Ensure confirmation code is uppercase
  if (this.confirmation.code) {
    this.confirmation.code = this.confirmation.code.toUpperCase();
  }
  
  // Auto-approve registration by default
  if (this.isNew && !this.admin.reviewStatus) {
    this.admin.reviewStatus = 'approved';
  }
  
  next();
});

// Post-save middleware for sending emails
conferenceRegistrationSchema.post('save', async function(doc, next) {
  // Send confirmation email for new registrations
  if (doc.isNew && !doc.confirmation.confirmationEmailSent) {
    try {
      const emailService = require('../services/emailService');
      await emailService.sendRegistrationConfirmation(doc);
      
      doc.confirmation.confirmationEmailSent = true;
      doc.confirmation.confirmationEmailSentAt = new Date();
      await doc.save();
    } catch (error) {
      console.error('Failed to send registration confirmation email:', error);
    }
  }
  
  next();
});

const ConferenceRegistration = mongoose.model('ConferenceRegistration', conferenceRegistrationSchema);

module.exports = ConferenceRegistration;
