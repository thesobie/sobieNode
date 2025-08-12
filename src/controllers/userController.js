const userService = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Public
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.getUserById(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Public
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  
  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Public
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.updateUser(id, req.body);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get user public profile
// @route   GET /api/users/:id/public
// @access  Public
const getUserPublicProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { includeSubmissions = 'false', includeStats = 'false' } = req.query;
  
  // Check if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.getUserById(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const publicProfile = user.getPublicProfile();
  
  // Optionally include research submissions
  if (includeSubmissions === 'true') {
    const submissions = await user.getResearchSubmissions('accepted'); // Only show published/accepted submissions publicly
    publicProfile.researchSubmissions = submissions.map(submission => ({
      id: submission._id,
      title: submission.title,
      year: submission.conferenceYear,
      conference: submission.conferenceId?.name || `SOBIE ${submission.conferenceYear}`,
      role: getUserRoleInSubmission(user._id, submission),
      coAuthors: submission.coAuthors.map(author => ({
        name: `${author.name.firstName} ${author.name.lastName}`,
        institution: author.affiliation.institution
      }))
    }));
  }
  
  // Optionally include submission statistics
  if (includeStats === 'true') {
    const stats = await user.getSubmissionStats();
    publicProfile.researchStats = {
      totalPublications: stats.published,
      totalSubmissions: stats.total,
      yearsActive: stats.yearsActive,
      collaboratorCount: stats.collaborators,
      roles: stats.roles
    };
  }

  res.status(200).json({
    success: true,
    data: publicProfile
  });
});

// Helper function to determine user's role in a submission
const getUserRoleInSubmission = (userId, submission) => {
  if (submission.correspondingAuthor.userId && 
      submission.correspondingAuthor.userId.toString() === userId.toString()) {
    return 'Corresponding Author';
  }
  
  const coAuthor = submission.coAuthors.find(author => 
    author.userId && author.userId.toString() === userId.toString()
  );
  if (coAuthor) {
    return coAuthor.isPrimaryPresenter ? 'Co-Author (Presenter)' : 'Co-Author';
  }
  
  if (submission.facultySponsors) {
    const sponsor = submission.facultySponsors.find(sponsor =>
      sponsor.userId && sponsor.userId.toString() === userId.toString()
    );
    if (sponsor) {
      return 'Faculty Sponsor';
    }
  }
  
  return 'Contributor';
};

// @desc    Get current user's research submissions
// @route   GET /api/users/me/submissions
// @access  Private
const getMySubmissions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const userId = req.user.id;
  
  try {
    // Get user's submissions
    const submissions = await req.user.getResearchSubmissions(status);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedSubmissions = submissions.slice(startIndex, endIndex);
    
    // Format submissions for response
    const formattedSubmissions = paginatedSubmissions.map(submission => ({
      id: submission._id,
      submissionNumber: submission.submissionNumber,
      title: submission.title,
      status: submission.status,
      role: getUserRoleInSubmission(userId, submission),
      conferenceYear: submission.conferenceYear,
      conference: submission.conferenceId?.name || `SOBIE ${submission.conferenceYear}`,
      submittedAt: submission.createdAt,
      lastUpdated: submission.updatedAt,
      coAuthorCount: submission.coAuthors.length,
      isPresenter: isUserPresenter(userId, submission)
    }));
    
    res.status(200).json({
      success: true,
      data: {
        submissions: formattedSubmissions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(submissions.length / limit),
          totalSubmissions: submissions.length,
          hasMore: endIndex < submissions.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving submissions',
      error: error.message
    });
  }
});

// @desc    Get current user's submission statistics
// @route   GET /api/users/me/stats
// @access  Private
const getMyStats = asyncHandler(async (req, res) => {
  try {
    const stats = await req.user.getSubmissionStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving statistics',
      error: error.message
    });
  }
});

// Helper function to check if user is a presenter
const isUserPresenter = (userId, submission) => {
  if (submission.presentationDetails && submission.presentationDetails.presenters) {
    return submission.presentationDetails.presenters.some(presenter =>
      presenter.userId && presenter.userId.toString() === userId.toString()
    );
  }
  return false;
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  const user = await userService.deleteUser(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  getUserPublicProfile,
  getMySubmissions,
  getMyStats,
  createUser,
  updateUser,
  deleteUser
};
