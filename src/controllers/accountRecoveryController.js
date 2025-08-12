const { asyncHandler } = require('../utils/asyncHandler');
const User = require('../models/User');
const authService = require('../services/authService');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// @desc    Search for existing user account by multiple criteria
// @route   POST /api/auth/find-account
// @access  Public
const findAccount = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    institution,
    affiliation,
    alternateEmail
  } = req.body;

  // Build search criteria - try multiple combinations
  const searchCriteria = [];

  // Search by exact email match (primary or secondary)
  if (email) {
    searchCriteria.push({
      $or: [
        { email: email.toLowerCase() },
        { secondaryEmail: email.toLowerCase() }
      ]
    });
  }

  // Search by alternate email in affiliation or other fields
  if (alternateEmail) {
    searchCriteria.push({
      $or: [
        { email: alternateEmail.toLowerCase() },
        { secondaryEmail: alternateEmail.toLowerCase() },
        { 'affiliation.email': alternateEmail.toLowerCase() }
      ]
    });
  }

  // Search by name combination
  if (firstName && lastName) {
    searchCriteria.push({
      'name.firstName': { $regex: new RegExp(firstName.trim(), 'i') },
      'name.lastName': { $regex: new RegExp(lastName.trim(), 'i') }
    });
  }

  // Search by institution/affiliation
  if (institution) {
    searchCriteria.push({
      $or: [
        { 'affiliation.institution': { $regex: new RegExp(institution.trim(), 'i') } },
        { 'affiliation.department': { $regex: new RegExp(institution.trim(), 'i') } },
        { 'affiliation.organizationName': { $regex: new RegExp(institution.trim(), 'i') } }
      ]
    });
  }

  if (searchCriteria.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide at least one search criterion (name, email, or institution)'
    });
  }

  try {
    // Find potential matches
    const potentialMatches = await User.find({
      $or: searchCriteria,
      isActive: true
    })
    .select('name email secondaryEmail affiliation nametag userType createdAt isHistoricalData')
    .limit(20);

    if (potentialMatches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No accounts found matching your search criteria. You may need to create a new account.',
        data: {
          matchesFound: 0,
          suggestions: [
            'Try different spelling variations of your name',
            'Check if you used a different email address',
            'Try searching with your institution name',
            'Contact support if you believe you should have an account'
          ]
        }
      });
    }

    // Score and rank matches
    const rankedMatches = potentialMatches.map(user => {
      let score = 0;
      let matchReasons = [];

      // Email exact match (highest score)
      if (email && (user.email === email.toLowerCase() || user.secondaryEmail === email.toLowerCase())) {
        score += 100;
        matchReasons.push('Email address match');
      }

      if (alternateEmail && (user.email === alternateEmail.toLowerCase() || user.secondaryEmail === alternateEmail.toLowerCase())) {
        score += 100;
        matchReasons.push('Alternate email match');
      }

      // Name exact match
      if (firstName && lastName) {
        const firstMatch = user.name.firstName.toLowerCase() === firstName.toLowerCase();
        const lastMatch = user.name.lastName.toLowerCase() === lastName.toLowerCase();
        
        if (firstMatch && lastMatch) {
          score += 80;
          matchReasons.push('Full name match');
        } else if (firstMatch || lastMatch) {
          score += 40;
          matchReasons.push('Partial name match');
        }
      }

      // Institution match
      if (institution) {
        const institutionLower = institution.toLowerCase();
        const userInstitution = user.affiliation?.institution?.toLowerCase() || '';
        const userDepartment = user.affiliation?.department?.toLowerCase() || '';
        const userOrg = user.affiliation?.organizationName?.toLowerCase() || '';

        if (userInstitution.includes(institutionLower) || institutionLower.includes(userInstitution)) {
          score += 30;
          matchReasons.push('Institution match');
        } else if (userDepartment.includes(institutionLower) || userOrg.includes(institutionLower)) {
          score += 20;
          matchReasons.push('Department/Organization match');
        }
      }

      return {
        user: {
          id: user._id,
          name: {
            firstName: user.name.firstName,
            lastName: user.name.lastName,
            preferredName: user.name.preferredName
          },
          email: user.email,
          // Mask secondary email for privacy
          secondaryEmail: user.secondaryEmail ? `${user.secondaryEmail.substring(0, 3)}***@${user.secondaryEmail.split('@')[1]}` : null,
          affiliation: {
            institution: user.affiliation?.institution,
            department: user.affiliation?.department,
            title: user.affiliation?.title
          },
          userType: user.userType,
          accountCreated: user.createdAt,
          isHistoricalData: user.isHistoricalData || false
        },
        matchScore: score,
        matchReasons,
        confidence: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'
      };
    });

    // Sort by score (highest first)
    rankedMatches.sort((a, b) => b.matchScore - a.matchScore);

    // Categorize results
    const highConfidence = rankedMatches.filter(m => m.confidence === 'high');
    const mediumConfidence = rankedMatches.filter(m => m.confidence === 'medium');
    const lowConfidence = rankedMatches.filter(m => m.confidence === 'low');

    res.json({
      success: true,
      message: `Found ${potentialMatches.length} potential account${potentialMatches.length > 1 ? 's' : ''} matching your search`,
      data: {
        totalMatches: potentialMatches.length,
        highConfidenceMatches: highConfidence,
        mediumConfidenceMatches: mediumConfidence,
        lowConfidenceMatches: lowConfidence,
        searchCriteria: {
          firstName,
          lastName,
          email: email ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : null,
          institution
        }
      }
    });

  } catch (error) {
    console.error('Account search error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while searching for accounts'
    });
  }
});

