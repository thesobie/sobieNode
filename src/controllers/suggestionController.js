const UserSuggestion = require('../models/UserSuggestion');
const User = require('../models/User');
const ResearchPresentation = require('../models/ResearchPresentation');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendEmail } = require('../services/emailService');

// @desc    Submit a new suggestion
// @route   POST /api/suggestions
// @access  Private
const submitSuggestion = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    suggestionType,
    targetType,
    targetId,
    title,
    description,
    suggestedChanges,
    priority,
    category,
    contactPreference,
    allowPublicContact,
    tags
  } = req.body;

  // Validate required fields
  if (!suggestionType || !targetType || !title || !description) {
    return res.status(400).json({
      success: false,
      message: 'Suggestion type, target type, title, and description are required'
    });
  }

  // Create the suggestion
  const suggestion = new UserSuggestion({
    submittedBy: userId,
    submitterEmail: req.user.email,
    submitterName: {
      firstName: req.user.name?.firstName,
      lastName: req.user.name?.lastName
    },
    suggestionType,
    targetType,
    targetId,
    targetModel: targetType === 'presentation' ? 'ResearchPresentation' : 
                  targetType === 'user' ? 'User' : 
                  targetType === 'conference' ? 'Conference' : 
                  targetType === 'session' ? 'Session' : undefined,
    title,
    description,
    suggestedChanges,
    priority,
    category,
    contactPreference,
    allowPublicContact,
    tags: tags || []
  });

  await suggestion.save();

  // Populate the saved suggestion for response
  await suggestion.populate('submittedBy', 'name email affiliation');

  // Send notification to admins
  try {
    const admins = await User.find({ roles: 'admin' });
    const adminEmails = admins.map(admin => admin.email);
    
    await sendEmail({
      to: adminEmails,
      subject: `New SOBIE Suggestion: ${title}`,
      html: `
        <h2>New Suggestion Submitted</h2>
        <p><strong>From:</strong> ${suggestion.submitterFullName} (${req.user.email})</p>
        <p><strong>Type:</strong> ${suggestionType}</p>
        <p><strong>Priority:</strong> ${priority || 'medium'}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Description:</strong></p>
        <p>${description}</p>
        <p><a href="${process.env.FRONTEND_URL}/admin/suggestions/${suggestion._id}">Review Suggestion</a></p>
      `
    });
  } catch (emailError) {
    console.error('Failed to send admin notification:', emailError);
    // Don't fail the request if email fails
  }

  res.status(201).json({
    success: true,
    message: 'Suggestion submitted successfully',
    data: {
      suggestion,
      estimatedReviewTime: '3-5 business days'
    }
  });
});

