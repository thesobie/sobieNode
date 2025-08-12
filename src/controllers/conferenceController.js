const ConferenceRegistration = require('../models/ConferenceRegistration');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { validationResult } = require('express-validator');

/**
 * Conference Registration Controller
 * Handles user registration for SOBIE conferences
 */

// Get current conference information
exports.getCurrentConference = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // For demo purposes, create current conference info
    const conferenceInfo = {
      year: currentYear,
      name: `SOBIE ${currentYear}`,
      startDate: new Date(`${currentYear}-10-15`), // October 15th
      endDate: new Date(`${currentYear}-10-17`),   // October 17th
      location: {
        venue: 'Grand Conference Center',
        city: 'Birmingham',
        state: 'Alabama',
        country: 'United States'
      },
      registrationDeadline: new Date(`${currentYear}-09-30`), // September 30th
      isActive: true,
      description: `Join us for the ${currentYear} Southern Business Information Exchange Conference`,
      keyFeatures: [
        'Research Presentations',
        'Keynote Speakers',
        'Networking Opportunities',
        'Professional Development',
        'Industry Panels'
      ],
      registrationFee: {
        required: false,
        amount: 0,
        currency: 'USD',
        note: 'Registration is currently free for all participants'
      }
    };

    res.json({
      success: true,
      data: {
        conference: conferenceInfo,
        registrationOpen: new Date() < conferenceInfo.registrationDeadline,
        daysUntilDeadline: Math.ceil((conferenceInfo.registrationDeadline - new Date()) / (1000 * 60 * 60 * 24))
      }
    });

  } catch (error) {
    console.error('Error getting current conference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conference information',
      error: error.message
    });
  }
};

// Get user's registration status for current conference
exports.getMyRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    const registration = await ConferenceRegistration.findOne({
      user: userId,
      'conference.year': currentYear
    }).populate('user', 'name email affiliation');

    if (!registration) {
      return res.json({
        success: true,
        data: {
          isRegistered: false,
          registration: null,
          message: 'You are not registered for the current conference'
        }
      });
    }

    res.json({
      success: true,
      data: {
        isRegistered: true,
        registration: registration.registrationSummary,
        fullRegistration: registration,
        canSubmitResearch: registration.canSubmitResearch()
      }
    });

  } catch (error) {
    console.error('Error getting user registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get registration status',
      error: error.message
    });
  }
};

