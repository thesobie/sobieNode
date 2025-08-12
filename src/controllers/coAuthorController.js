const User = require('../models/User');
const ResearchSubmission = require('../models/ResearchSubmission');
const { body, validationResult, param } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Search for potential co-authors from SOBIE users
 * Known collaborators appear first, then other users
 */
const searchPotentialCoAuthors = async (req, res) => {
  try {
    const { query, submissionId, limit = 20, page = 1 } = req.query;
    const userId = req.user.id;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Build search criteria
    const searchCriteria = {
      $and: [
        { _id: { $ne: userId } }, // Exclude current user
        {
          $or: [
            { 'name.firstName': { $regex: query, $options: 'i' } },
            { 'name.lastName': { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { 'affiliation.organization': { $regex: query, $options: 'i' } },
            { 'affiliation.department': { $regex: query, $options: 'i' } },
            { 'profile.expertiseAreas': { $regex: query, $options: 'i' } }
          ]
        }
      ]
    };

    // Get current user's collaboration history
    const collaborationHistory = await ResearchSubmission.find({
      $or: [
        { 'correspondingAuthor.userId': userId },
        { 'coAuthors.userId': userId }
      ]
    }).select('coAuthors correspondingAuthor');

    // Extract known collaborator IDs
    const knownCollaboratorIds = new Set();
    collaborationHistory.forEach(submission => {
      // Add corresponding author if not current user
      if (submission.correspondingAuthor.userId && 
          submission.correspondingAuthor.userId.toString() !== userId) {
        knownCollaboratorIds.add(submission.correspondingAuthor.userId.toString());
      }
      
      // Add co-authors
      submission.coAuthors.forEach(author => {
        if (author.userId && author.userId.toString() !== userId) {
          knownCollaboratorIds.add(author.userId.toString());
        }
      });
    });

    // Get all matching users
    const allUsers = await User.find(searchCriteria)
      .select('name email affiliation profile.expertiseAreas userType studentLevel roles')
      .limit(parseInt(limit) * 2) // Get more than needed for sorting
      .lean();

    // Separate known collaborators and other users
    const knownCollaborators = [];
    const otherUsers = [];

    allUsers.forEach(user => {
      if (knownCollaboratorIds.has(user._id.toString())) {
        knownCollaborators.push({
          ...user,
          isKnownCollaborator: true,
          collaborationCount: collaborationHistory.filter(submission => {
            return submission.correspondingAuthor.userId?.toString() === user._id.toString() ||
                   submission.coAuthors.some(author => author.userId?.toString() === user._id.toString());
          }).length
        });
      } else {
        otherUsers.push({
          ...user,
          isKnownCollaborator: false,
          collaborationCount: 0
        });
      }
    });

    // Sort known collaborators by collaboration count
    knownCollaborators.sort((a, b) => b.collaborationCount - a.collaborationCount);

    // Combine results with known collaborators first
    const sortedResults = [...knownCollaborators, ...otherUsers];

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = sortedResults.slice(startIndex, startIndex + parseInt(limit));

    // If submissionId provided, exclude users already added as co-authors
    let finalResults = paginatedResults;
    if (submissionId) {
      const submission = await ResearchSubmission.findById(submissionId)
        .select('coAuthors correspondingAuthor');
      
      if (submission) {
        const existingAuthorIds = new Set();
        
        // Add corresponding author
        if (submission.correspondingAuthor.userId) {
          existingAuthorIds.add(submission.correspondingAuthor.userId.toString());
        }
        
        // Add co-authors
        submission.coAuthors.forEach(author => {
          if (author.userId) {
            existingAuthorIds.add(author.userId.toString());
          }
        });
        
        finalResults = paginatedResults.filter(user => 
          !existingAuthorIds.has(user._id.toString())
        );
      }
    }

    res.status(200).json({
      success: true,
      data: {
        users: finalResults,
        pagination: {
          currentPage: parseInt(page),
          totalResults: sortedResults.length,
          hasMore: sortedResults.length > (page * limit),
          knownCollaborators: knownCollaborators.length,
          otherUsers: otherUsers.length
        }
      }
    });

  } catch (error) {
    console.error('Error searching potential co-authors:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching for potential co-authors',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add a co-author to a research submission
 */
const addCoAuthor = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { submissionId } = req.params;
    const userId = req.user.id;
    
    // Find the submission and verify ownership
    const submission = await ResearchSubmission.findOne({
      _id: submissionId,
      'correspondingAuthor.userId': userId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Research submission not found or you do not have permission to modify it'
      });
    }

    // Check if submission is in a state that allows modifications
    if (!['draft', 'pending_review', 'pending_revision'].includes(submission.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify co-authors in current submission status'
      });
    }

    const authorData = req.body;
    
    // If userId provided, validate the user exists and get their info
    if (authorData.userId) {
      const user = await User.findById(authorData.userId)
        .select('name email affiliation profile.expertiseAreas userType studentLevel');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'SOBIE user not found'
        });
      }

      // Check if user is already a co-author or corresponding author
      const isAlreadyCorresponding = submission.correspondingAuthor.userId?.toString() === user._id.toString();
      const isAlreadyCoAuthor = submission.coAuthors.some(author => 
        author.userId?.toString() === user._id.toString()
      );

      if (isAlreadyCorresponding || isAlreadyCoAuthor) {
        return res.status(400).json({
          success: false,
          message: 'User is already an author on this submission'
        });
      }

      // Auto-populate fields from user data
      authorData.name = {
        firstName: user.name.firstName,
        lastName: user.name.lastName,
        title: authorData.name?.title || ''
      };
      authorData.email = user.email;
      authorData.affiliation = {
        institution: user.affiliation.organization,
        department: user.affiliation.department || '',
        college: user.affiliation.college || '',
        jobTitle: user.affiliation.jobTitle || ''
      };
      authorData.isExternalAuthor = false;
      
      // Check if this is a known collaborator
      const isKnownCollaborator = await ResearchSubmission.exists({
        $or: [
          { 
            'correspondingAuthor.userId': userId,
            'coAuthors.userId': user._id
          },
          {
            'correspondingAuthor.userId': user._id,
            'coAuthors.userId': userId
          }
        ]
      });
      
      authorData.isKnownCollaborator = !!isKnownCollaborator;
    } else {
      // External author - validate required fields
      if (!authorData.name?.firstName || !authorData.name?.lastName || 
          !authorData.affiliation?.institution) {
        return res.status(400).json({
          success: false,
          message: 'Name and institution are required for external co-authors'
        });
      }
      authorData.isExternalAuthor = true;
      authorData.isKnownCollaborator = false;
    }

    // Add the co-author
    const newCoAuthor = await submission.addCoAuthor(authorData, authorData.isKnownCollaborator);
    await submission.save();

    // Populate the new co-author if it's a SOBIE user
    await submission.populate({
      path: 'coAuthors.userId',
      select: 'name email affiliation profile.expertiseAreas userType'
    });

    res.status(201).json({
      success: true,
      message: 'Co-author added successfully',
      data: {
        coAuthor: newCoAuthor,
        totalCoAuthors: submission.coAuthors.length
      }
    });

  } catch (error) {
    console.error('Error adding co-author:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding co-author',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove a co-author from a research submission
 */
const removeCoAuthor = async (req, res) => {
  try {
    const { submissionId, authorId } = req.params;
    const userId = req.user.id;
    
    const submission = await ResearchSubmission.findOne({
      _id: submissionId,
      'correspondingAuthor.userId': userId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Research submission not found or you do not have permission to modify it'
      });
    }

    if (!['draft', 'pending_review', 'pending_revision'].includes(submission.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify co-authors in current submission status'
      });
    }

    const removedAuthor = submission.removeCoAuthor(authorId);
    
    if (!removedAuthor) {
      return res.status(404).json({
        success: false,
        message: 'Co-author not found'
      });
    }

    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Co-author removed successfully',
      data: {
        removedAuthor,
        totalCoAuthors: submission.coAuthors.length
      }
    });

  } catch (error) {
    console.error('Error removing co-author:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing co-author',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reorder co-authors
 */
const reorderCoAuthors = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { authorOrder } = req.body; // Array of author IDs in new order
    const userId = req.user.id;
    
    const submission = await ResearchSubmission.findOne({
      _id: submissionId,
      'correspondingAuthor.userId': userId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Research submission not found or you do not have permission to modify it'
      });
    }

    if (!['draft', 'pending_review', 'pending_revision'].includes(submission.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify co-author order in current submission status'
      });
    }

    if (!Array.isArray(authorOrder) || authorOrder.length !== submission.coAuthors.length) {
      return res.status(400).json({
        success: false,
        message: 'Author order array must include all co-authors'
      });
    }

    submission.reorderCoAuthors(authorOrder);
    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Co-authors reordered successfully',
      data: {
        coAuthors: submission.coAuthors
      }
    });

  } catch (error) {
    console.error('Error reordering co-authors:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering co-authors',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add faculty sponsor/mentor for student papers
 */
const addFacultySponsor = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { submissionId } = req.params;
    const userId = req.user.id;
    
    const submission = await ResearchSubmission.findOne({
      _id: submissionId,
      'correspondingAuthor.userId': userId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Research submission not found or you do not have permission to modify it'
      });
    }

    // Check if this is a student paper (academicLevel should be student-related)
    if (!['undergraduate', 'graduate', 'doctoral'].includes(submission.academicLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Faculty sponsors are only allowed for student papers'
      });
    }

    const sponsorData = req.body;
    
    // If userId provided, validate and auto-populate
    if (sponsorData.userId) {
      const user = await User.findById(sponsorData.userId)
        .select('name email affiliation userType roles');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'SOBIE user not found'
        });
      }

      // Verify user has faculty/academic role
      if (user.userType !== 'academic' || !user.roles.some(role => 
        ['admin', 'editor', 'reviewer'].includes(role))) {
        return res.status(400).json({
          success: false,
          message: 'Selected user must have academic credentials to serve as faculty sponsor'
        });
      }

      sponsorData.name = {
        firstName: user.name.firstName,
        lastName: user.name.lastName,
        title: sponsorData.name?.title || '',
        rank: sponsorData.name?.rank || user.affiliation.jobTitle || ''
      };
      sponsorData.email = user.email;
      sponsorData.affiliation = {
        institution: user.affiliation.organization,
        department: user.affiliation.department || '',
        college: user.affiliation.college || '',
        jobTitle: user.affiliation.jobTitle || ''
      };
      sponsorData.isExternalSponsor = false;
    } else {
      sponsorData.isExternalSponsor = true;
    }

    const newSponsor = await submission.addFacultySponsor(sponsorData);
    await submission.save();

    res.status(201).json({
      success: true,
      message: 'Faculty sponsor added successfully',
      data: {
        sponsor: newSponsor,
        totalSponsors: submission.facultySponsors.length
      }
    });

  } catch (error) {
    console.error('Error adding faculty sponsor:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding faculty sponsor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove faculty sponsor
 */
const removeFacultySponsor = async (req, res) => {
  try {
    const { submissionId, sponsorId } = req.params;
    const userId = req.user.id;
    
    const submission = await ResearchSubmission.findOne({
      _id: submissionId,
      'correspondingAuthor.userId': userId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Research submission not found or you do not have permission to modify it'
      });
    }

    const removedSponsor = submission.removeFacultySponsor(sponsorId);
    
    if (!removedSponsor) {
      return res.status(404).json({
        success: false,
        message: 'Faculty sponsor not found'
      });
    }

    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Faculty sponsor removed successfully',
      data: {
        removedSponsor,
        totalSponsors: submission.facultySponsors.length
      }
    });

  } catch (error) {
    console.error('Error removing faculty sponsor:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing faculty sponsor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Designate presenter(s)
 */
const designatePresenter = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { authorId, authorType, isPrimary, presentationRole } = req.body;
    const userId = req.user.id;
    
    const submission = await ResearchSubmission.findOne({
      _id: submissionId,
      'correspondingAuthor.userId': userId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Research submission not found or you do not have permission to modify it'
      });
    }

    // Validate authorType and authorId
    if (authorType === 'corresponding') {
      if (submission.correspondingAuthor.userId.toString() !== authorId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid corresponding author ID'
        });
      }
    } else if (authorType === 'coauthor') {
      const coAuthor = submission.coAuthors.find(author => 
        author._id.toString() === authorId.toString()
      );
      if (!coAuthor) {
        return res.status(400).json({
          success: false,
          message: 'Co-author not found'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid author type'
      });
    }

    submission.designatePresenter(authorId, authorType, isPrimary, presentationRole);
    await submission.save();

    const presenters = submission.getPresenters();

    res.status(200).json({
      success: true,
      message: 'Presenter designated successfully',
      data: {
        presenters,
        totalPresenters: presenters.length
      }
    });

  } catch (error) {
    console.error('Error designating presenter:', error);
    res.status(500).json({
      success: false,
      message: 'Error designating presenter',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove presenter designation
 */
const removePresenter = async (req, res) => {
  try {
    const { submissionId, authorId } = req.params;
    const userId = req.user.id;
    
    const submission = await ResearchSubmission.findOne({
      _id: submissionId,
      'correspondingAuthor.userId': userId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Research submission not found or you do not have permission to modify it'
      });
    }

    const removedPresenter = submission.removePresenter(authorId);
    
    if (!removedPresenter) {
      return res.status(404).json({
        success: false,
        message: 'Presenter designation not found'
      });
    }

    await submission.save();

    const presenters = submission.getPresenters();

    res.status(200).json({
      success: true,
      message: 'Presenter designation removed successfully',
      data: {
        removedPresenter,
        presenters,
        totalPresenters: presenters.length
      }
    });

  } catch (error) {
    console.error('Error removing presenter:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing presenter',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all authors and presenters for a submission
 */
const getSubmissionAuthors = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;
    
    const submission = await ResearchSubmission.findOne({
      _id: submissionId,
      $or: [
        { 'correspondingAuthor.userId': userId },
        { 'coAuthors.userId': userId },
        { 'associatedUsers.userId': userId }
      ]
    }).populate('coAuthors.userId', 'name email affiliation profile.expertiseAreas userType')
      .populate('facultySponsors.userId', 'name email affiliation');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Research submission not found or you do not have access to it'
      });
    }

    const allAuthors = submission.getAllAuthors();
    const presenters = submission.getPresenters();
    const knownCollaborators = submission.getKnownCollaborators();

    res.status(200).json({
      success: true,
      data: {
        correspondingAuthor: submission.correspondingAuthor,
        coAuthors: submission.coAuthors,
        facultySponsors: submission.facultySponsors,
        allAuthors,
        presenters,
        knownCollaborators,
        presentationDetails: submission.presentationDetails,
        summary: {
          totalAuthors: allAuthors.length,
          totalCoAuthors: submission.coAuthors.length,
          totalPresenters: presenters.length,
          totalSponsors: submission.facultySponsors.length,
          hasKnownCollaborators: knownCollaborators.length > 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting submission authors:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving submission authors',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Validation middleware
const validateCoAuthor = [
  body('name.firstName').notEmpty().withMessage('First name is required'),
  body('name.lastName').notEmpty().withMessage('Last name is required'),
  body('affiliation.institution').notEmpty().withMessage('Institution is required'),
  body('role').optional().isIn(['co_author', 'faculty_advisor', 'faculty_mentor', 'faculty_sponsor', 'student_researcher']),
  body('userId').optional().isMongoId().withMessage('Invalid user ID'),
  body('isStudentAuthor').optional().isBoolean(),
  body('isPresenter').optional().isBoolean(),
  body('isPrimaryPresenter').optional().isBoolean()
];

const validateFacultySponsor = [
  body('name.firstName').notEmpty().withMessage('First name is required'),
  body('name.lastName').notEmpty().withMessage('Last name is required'),
  body('affiliation.institution').notEmpty().withMessage('Institution is required'),
  body('sponsorType').optional().isIn(['faculty_advisor', 'faculty_mentor', 'department_chair', 'research_supervisor']),
  body('userId').optional().isMongoId().withMessage('Invalid user ID')
];

module.exports = {
  searchPotentialCoAuthors,
  addCoAuthor,
  removeCoAuthor,
  reorderCoAuthors,
  addFacultySponsor,
  removeFacultySponsor,
  designatePresenter,
  removePresenter,
  getSubmissionAuthors,
  validateCoAuthor,
  validateFacultySponsor
};