// @desc    Get user's own suggestions
// @route   GET /api/suggestions/me
// @access  Private
const getMySuggestions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status, limit = 20, page = 1 } = req.query;

  const query = { submittedBy: userId };
  if (status) query.status = status;

  const suggestions = await UserSuggestion.find(query)
    .populate('reviewedBy', 'name email')
    .populate('implementedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await UserSuggestion.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      suggestions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Get suggestion by ID (if user owns it)
// @route   GET /api/suggestions/:id
// @access  Private
const getSuggestion = asyncHandler(async (req, res) => {
  const suggestionId = req.params.id;
  const userId = req.user._id;

  const suggestion = await UserSuggestion.findOne({
    _id: suggestionId,
    submittedBy: userId
  })
    .populate('submittedBy', 'name email affiliation')
    .populate('reviewedBy', 'name email')
    .populate('implementedBy', 'name email')
    .populate('relatedSuggestions');

  if (!suggestion) {
    return res.status(404).json({
      success: false,
      message: 'Suggestion not found'
    });
  }

  res.status(200).json({
    success: true,
    data: suggestion
  });
});

// @desc    Update suggestion (before review)
// @route   PUT /api/suggestions/:id
// @access  Private
const updateSuggestion = asyncHandler(async (req, res) => {
  const suggestionId = req.params.id;
  const userId = req.user._id;

  const suggestion = await UserSuggestion.findOne({
    _id: suggestionId,
    submittedBy: userId,
    status: 'pending' // Only allow updates on pending suggestions
  });

  if (!suggestion) {
    return res.status(404).json({
      success: false,
      message: 'Suggestion not found or cannot be updated'
    });
  }

  const {
    title,
    description,
    suggestedChanges,
    priority,
    contactPreference,
    allowPublicContact,
    tags
  } = req.body;

  // Update allowed fields
  if (title) suggestion.title = title;
  if (description) suggestion.description = description;
  if (suggestedChanges) suggestion.suggestedChanges = suggestedChanges;
  if (priority) suggestion.priority = priority;
  if (contactPreference) suggestion.contactPreference = contactPreference;
  if (allowPublicContact !== undefined) suggestion.allowPublicContact = allowPublicContact;
  if (tags) suggestion.tags = tags;

  await suggestion.save();

  res.status(200).json({
    success: true,
    message: 'Suggestion updated successfully',
    data: suggestion
  });
});

// @desc    Cancel suggestion
// @route   DELETE /api/suggestions/:id
// @access  Private
const cancelSuggestion = asyncHandler(async (req, res) => {
  const suggestionId = req.params.id;
  const userId = req.user._id;

  const suggestion = await UserSuggestion.findOne({
    _id: suggestionId,
    submittedBy: userId,
    status: { $in: ['pending', 'in_review'] }
  });

  if (!suggestion) {
    return res.status(404).json({
      success: false,
      message: 'Suggestion not found or cannot be cancelled'
    });
  }

  await suggestion.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Suggestion cancelled successfully'
  });
});

// @desc    Get suggestion form options
// @route   GET /api/suggestions/form-options
// @access  Private
const getFormOptions = asyncHandler(async (req, res) => {
  const options = {
    suggestionTypes: [
      { value: 'missing_presentation', label: 'Missing Research Presentation', description: 'Add a presentation that was given but not in our database' },
      { value: 'missing_author', label: 'Missing Author', description: 'Add an author who is missing from a presentation' },
      { value: 'incorrect_info', label: 'Incorrect Information', description: 'Correct existing information that is wrong' },
      { value: 'missing_conference', label: 'Missing Conference Year', description: 'Add information about a conference year we\'re missing' },
      { value: 'missing_session', label: 'Missing Session', description: 'Add session information that is missing' },
      { value: 'author_affiliation', label: 'Author Affiliation', description: 'Correct or update author institutional affiliation' },
      { value: 'presentation_details', label: 'Presentation Details', description: 'Update presentation title, abstract, or other details' },
      { value: 'service_record', label: 'Service Record', description: 'Add missing service or volunteer record' },
      { value: 'award_recognition', label: 'Award/Recognition', description: 'Add missing awards or recognition' },
      { value: 'other', label: 'Other', description: 'Other suggestion not covered above' }
    ],
    
    targetTypes: [
      { value: 'presentation', label: 'Research Presentation' },
      { value: 'user', label: 'User Profile' },
      { value: 'conference', label: 'Conference' },
      { value: 'session', label: 'Session' },
      { value: 'general', label: 'General System' }
    ],
    
    priorities: [
      { value: 'low', label: 'Low - Nice to have' },
      { value: 'medium', label: 'Medium - Should be fixed' },
      { value: 'high', label: 'High - Important to fix' },
      { value: 'urgent', label: 'Urgent - Critical issue' }
    ],
    
    categories: [
      { value: 'data_quality', label: 'Data Quality' },
      { value: 'missing_content', label: 'Missing Content' },
      { value: 'historical_accuracy', label: 'Historical Accuracy' },
      { value: 'user_experience', label: 'User Experience' },
      { value: 'technical', label: 'Technical Issue' }
    ],

    disciplines: [
      'accounting', 'economics', 'finance', 'management', 'marketing', 
      'operations', 'strategy', 'entrepreneurship', 'human_resources', 
      'information_systems', 'international_business', 'organizational_behavior', 
      'public_administration', 'supply_chain', 'analytics', 'pedagogy', 'other'
    ],

    methodologies: [
      'quantitative', 'qualitative', 'mixed_methods', 'theoretical', 
      'literature_review', 'case_study'
    ]
  };

  res.status(200).json({
    success: true,
    data: options
  });
});