// Get registration form with pre-filled user data
exports.getRegistrationForm = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Pre-fill form data from user profile
    const formData = {
      personalInfo: {
        firstName: user.name.firstName || '',
        lastName: user.name.lastName || '',
        email: user.email || '',
        phone: user.profile?.phone || ''
      },
      affiliation: {
        organization: user.affiliation?.organization || '',
        department: user.affiliation?.department || '',
        position: user.profile?.position || '',
        address: user.affiliation?.address || {}
      },
      professional: {
        discipline: user.profile?.discipline || '',
        academicLevel: user.profile?.academicLevel || '',
        yearsExperience: user.profile?.yearsExperience || 0,
        researchInterests: user.profile?.researchInterests || []
      }
    };

    // Form options for dropdowns
    const formOptions = {
      disciplines: [
        { value: 'accounting', label: 'Accounting' },
        { value: 'analytics', label: 'Analytics & Data Science' },
        { value: 'economics', label: 'Economics' },
        { value: 'finance', label: 'Finance' },
        { value: 'information_systems', label: 'Information Systems' },
        { value: 'international_business', label: 'International Business' },
        { value: 'management', label: 'Management' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'operations', label: 'Operations Management' },
        { value: 'entrepreneurship', label: 'Entrepreneurship' },
        { value: 'strategy', label: 'Strategy' },
        { value: 'other', label: 'Other' }
      ],
      academicLevels: [
        { value: 'undergraduate', label: 'Undergraduate Student' },
        { value: 'masters', label: 'Masters Student' },
        { value: 'doctoral', label: 'Doctoral Student' },
        { value: 'faculty', label: 'Faculty Member' },
        { value: 'professional', label: 'Industry Professional' },
        { value: 'other', label: 'Other' }
      ],
      attendanceTypes: [
        { value: 'in_person', label: 'In Person' },
        { value: 'virtual', label: 'Virtual' },
        { value: 'hybrid', label: 'Hybrid (In Person + Virtual)' }
      ],
      sessionInterests: [
        { value: 'keynote', label: 'Keynote Presentations' },
        { value: 'research_presentations', label: 'Research Presentations' },
        { value: 'panels', label: 'Industry Panels' },
        { value: 'workshops', label: 'Workshops' },
        { value: 'networking', label: 'Networking Events' },
        { value: 'poster_sessions', label: 'Poster Sessions' },
        { value: 'roundtables', label: 'Roundtable Discussions' },
        { value: 'special_sessions', label: 'Special Sessions' }
      ],
      howDidYouHear: [
        { value: 'colleague', label: 'Colleague Recommendation' },
        { value: 'website', label: 'SOBIE Website' },
        { value: 'social_media', label: 'Social Media' },
        { value: 'email', label: 'Email Newsletter' },
        { value: 'conference', label: 'Other Conference' },
        { value: 'academic_network', label: 'Academic Network' },
        { value: 'previous_attendee', label: 'Previous SOBIE Attendee' },
        { value: 'other', label: 'Other' }
      ]
    };

    res.json({
      success: true,
      data: {
        prefilledData: formData,
        formOptions: formOptions,
        userEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Error getting registration form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get registration form',
      error: error.message
    });
  }
};

// Submit conference registration
exports.submitRegistration = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    // Check if user is already registered
    const existingRegistration = await ConferenceRegistration.findOne({
      user: userId,
      'conference.year': currentYear
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this conference',
        data: {
          registration: existingRegistration.registrationSummary
        }
      });
    }

    // Verify user email is confirmed
    const user = await User.findById(userId);
    if (!user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email address before registering for the conference',
        requiresEmailVerification: true
      });
    }

    // Create registration
    const registrationData = {
      user: userId,
      conference: {
        year: currentYear,
        name: `SOBIE ${currentYear}`,
        startDate: new Date(`${currentYear}-10-15`),
        endDate: new Date(`${currentYear}-10-17`),
        location: {
          venue: 'Grand Conference Center',
          city: 'Birmingham',
          state: 'Alabama',
          country: 'United States'
        },
        registrationDeadline: new Date(`${currentYear}-09-30`),
        isActive: true
      },
      registrationInfo: req.body.registrationInfo,
      preferences: req.body.preferences || {},
      additionalInfo: req.body.additionalInfo || {},
      admin: {
        registeredBy: userId,
        reviewStatus: 'approved'
      }
    };

    const registration = new ConferenceRegistration(registrationData);
    await registration.save();

    // Populate user data for response
    await registration.populate('user', 'name email affiliation');

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Please check your email for confirmation instructions.',
      data: {
        registration: registration.registrationSummary,
        confirmationCode: registration.confirmation.code,
        emailSent: registration.confirmation.confirmationEmailSent,
        nextSteps: [
          'Check your email for confirmation instructions',
          'Click the confirmation link or enter the confirmation code',
          'Once confirmed, you can optionally submit research presentations',
          'You will receive conference updates via email'
        ]
      }
    });

  } catch (error) {
    console.error('Error submitting registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit registration',
      error: error.message
    });
  }
};

// Update registration (only if not confirmed)
exports.updateRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    const registration = await ConferenceRegistration.findOne({
      user: userId,
      'conference.year': currentYear
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.confirmation.isConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update registration after confirmation. Please contact support for changes.'
      });
    }

    // Update allowed fields
    if (req.body.registrationInfo) {
      registration.registrationInfo = { ...registration.registrationInfo, ...req.body.registrationInfo };
    }
    if (req.body.preferences) {
      registration.preferences = { ...registration.preferences, ...req.body.preferences };
    }
    if (req.body.additionalInfo) {
      registration.additionalInfo = { ...registration.additionalInfo, ...req.body.additionalInfo };
    }

    await registration.save();

    res.json({
      success: true,
      message: 'Registration updated successfully',
      data: {
        registration: registration.registrationSummary
      }
    });

  } catch (error) {
    console.error('Error updating registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update registration',
      error: error.message
    });
  }
};

