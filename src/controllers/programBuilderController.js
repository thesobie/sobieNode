const ResearchSubmission = require('../models/ResearchSubmission');
const Session = require('../models/Session');
const Conference = require('../models/Conference');
const User = require('../models/User');
const ResearchPresentation = require('../models/ResearchPresentation');

/**
 * Conference Program Builder Controller
 * Tools for admins/editors to organize accepted research papers into sessions
 */

// @desc    Get program builder dashboard data
// @route   GET /api/program-builder/dashboard/:conferenceId
// @access  Private (Admin/Editor)
const getProgramBuilderDashboard = async (req, res) => {
  try {
    const { conferenceId } = req.params;

    // Get conference details
    const conference = await Conference.findById(conferenceId);
    if (!conference) {
      return res.status(404).json({
        success: false,
        message: 'Conference not found'
      });
    }

    // Get submissions for draft program building - includes:
    // - Accepted papers (confirmed)
    // - Papers under review (provisional)
    // - Papers with positive initial feedback (likely to be accepted)
    const { includeUnderReview = true, confidenceLevel = 'medium' } = req.query;
    
    let submissionQuery = {
      conferenceId: conferenceId,
      $or: [
        // Definitely accepted papers
        { 'reviewWorkflow.finalDecision.decision': 'accept' },
        // Include papers under review if requested
        ...(includeUnderReview ? [
          { status: 'under_review' },
          { status: 'pending_revision' },
          { status: 'revised' }
        ] : [])
      ]
    };

    const allSubmissions = await ResearchSubmission.find(submissionQuery)
      .populate('correspondingAuthor.userId', 'name email affiliation')
      .populate('coAuthors.userId', 'name email affiliation')
      .populate('reviewWorkflow.reviewers.userId', 'name')
      .sort({ discipline: 1, title: 1 });

    // Categorize submissions by acceptance confidence
    const acceptedSubmissions = [];
    const likelyAcceptedSubmissions = [];
    const uncertainSubmissions = [];

    allSubmissions.forEach(submission => {
      if (submission.reviewWorkflow.finalDecision && 
          submission.reviewWorkflow.finalDecision.decision === 'accept') {
        submission.acceptanceStatus = 'confirmed';
        acceptedSubmissions.push(submission);
      } else if (submission.status === 'under_review' || 
                 submission.status === 'pending_revision' || 
                 submission.status === 'revised') {
        
        // Calculate acceptance probability based on reviews
        const acceptanceProbability = calculateAcceptanceProbability(submission);
        submission.acceptanceProbability = acceptanceProbability;
        
        if (acceptanceProbability >= 0.7) {
          submission.acceptanceStatus = 'likely';
          likelyAcceptedSubmissions.push(submission);
        } else if (acceptanceProbability >= 0.4) {
          submission.acceptanceStatus = 'uncertain';
          uncertainSubmissions.push(submission);
        }
      }
    });

    // Combine based on confidence level
    let programSubmissions = [...acceptedSubmissions];
    if (confidenceLevel === 'high') {
      programSubmissions = [...acceptedSubmissions, ...likelyAcceptedSubmissions];
    } else if (confidenceLevel === 'medium') {
      programSubmissions = [...acceptedSubmissions, ...likelyAcceptedSubmissions, ...uncertainSubmissions];
    }
    // 'conservative' only includes confirmed accepted papers

    // Get existing sessions for this conference
    const existingSessions = await Session.find({
      conferenceId: conferenceId
    })
    .populate('chair.userId', 'name email affiliation')
    .populate('moderators.userId', 'name email affiliation')
    .populate('presentations')
    .sort({ date: 1, startTime: 1 });

    // Get unassigned submissions (not yet placed in any session)
    const assignedPresentationIds = existingSessions.reduce((acc, session) => {
      session.presentations.forEach(presentation => {
        acc.push(presentation._id.toString());
      });
      return acc;
    }, []);

    const unassignedSubmissions = programSubmissions.filter(submission => {
      // Check if submission has a presentation and if it's assigned to a session
      return !assignedPresentationIds.includes(submission._id.toString());
    });

    // Analyze submissions by discipline for grouping suggestions
    const disciplineGroups = {};
    programSubmissions.forEach(submission => {
      const discipline = submission.discipline || 'Other';
      if (!disciplineGroups[discipline]) {
        disciplineGroups[discipline] = [];
      }
      disciplineGroups[discipline].push(submission);
    });

    // Get available moderators (users with editor/admin roles or past moderators)
    const availableModerators = await User.find({
      $or: [
        { roles: { $in: ['admin', 'editor'] } },
        { 'profile.hasModeratedBefore': true },
        { 'profile.willingToModerate': true }
      ],
      isActive: true
    }).select('name email affiliation profile.expertiseAreas');

    // Analyze presenter availability for scheduling
    const presenterAvailability = {};
    programSubmissions.forEach(submission => {
      if (submission.presenterAvailability) {
        const availability = submission.presenterAvailability;
        ['wednesday', 'thursday', 'friday'].forEach(day => {
          ['am', 'pm'].forEach(timeSlot => {
            const key = `${day}_${timeSlot}`;
            if (!presenterAvailability[key]) {
              presenterAvailability[key] = { available: 0, unavailable: 0, conflicts: [] };
            }
            
            if (availability[day] && availability[day][timeSlot]) {
              if (availability[day][timeSlot].available) {
                presenterAvailability[key].available++;
              } else {
                presenterAvailability[key].unavailable++;
                presenterAvailability[key].conflicts.push({
                  submissionId: submission._id,
                  title: submission.title,
                  conflictNote: availability[day][timeSlot].conflictNote
                });
              }
            }
          });
        });
      }
    });

    res.json({
      success: true,
      data: {
        conference: {
          _id: conference._id,
          name: conference.name,
          year: conference.year,
          startDate: conference.startDate,
          endDate: conference.endDate,
          location: conference.location
        },
        statistics: {
          totalConfirmed: acceptedSubmissions.length,
          totalLikely: likelyAcceptedSubmissions.length,
          totalUncertain: uncertainSubmissions.length,
          totalInProgram: programSubmissions.length,
          totalSessions: existingSessions.length,
          unassignedCount: unassignedSubmissions.length,
          assignedCount: programSubmissions.length - unassignedSubmissions.length,
          confidenceLevel: confidenceLevel
        },
        submissions: {
          confirmed: acceptedSubmissions,
          likely: likelyAcceptedSubmissions,
          uncertain: uncertainSubmissions,
          inProgram: programSubmissions
        },
        unassignedSubmissions,
        existingSessions,
        disciplineGroups,
        availableModerators,
        presenterAvailability,
        sessionCategories: [
          'Analytics', 'Pedagogy', 'Student Research', 'General Business', 
          'Economics', 'Healthcare', 'International', 'Finance', 'Sports', 
          'Accounting', 'Management', 'Round Table', 'Open'
        ]
      }
    });

  } catch (error) {
    console.error('Program builder dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create a new session with suggested papers
// @route   POST /api/program-builder/sessions
// @access  Private (Admin/Editor)
const createSession = async (req, res) => {
  try {
    const {
      conferenceId,
      sessionData,
      assignedSubmissions = []
    } = req.body;

    // Validate required fields
    if (!conferenceId || !sessionData.title || !sessionData.date || !sessionData.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required session data'
      });
    }

    // Get the next session number for this conference
    const existingSessionsCount = await Session.countDocuments({ conferenceId });
    const sessionNumber = existingSessionsCount + 1;

    // Create the session
    const session = new Session({
      sessionNumber,
      conferenceId,
      conferenceYear: sessionData.conferenceYear,
      ...sessionData
    });

    await session.save();

    // Create ResearchPresentation documents for assigned submissions
    const presentations = [];
    for (const submissionId of assignedSubmissions) {
      const submission = await ResearchSubmission.findById(submissionId);
      if (submission) {
        const presentation = new ResearchPresentation({
          submissionId: submission._id,
          sessionId: session._id,
          conferenceId: conferenceId,
          conferenceYear: sessionData.conferenceYear,
          title: submission.title,
          presenters: [{
            name: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
            email: submission.correspondingAuthor.email,
            affiliation: submission.correspondingAuthor.affiliation.institution,
            isPrimary: true,
            userId: submission.correspondingAuthor.userId
          }],
          abstract: submission.abstract,
          discipline: submission.discipline,
          keywords: submission.keywords,
          status: 'scheduled'
        });

        await presentation.save();
        presentations.push(presentation._id);

        // Update submission to show it's been scheduled (keep as accepted)
        submission.status = 'accepted';
        await submission.save();
      }
    }

    // Update session with presentation references
    session.presentations = presentations;
    await session.save();

    // Populate the session for response
    const populatedSession = await Session.findById(session._id)
      .populate('chair.userId', 'name email affiliation')
      .populate('moderators.userId', 'name email affiliation')
      .populate('presentations');

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        session: populatedSession,
        assignedPresentations: presentations.length
      }
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update existing session
// @route   PUT /api/program-builder/sessions/:sessionId
// @access  Private (Admin/Editor)
const updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { sessionData, addSubmissions = [], removeSubmissions = [] } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Update session data
    Object.keys(sessionData).forEach(key => {
      if (sessionData[key] !== undefined) {
        session[key] = sessionData[key];
      }
    });

    // Handle adding submissions
    for (const submissionId of addSubmissions) {
      const submission = await ResearchSubmission.findById(submissionId);
      if (submission) {
        const presentation = new ResearchPresentation({
          submissionId: submission._id,
          sessionId: session._id,
          conferenceId: session.conferenceId,
          conferenceYear: session.conferenceYear,
          title: submission.title,
          presenters: [{
            name: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
            email: submission.correspondingAuthor.email,
            affiliation: submission.correspondingAuthor.affiliation.institution,
            isPrimary: true,
            userId: submission.correspondingAuthor.userId
          }],
          abstract: submission.abstract,
          discipline: submission.discipline,
          keywords: submission.keywords,
          status: 'scheduled'
        });

        await presentation.save();
        session.presentations.push(presentation._id);

        submission.status = 'accepted';
        await submission.save();
      }
    }

    // Handle removing submissions
    for (const submissionId of removeSubmissions) {
      const presentation = await ResearchPresentation.findOne({
        submissionId: submissionId,
        sessionId: session._id
      });

      if (presentation) {
        // Remove from session
        session.presentations = session.presentations.filter(
          p => p.toString() !== presentation._id.toString()
        );

        // Update submission status
        const submission = await ResearchSubmission.findById(submissionId);
        if (submission) {
          submission.status = 'accepted';
          await submission.save();
        }

        // Remove presentation
        await ResearchPresentation.findByIdAndDelete(presentation._id);
      }
    }

    await session.save();

    // Return updated session
    const updatedSession = await Session.findById(session._id)
      .populate('chair.userId', 'name email affiliation')
      .populate('moderators.userId', 'name email affiliation')
      .populate('presentations');

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: updatedSession
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get smart grouping suggestions based on various criteria
// @route   POST /api/program-builder/suggestions
// @access  Private (Admin/Editor)
const getGroupingSuggestions = async (req, res) => {
  try {
    const { conferenceId, criteria = 'discipline' } = req.body;

    const submissions = await ResearchSubmission.find({
      conferenceId: conferenceId,
      'reviewWorkflow.finalDecision.decision': 'accept'
    }).populate('correspondingAuthor.userId', 'name affiliation');

    let suggestions = [];

    switch (criteria) {
      case 'discipline':
        suggestions = groupByDiscipline(submissions);
        break;
      case 'keywords':
        suggestions = groupByKeywords(submissions);
        break;
      case 'availability':
        suggestions = groupByAvailability(submissions);
        break;
      case 'institution':
        suggestions = groupByInstitution(submissions);
        break;
      case 'theme':
        suggestions = groupByTheme(submissions);
        break;
      default:
        suggestions = groupByDiscipline(submissions);
    }

    res.json({
      success: true,
      data: {
        criteria,
        suggestions,
        totalGroups: suggestions.length
      }
    });

  } catch (error) {
    console.error('Grouping suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper functions for grouping suggestions
function groupByDiscipline(submissions) {
  const groups = {};
  
  submissions.forEach(submission => {
    const discipline = submission.discipline || 'Other';
    if (!groups[discipline]) {
      groups[discipline] = {
        name: discipline,
        papers: [],
        suggestedSessionTitle: `${discipline} Research`,
        suggestedDuration: '90 minutes',
        maxPapers: 5
      };
    }
    groups[discipline].papers.push(submission);
  });

  return Object.values(groups).filter(group => group.papers.length > 0);
}

function groupByKeywords(submissions) {
  const keywordMap = {};
  
  submissions.forEach(submission => {
    submission.keywords.forEach(keyword => {
      const normalizedKeyword = keyword.toLowerCase().trim();
      if (!keywordMap[normalizedKeyword]) {
        keywordMap[normalizedKeyword] = [];
      }
      keywordMap[normalizedKeyword].push(submission);
    });
  });

  // Only suggest groups with multiple papers
  return Object.entries(keywordMap)
    .filter(([keyword, papers]) => papers.length >= 2)
    .map(([keyword, papers]) => ({
      name: `${keyword} Research`,
      papers: papers,
      suggestedSessionTitle: `Advances in ${keyword}`,
      suggestedDuration: '90 minutes',
      maxPapers: 4
    }))
    .sort((a, b) => b.papers.length - a.papers.length)
    .slice(0, 10); // Top 10 keyword groups
}

function groupByAvailability(submissions) {
  const availabilityGroups = {
    wednesday_am: { name: 'Wednesday AM Available', papers: [] },
    wednesday_pm: { name: 'Wednesday PM Available', papers: [] },
    thursday_am: { name: 'Thursday AM Available', papers: [] },
    thursday_pm: { name: 'Thursday PM Available', papers: [] },
    friday_am: { name: 'Friday AM Available', papers: [] },
    friday_pm: { name: 'Friday PM Available', papers: [] }
  };

  submissions.forEach(submission => {
    if (submission.presenterAvailability) {
      const availability = submission.presenterAvailability;
      
      Object.keys(availabilityGroups).forEach(slot => {
        const [day, timeSlot] = slot.split('_');
        if (availability[day] && availability[day][timeSlot] && availability[day][timeSlot].available) {
          availabilityGroups[slot].papers.push(submission);
        }
      });
    }
  });

  return Object.values(availabilityGroups)
    .filter(group => group.papers.length > 0)
    .map(group => ({
      ...group,
      suggestedSessionTitle: `Research Session - ${group.name}`,
      suggestedDuration: '90 minutes',
      maxPapers: 5
    }));
}

function groupByInstitution(submissions) {
  const institutionGroups = {};
  
  submissions.forEach(submission => {
    const institution = submission.correspondingAuthor.affiliation.institution || 'Unknown';
    if (!institutionGroups[institution]) {
      institutionGroups[institution] = {
        name: institution,
        papers: [],
        suggestedSessionTitle: `Research from ${institution}`,
        suggestedDuration: '90 minutes',
        maxPapers: 4
      };
    }
    institutionGroups[institution].papers.push(submission);
  });

  // Only suggest institutions with multiple papers
  return Object.values(institutionGroups)
    .filter(group => group.papers.length >= 2)
    .sort((a, b) => b.papers.length - a.papers.length);
}

function groupByTheme(submissions) {
  // This would use AI/NLP to group by semantic similarity
  // For now, we'll use a simplified approach based on title/abstract keywords
  const themeKeywords = {
    'Digital Transformation': ['digital', 'technology', 'innovation', 'transformation', 'automation'],
    'Financial Analysis': ['financial', 'finance', 'investment', 'market', 'economic'],
    'Healthcare Management': ['healthcare', 'medical', 'patient', 'hospital', 'health'],
    'Education & Learning': ['education', 'learning', 'student', 'teaching', 'academic'],
    'Sustainability': ['sustainability', 'environment', 'green', 'renewable', 'carbon']
  };

  const themeGroups = {};

  Object.keys(themeKeywords).forEach(theme => {
    themeGroups[theme] = {
      name: theme,
      papers: [],
      suggestedSessionTitle: `${theme} Research`,
      suggestedDuration: '90 minutes',
      maxPapers: 5
    };
  });

  submissions.forEach(submission => {
    const text = `${submission.title} ${submission.abstract}`.toLowerCase();
    
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      const matchCount = keywords.filter(keyword => text.includes(keyword)).length;
      if (matchCount > 0) {
        themeGroups[theme].papers.push({
          ...submission.toObject(),
          themeRelevance: matchCount
        });
      }
    });
  });

  return Object.values(themeGroups)
    .filter(group => group.papers.length > 0)
    .map(group => ({
      ...group,
      papers: group.papers.sort((a, b) => b.themeRelevance - a.themeRelevance)
    }));
}

// @desc    Delete a session and reassign papers
// @route   DELETE /api/program-builder/sessions/:sessionId
// @access  Private (Admin/Editor)
const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Remove all presentations and reset submission status
    for (const presentationId of session.presentations) {
      const presentation = await ResearchPresentation.findById(presentationId);
      if (presentation) {
        const submission = await ResearchSubmission.findById(presentation.submissionId);
        if (submission) {
          submission.status = 'accepted';
          await submission.save();
        }
        await ResearchPresentation.findByIdAndDelete(presentationId);
      }
    }

    await Session.findByIdAndDelete(sessionId);

    res.json({
      success: true,
      message: 'Session deleted and papers reassigned to unassigned pool'
    });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to calculate acceptance probability based on reviews
function calculateAcceptanceProbability(submission) {
  if (!submission.reviewWorkflow || !submission.reviewWorkflow.reviewers) {
    return 0.3; // Default low probability if no review data
  }

  const completedReviews = submission.reviewWorkflow.reviewers.filter(
    reviewer => reviewer.status === 'completed' && reviewer.review
  );

  if (completedReviews.length === 0) {
    // No completed reviews yet, base on submission quality indicators
    const hasKeywords = submission.keywords && submission.keywords.length > 3;
    const hasLongAbstract = submission.abstract && submission.abstract.length > 200;
    const hasCoAuthors = submission.coAuthors && submission.coAuthors.length > 0;
    
    let baseScore = 0.4;
    if (hasKeywords) baseScore += 0.1;
    if (hasLongAbstract) baseScore += 0.1;
    if (hasCoAuthors) baseScore += 0.1;
    
    return Math.min(baseScore, 0.7); // Cap at 70% without actual reviews
  }

  // Calculate based on completed reviews
  let totalScore = 0;
  let recommendationScore = 0;
  let reviewCount = completedReviews.length;

  completedReviews.forEach(reviewer => {
    const review = reviewer.review;
    
    // Use overall score (typically 1-5 scale)
    if (review.overallScore) {
      totalScore += review.overallScore;
    }
    
    // Factor in recommendation
    if (review.recommendation) {
      switch (review.recommendation.toLowerCase()) {
        case 'accept':
        case 'strong_accept':
          recommendationScore += 1.0;
          break;
        case 'minor_revision':
          recommendationScore += 0.8;
          break;
        case 'major_revision':
          recommendationScore += 0.5;
          break;
        case 'reject':
        case 'strong_reject':
          recommendationScore += 0.1;
          break;
        default:
          recommendationScore += 0.4;
      }
    }
  });

  // Calculate average scores
  const avgScore = totalScore / reviewCount;
  const avgRecommendation = recommendationScore / reviewCount;
  
  // Convert to probability (assuming 5-point scale)
  let scoreProbability = (avgScore - 1) / 4; // Convert 1-5 to 0-1
  
  // Combine score and recommendation (weighted)
  const finalProbability = (scoreProbability * 0.6) + (avgRecommendation * 0.4);
  
  // Factor in revision status
  if (submission.status === 'pending_revision') {
    return Math.max(finalProbability * 0.8, 0.1); // Slightly lower for revisions needed
  } else if (submission.status === 'revised') {
    return Math.min(finalProbability * 1.1, 0.9); // Slightly higher for submitted revisions
  }
  
  return Math.max(Math.min(finalProbability, 0.95), 0.05); // Clamp between 5% and 95%
}

module.exports = {
  getProgramBuilderDashboard,
  createSession,
  updateSession,
  getGroupingSuggestions,
  deleteSession
};