// ADMIN ENDPOINTS

// @desc    Get all suggestions for admin dashboard
// @route   GET /api/admin/suggestions
// @access  Private (Admin only)
const getAdminDashboard = asyncHandler(async (req, res) => {
  const { status, priority, category, suggestionType, limit = 50, page = 1 } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (category) filters.category = category;
  if (suggestionType) filters.suggestionType = suggestionType;

  const suggestions = await UserSuggestion.getAdminDashboard(filters)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await UserSuggestion.countDocuments(filters);

  // Get statistics
  const stats = await UserSuggestion.getStatistics();

  res.status(200).json({
    success: true,
    data: {
      suggestions,
      statistics: stats[0] || {},
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Review suggestion (approve/reject)
// @route   PUT /api/admin/suggestions/:id/review
// @access  Private (Admin only)
const reviewSuggestion = asyncHandler(async (req, res) => {
  const suggestionId = req.params.id;
  const reviewerId = req.user._id;
  const { action, notes } = req.body; // action: 'approve' or 'reject'

  const suggestion = await UserSuggestion.findById(suggestionId)
    .populate('submittedBy', 'name email');

  if (!suggestion) {
    return res.status(404).json({
      success: false,
      message: 'Suggestion not found'
    });
  }

  if (action === 'approve') {
    await suggestion.approve(reviewerId, notes);
  } else if (action === 'reject') {
    await suggestion.reject(reviewerId, notes);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid action. Must be "approve" or "reject"'
    });
  }

  // Send notification to submitter
  try {
    await sendEmail({
      to: suggestion.submitterEmail,
      subject: `SOBIE Suggestion ${action === 'approve' ? 'Approved' : 'Rejected'}: ${suggestion.title}`,
      html: `
        <h2>Suggestion Update</h2>
        <p>Hello ${suggestion.submitterFullName},</p>
        <p>Your suggestion "${suggestion.title}" has been <strong>${action}ed</strong>.</p>
        ${notes ? `<p><strong>Review Notes:</strong> ${notes}</p>` : ''}
        <p>Thank you for helping improve the SOBIE database!</p>
      `
    });
  } catch (emailError) {
    console.error('Failed to send notification:', emailError);
  }

  res.status(200).json({
    success: true,
    message: `Suggestion ${action}ed successfully`,
    data: suggestion
  });
});

// @desc    Mark suggestion as implemented
// @route   PUT /api/admin/suggestions/:id/implement
// @access  Private (Admin only)
const implementSuggestion = asyncHandler(async (req, res) => {
  const suggestionId = req.params.id;
  const implementerId = req.user._id;
  const { notes, impact } = req.body;

  const suggestion = await UserSuggestion.findById(suggestionId)
    .populate('submittedBy', 'name email');

  if (!suggestion) {
    return res.status(404).json({
      success: false,
      message: 'Suggestion not found'
    });
  }

  await suggestion.implement(implementerId, notes);
  
  if (impact) {
    suggestion.impact = impact;
    await suggestion.save();
  }

  // Send notification to submitter
  try {
    await sendEmail({
      to: suggestion.submitterEmail,
      subject: `SOBIE Suggestion Implemented: ${suggestion.title}`,
      html: `
        <h2>Suggestion Implemented!</h2>
        <p>Hello ${suggestion.submitterFullName},</p>
        <p>Great news! Your suggestion "${suggestion.title}" has been implemented.</p>
        ${notes ? `<p><strong>Implementation Notes:</strong> ${notes}</p>` : ''}
        <p>Thank you for helping improve the SOBIE database!</p>
      `
    });
  } catch (emailError) {
    console.error('Failed to send notification:', emailError);
  }

  res.status(200).json({
    success: true,
    message: 'Suggestion marked as implemented',
    data: suggestion
  });
});

module.exports = {
  submitSuggestion,
  getMySuggestions,
  getSuggestion,
  updateSuggestion,
  cancelSuggestion,
  getFormOptions,
  getAdminDashboard,
  reviewSuggestion,
  implementSuggestion
};