// Confirm registration with code or token
exports.confirmRegistration = async (req, res) => {
  try {
    const { confirmationCode, confirmationToken } = req.body;

    let registration;

    if (confirmationToken) {
      registration = await ConferenceRegistration.findByConfirmationToken(confirmationToken);
    } else if (confirmationCode) {
      registration = await ConferenceRegistration.findByConfirmationCode(confirmationCode);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Confirmation code or token is required'
      });
    }

    if (!registration) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired confirmation code/token'
      });
    }

    if (registration.confirmation.isConfirmed) {
      return res.json({
        success: true,
        message: 'Registration is already confirmed',
        data: {
          registration: registration.registrationSummary,
          alreadyConfirmed: true
        }
      });
    }

    // Confirm the registration
    await registration.confirmRegistration();
    await registration.populate('user', 'name email affiliation');

    // Send confirmation success email
    try {
      await emailService.sendRegistrationConfirmed(registration);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Registration confirmed successfully! Welcome to SOBIE 2025!',
      data: {
        registration: registration.registrationSummary,
        canSubmitResearch: registration.canSubmitResearch(),
        nextSteps: [
          'Your conference registration is now confirmed',
          'You can now optionally submit research presentations',
          'Check your email for conference updates and details',
          'Download the conference app when available'
        ]
      }
    });

  } catch (error) {
    console.error('Error confirming registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm registration',
      error: error.message
    });
  }
};

// Resend confirmation email
exports.resendConfirmation = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    const registration = await ConferenceRegistration.findOne({
      user: userId,
      'conference.year': currentYear
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.confirmation.isConfirmed) {
      return res.json({
        success: true,
        message: 'Registration is already confirmed',
        data: { alreadyConfirmed: true }
      });
    }

    // Generate new confirmation code and token
    registration.generateNewConfirmationCode();
    registration.confirmation.confirmationEmailSent = false;
    await registration.save();

    // Send new confirmation email
    try {
      await emailService.sendRegistrationConfirmation(registration);
      registration.confirmation.confirmationEmailSent = true;
      registration.confirmation.confirmationEmailSentAt = new Date();
      await registration.save();
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send confirmation email'
      });
    }

    res.json({
      success: true,
      message: 'Confirmation email sent successfully',
      data: {
        confirmationCode: registration.confirmation.code,
        emailSent: true
      }
    });

  } catch (error) {
    console.error('Error resending confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend confirmation',
      error: error.message
    });
  }
};

// Cancel registration
exports.cancelRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();
    const { reason } = req.body;

    const registration = await ConferenceRegistration.findOne({
      user: userId,
      'conference.year': currentYear
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.status === 'cancelled') {
      return res.json({
        success: true,
        message: 'Registration is already cancelled',
        data: { alreadyCancelled: true }
      });
    }

    // Cancel the registration
    await registration.cancelRegistration(reason || 'User requested cancellation');

    // Send cancellation confirmation email
    try {
      await emailService.sendRegistrationCancelled(registration, reason);
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Registration cancelled successfully',
      data: {
        registration: registration.registrationSummary,
        cancellationReason: reason
      }
    });

  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel registration',
      error: error.message
    });
  }
};

// Get registration statistics (admin only)
exports.getRegistrationStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    const stats = await ConferenceRegistration.getRegistrationStats(year);
    
    res.json({
      success: true,
      data: {
        year: year,
        statistics: stats[0] || {
          total: 0,
          confirmed: 0,
          pending: 0,
          cancelled: 0,
          withResearchSubmissions: 0,
          firstTimeAttendees: 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting registration stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get registration statistics',
      error: error.message
    });
  }
};