// @desc    Request account recovery for a specific user
// @route   POST /api/auth/recover-account
// @access  Public
const recoverAccount = asyncHandler(async (req, res) => {
  const { userId, email, recoveryMethod = 'magic_link' } = req.body;

  if (!userId || !email) {
    return res.status(400).json({
      success: false,
      message: 'User ID and email address are required'
    });
  }

  try {
    // Find the user and verify the email matches
    const user = await User.findOne({
      _id: userId,
      $or: [
        { email: email.toLowerCase() },
        { secondaryEmail: email.toLowerCase() }
      ],
      isActive: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or email does not match our records'
      });
    }

    let result;

    if (recoveryMethod === 'magic_link') {
      // Send magic link for passwordless login
      result = await authService.requestMagicLink(email.toLowerCase(), 'email');
      
      // Send a welcome back message
      await sendWelcomeBackMessage(user);
      
    } else if (recoveryMethod === 'password_reset') {
      // Send password reset link
      result = await authService.requestPasswordReset(email.toLowerCase());
      
      // Send a welcome back message
      await sendWelcomeBackMessage(user);
      
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid recovery method. Use "magic_link" or "password_reset"'
      });
    }

    res.json({
      success: true,
      message: `Account recovery ${recoveryMethod === 'magic_link' ? 'magic link' : 'password reset link'} sent successfully`,
      data: {
        recoveryMethod,
        email: `${email.substring(0, 3)}***@${email.split('@')[1]}`,
        userName: `${user.name.firstName} ${user.name.lastName}`,
        expiresIn: result.expiresIn,
        isHistoricalAccount: user.isHistoricalData || false
      }
    });

  } catch (error) {
    console.error('Account recovery error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during account recovery'
    });
  }
});