// Get all registrations (admin only)
exports.getAllRegistrations = async (req, res) => {
  try {
    const {
      year = new Date().getFullYear(),
      status,
      discipline,
      attendanceType,
      confirmed,
      paymentStatus,
      page = 1,
      limit = 50
    } = req.query;

    const query = { 'conference.year': parseInt(year) };
    
    if (status) query.status = status;
    if (discipline) query['registrationInfo.professional.discipline'] = discipline;
    if (attendanceType) query['preferences.attendanceType'] = attendanceType;
    if (confirmed !== undefined) {
      query['confirmation.isConfirmed'] = confirmed === 'true';
    }
    if (paymentStatus) query['payment.status'] = paymentStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalRegistrations = await ConferenceRegistration.countDocuments(query);
    const totalPages = Math.ceil(totalRegistrations / parseInt(limit));

    const registrations = await ConferenceRegistration.find(query)
      .populate({
        path: 'user',
        select: 'name email affiliation profile'
      })
      .populate({
        path: 'payment.processedBy',
        select: 'name email'
      })
      .populate({
        path: 'payment.paymentHistory.processedBy',
        select: 'name email'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        registrations: registrations.map(reg => ({
          ...reg.registrationSummary,
          personalInfo: reg.registrationInfo.personalInfo,
          affiliation: reg.registrationInfo.affiliation,
          preferences: reg.preferences,
          additionalInfo: reg.additionalInfo,
          confirmation: {
            isConfirmed: reg.confirmation.isConfirmed,
            confirmedAt: reg.confirmation.confirmedAt,
            code: reg.confirmation.code
          },
          payment: reg.paymentSummary
        })),
        pagination: {
          page: parseInt(page),
          pages: totalPages,
          limit: parseInt(limit),
          total: totalRegistrations
        }
      }
    });

  } catch (error) {
    console.error('Error getting all registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get registrations',
      error: error.message
    });
  }
};

// Get payment details for a registration (user can view their own, admin can view all)
exports.getPaymentDetails = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles && req.user.roles.includes('admin');

    const query = { _id: registrationId };
    
    // Non-admin users can only view their own payment details
    if (!isAdmin) {
      query.user = userId;
    }

    const registration = await ConferenceRegistration.findOne(query)
      .populate('payment.processedBy', 'name email')
      .populate('payment.paymentHistory.processedBy', 'name email')
      .populate('payment.refund.refundProcessedBy', 'name email');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found or access denied'
      });
    }

    // Prepare payment details for response
    const paymentDetails = {
      ...registration.paymentSummary,
      paymentHistory: isAdmin ? registration.payment.paymentHistory : [],
      adminNotes: isAdmin ? registration.payment.adminNotes : undefined,
      internalNotes: isAdmin ? registration.payment.internalNotes : undefined,
      refundDetails: registration.payment.refund?.refundRequested ? {
        refundRequested: true,
        refundRequestedAt: registration.payment.refund.refundRequestedAt,
        refundReason: registration.payment.refund.refundReason,
        refundAmount: registration.payment.refund.refundAmount,
        refundProcessedAt: registration.payment.refund.refundProcessedAt,
        refundMethod: registration.payment.refund.refundMethod
      } : null
    };

    res.json({
      success: true,
      data: {
        registration: {
          id: registration._id,
          fullName: registration.fullName,
          email: registration.registrationInfo.personalInfo.email,
          conference: registration.conference.name,
          year: registration.conference.year
        },
        payment: paymentDetails
      }
    });

  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment details',
      error: error.message
    });
  }
};

// Update payment information (admin only)
exports.updatePayment = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const adminUserId = req.user.id;
    const {
      action,
      amount,
      paymentMethod,
      transactionDetails,
      discountData,
      refundData,
      notes,
      adminNotes
    } = req.body;

    const registration = await ConferenceRegistration.findById(registrationId)
      .populate('user', 'name email');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    let result;
    
    switch (action) {
      case 'set_payment_required':
        const { dueDate, category } = req.body;
        registration.setPaymentRequired(amount, new Date(dueDate), category);
        result = 'Payment requirement set';
        break;

      case 'waive_payment':
        registration.waivePayment(notes || 'Payment waived by administrator', adminUserId);
        result = 'Payment waived successfully';
        break;

      case 'record_payment':
        registration.recordPayment({
          amount,
          paymentMethod,
          transactionDetails,
          notes
        }, adminUserId);
        result = `Payment of $${amount} recorded`;
        break;

      case 'apply_discount':
        registration.applyDiscount(discountData, adminUserId);
        result = 'Discount applied successfully';
        break;

      case 'process_refund':
        registration.processRefund(refundData, adminUserId);
        result = `Refund of $${refundData.refundAmount} processed`;
        break;

      case 'update_notes':
        if (adminNotes !== undefined) registration.payment.adminNotes = adminNotes;
        if (notes !== undefined) registration.payment.internalNotes = notes;
        registration.payment.lastUpdatedBy = adminUserId;
        registration.payment.lastPaymentUpdate = new Date();
        result = 'Payment notes updated';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action specified'
        });
    }

    await registration.save();

    res.json({
      success: true,
      message: result,
      data: {
        payment: registration.paymentSummary,
        registration: registration.registrationSummary
      }
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment',
      error: error.message
    });
  }
};

// Get payment statistics (admin only)
exports.getPaymentStatistics = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    const stats = await ConferenceRegistration.aggregate([
      { $match: { 'conference.year': year } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          paymentRequired: {
            $sum: { $cond: ['$payment.required', 1, 0] }
          },
          paymentNotRequired: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'not_required'] }, 1, 0] }
          },
          paymentWaived: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'waived'] }, 1, 0] }
          },
          paymentPending: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'pending'] }, 1, 0] }
          },
          paymentPartial: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'partial'] }, 1, 0] }
          },
          paymentCompleted: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'completed'] }, 1, 0] }
          },
          paymentOverdue: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'overdue'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: '$payment.amounts.amountPaid'
          },
          totalOutstanding: {
            $sum: '$payment.amounts.amountDue'
          },
          totalDiscounts: {
            $sum: '$payment.amounts.discountAmount'
          },
          byCategory: {
            $push: '$payment.category'
          },
          byMethod: {
            $push: '$payment.paymentMethod'
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      paymentRequired: 0,
      paymentNotRequired: 0,
      paymentWaived: 0,
      paymentPending: 0,
      paymentPartial: 0,
      paymentCompleted: 0,
      paymentOverdue: 0,
      totalRevenue: 0,
      totalOutstanding: 0,
      totalDiscounts: 0,
      byCategory: [],
      byMethod: []
    };

    // Calculate category and method distributions
    const categoryStats = {};
    result.byCategory.forEach(cat => {
      if (cat) categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    });

    const methodStats = {};
    result.byMethod.forEach(method => {
      if (method) methodStats[method] = (methodStats[method] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        year: year,
        statistics: {
          total: result.total,
          paymentRequired: result.paymentRequired,
          paymentNotRequired: result.paymentNotRequired,
          paymentWaived: result.paymentWaived,
          paymentPending: result.paymentPending,
          paymentPartial: result.paymentPartial,
          paymentCompleted: result.paymentCompleted,
          paymentOverdue: result.paymentOverdue,
          totalRevenue: result.totalRevenue || 0,
          totalOutstanding: result.totalOutstanding || 0,
          totalDiscounts: result.totalDiscounts || 0,
          categoryDistribution: categoryStats,
          methodDistribution: methodStats,
          collectionRate: result.paymentRequired > 0 ? 
            ((result.paymentCompleted / result.paymentRequired) * 100).toFixed(2) : 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting payment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment statistics',
      error: error.message
    });
  }
};