// @desc    Get account recovery options and instructions
// @route   GET /api/auth/recovery-info
// @access  Public
const getRecoveryInfo = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      searchOptions: {
        description: 'Find your existing SOBIE account using any of the following information:',
        criteria: [
          {
            field: 'firstName',
            label: 'First Name',
            required: false,
            description: 'Your first name as it appears in SOBIE records'
          },
          {
            field: 'lastName', 
            label: 'Last Name',
            required: false,
            description: 'Your last name as it appears in SOBIE records'
          },
          {
            field: 'email',
            label: 'Email Address',
            required: false,
            description: 'Any email address you may have used with SOBIE'
          },
          {
            field: 'institution',
            label: 'Institution/Organization',
            required: false,
            description: 'University, school, or organization you\'re affiliated with'
          },
          {
            field: 'alternateEmail',
            label: 'Alternate Email',
            required: false,
            description: 'Another email address you may have used'
          }
        ],
        tips: [
          'Provide at least one search criterion',
          'Try different combinations if no results are found',
          'Check spelling and try variations of your name',
          'Historical data may have different formatting'
        ]
      },
      recoveryMethods: [
        {
          method: 'magic_link',
          label: 'Magic Link (Recommended)',
          description: 'Receive a secure link via email to log in without a password',
          benefits: [
            'No need to remember or create a password',
            'Secure one-time access',
            'Quick and easy'
          ]
        },
        {
          method: 'password_reset',
          label: 'Password Reset',
          description: 'Set a new password for your account',
          benefits: [
            'Traditional login method',
            'Full account control',
            'Works for future logins'
          ]
        }
      ],
      historicalDataInfo: {
        description: 'Many accounts were created from historical SOBIE conference data',
        characteristics: [
          'Account created before user registration',
          'May have limited initial information',
          'Email addresses from conference submissions',
          'Names from published papers or presentations'
        ],
        nextSteps: [
          'Complete your profile after logging in',
          'Verify and update your contact information',
          'Add any missing affiliation details',
          'Set communication preferences'
        ]
      },
      support: {
        description: 'Need additional help finding your account?',
        options: [
          'Contact SOBIE support team',
          'Check with your institution\'s SOBIE representative',
          'Review old SOBIE conference emails',
          'Ask colleagues who may have your information'
        ],
        contactInfo: {
          email: 'support@sobie.org',
          subject: 'Account Recovery Assistance'
        }
      }
    }
  });
});

// @desc    Verify if an email exists in the system (privacy-friendly)
// @route   POST /api/auth/check-email
// @access  Public
const checkEmailExists = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required'
    });
  }

  try {
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { secondaryEmail: email.toLowerCase() }
      ],
      isActive: true
    }).select('_id isHistoricalData createdAt');

    if (user) {
      res.json({
        success: true,
        data: {
          exists: true,
          isHistoricalData: user.isHistoricalData || false,
          accountAge: user.createdAt ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null,
          message: 'An account with this email address exists. You can use account recovery to access it.'
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          exists: false,
          message: 'No account found with this email address. You can create a new account.'
        }
      });
    }

  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while checking the email'
    });
  }
});

// Helper function to send welcome back message
async function sendWelcomeBackMessage(user) {
  try {
    const message = new Message({
      subject: 'Welcome Back to SOBIE!',
      content: `Hello ${user.name.firstName},\n\nWelcome back to the SOBIE Conference system! We're excited to have you rejoin our community.\n\n${user.isHistoricalData ? 'We found your account from our historical conference data. ' : ''}Please take a moment to review and update your profile information to ensure you receive the latest conference updates.\n\nIf you have any questions or need assistance, please don't hesitate to reach out to our support team.\n\nBest regards,\nThe SOBIE Team`,
      messageType: 'direct',
      priority: 'normal',
      senderId: user._id,
      senderRole: 'system',
      recipients: [{
        userId: user._id,
        readStatus: 'unread'
      }],
      deliveryStatus: 'sent',
      totalRecipients: 1,
      actualSendTime: new Date()
    });

    await message.save();

    // Create welcome notification
    const notification = new Notification({
      title: 'Welcome Back to SOBIE!',
      message: 'Your account has been recovered. Please update your profile.',
      type: 'system',
      priority: 'normal',
      userId: user._id,
      sourceType: 'system',
      sourceId: user._id,
      sourceModel: 'User',
      messageId: message._id,
      actionRequired: true,
      actionType: 'view',
      actionUrl: '/profile',
      icon: 'user-check',
      color: 'green'
    });

    await notification.save();
  } catch (error) {
    console.error('Error sending welcome back message:', error);
  }
}

module.exports = {
  findAccount,
  recoverAccount,
  getRecoveryInfo,
  checkEmailExists
};
