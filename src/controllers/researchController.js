const ResearchPresentation = require('../models/ResearchPresentation');
const Conference = require('../models/Conference');
const Session = require('../models/Session');
const { catchAsync } = require('../utils/catchAsync');

// @desc    Get user's research presentations across all conferences
// @route   GET /api/research/me/presentations
// @access  Private
const getMyPresentations = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { year, discipline, type, includeCoauthored = true } = req.query;

  // Build query
  let query = { 'authors.userId': userId };
  
  if (year) {
    query.conferenceYear = parseInt(year);
  }
  
  if (discipline) {
    query.discipline = discipline;
  }
  
  if (type) {
    query.presentationType = type;
  }

  // If not including co-authored, only show where user is primary author or presenter
  if (includeCoauthored === 'false') {
    query['$or'] = [
      { 'authors': { $elemMatch: { userId: userId, role: 'primary_author' } } },
      { 'authors': { $elemMatch: { userId: userId, isPresenter: true } } }
    ];
  }

  const presentations = await ResearchPresentation.find(query)
    .populate('conferenceId', 'name year location startDate endDate')
    .populate('sessionId', 'title track room timeSlot')
    .sort({ conferenceYear: -1, title: 1 });

  // Group by conference year
  const presentationsByYear = presentations.reduce((acc, presentation) => {
    const year = presentation.conferenceYear;
    if (!acc[year]) {
      acc[year] = [];
    }
    
    // Add user's role in this presentation
    const userAuthor = presentation.authors.find(author => 
      author.userId && author.userId.toString() === userId.toString()
    );
    
    const presentationData = {
      _id: presentation._id,
      title: presentation.title,
      abstract: presentation.abstract,
      keywords: presentation.keywords,
      discipline: presentation.discipline,
      presentationType: presentation.presentationType,
      academicLevel: presentation.academicLevel,
      researchType: presentation.researchType,
      conference: presentation.conferenceId,
      session: presentation.sessionId,
      authors: presentation.authors,
      authorList: presentation.authorList,
      userRole: userAuthor ? {
        role: userAuthor.role,
        isPresenter: userAuthor.isPresenter,
        isStudentAuthor: userAuthor.isStudentAuthor,
        order: userAuthor.order
      } : null,
      status: presentation.status,
      publicationStatus: presentation.publicationStatus,
      awards: presentation.awards,
      presentation: presentation.presentation,
      createdAt: presentation.createdAt
    };
    
    acc[year].push(presentationData);
    return acc;
  }, {});

  // Calculate statistics
  const totalPresentations = presentations.length;
  const primaryAuthorCount = presentations.filter(p => 
    p.authors.some(a => a.userId && a.userId.toString() === userId.toString() && a.role === 'primary_author')
  ).length;
  const presenterCount = presentations.filter(p => 
    p.authors.some(a => a.userId && a.userId.toString() === userId.toString() && a.isPresenter)
  ).length;
  const studentResearchCount = presentations.filter(p => 
    p.authors.some(a => a.userId && a.userId.toString() === userId.toString() && a.isStudentAuthor)
  ).length;
  
  const disciplineBreakdown = presentations.reduce((acc, p) => {
    acc[p.discipline] = (acc[p.discipline] || 0) + 1;
    return acc;
  }, {});

  const years = Object.keys(presentationsByYear).map(Number).sort((a, b) => b - a);

  res.status(200).json({
    success: true,
    data: {
      presentations: presentationsByYear,
      statistics: {
        totalPresentations,
        primaryAuthorCount,
        presenterCount,
        studentResearchCount,
        disciplineBreakdown,
        yearsActive: years,
        firstYear: years[years.length - 1] || null,
        mostRecentYear: years[0] || null
      },
      filters: {
        year: year || 'all',
        discipline: discipline || 'all',
        type: type || 'all',
        includeCoauthored: includeCoauthored !== 'false'
      }
    }
  });
});

// @desc    Get detailed view of a specific presentation (if user is author)
// @route   GET /api/research/me/presentations/:id
// @access  Private
const getMyPresentationDetails = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const presentationId = req.params.id;

  const presentation = await ResearchPresentation.findOne({
    _id: presentationId,
    'authors.userId': userId
  })
    .populate('conferenceId')
    .populate('sessionId')
    .populate('authors.userId', 'name email affiliation');

  if (!presentation) {
    return res.status(404).json({
      success: false,
      message: 'Presentation not found or you are not an author'
    });
  }

  // Find user's role in this presentation
  const userAuthor = presentation.authors.find(author => 
    author.userId && author.userId._id.toString() === userId.toString()
  );

  res.status(200).json({
    success: true,
    data: {
      presentation,
      userRole: userAuthor ? {
        role: userAuthor.role,
        isPresenter: userAuthor.isPresenter,
        isStudentAuthor: userAuthor.isStudentAuthor,
        order: userAuthor.order
      } : null
    }
  });
});

// @desc    Get user's research collaboration network
// @route   GET /api/research/me/collaborations
// @access  Private
const getMyCollaborations = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const presentations = await ResearchPresentation.find({
    'authors.userId': userId
  }).populate('authors.userId', 'name email affiliation');

  // Build collaboration network
  const collaborators = new Map();
  const institutions = new Map();
  
  presentations.forEach(presentation => {
    presentation.authors.forEach(author => {
      if (author.userId && author.userId._id.toString() !== userId.toString()) {
        const collaboratorId = author.userId._id.toString();
        const collaboratorData = {
          user: author.userId,
          institution: author.affiliation.institution,
          collaborationCount: (collaborators.get(collaboratorId)?.collaborationCount || 0) + 1,
          presentations: [
            ...(collaborators.get(collaboratorId)?.presentations || []),
            {
              _id: presentation._id,
              title: presentation.title,
              year: presentation.conferenceYear,
              role: author.role
            }
          ]
        };
        collaborators.set(collaboratorId, collaboratorData);

        // Track institutions
        const institution = author.affiliation.institution;
        institutions.set(institution, (institutions.get(institution) || 0) + 1);
      }
    });
  });

  const collaboratorsList = Array.from(collaborators.values())
    .sort((a, b) => b.collaborationCount - a.collaborationCount);

  const institutionsList = Array.from(institutions.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  res.status(200).json({
    success: true,
    data: {
      collaborators: collaboratorsList,
      institutions: institutionsList,
      totalCollaborators: collaboratorsList.length,
      totalInstitutions: institutionsList.length,
      totalCollaborations: collaboratorsList.reduce((sum, c) => sum + c.collaborationCount, 0)
    }
  });
});

// @desc    Get user's complete SOBIE participation history
// @route   GET /api/research/me/sobie-history
// @access  Private
const getMyCompleteSobieHistory = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const user = req.user;

  // Get research presentations
  const presentations = await ResearchPresentation.find({
    'authors.userId': userId
  })
    .populate('conferenceId', 'name year location')
    .populate('sessionId', 'title track')
    .sort({ conferenceYear: -1 });

  // Get all conferences user has participated in
  const conferenceParticipation = new Map();
  
  // Add presentations to conference participation
  presentations.forEach(presentation => {
    const year = presentation.conferenceYear;
    if (!conferenceParticipation.has(year)) {
      conferenceParticipation.set(year, {
        year,
        conference: presentation.conferenceId,
        activities: {
          presentations: [],
          attendance: [],
          service: [],
          manualEntries: []
        }
      });
    }
    
    const userAuthor = presentation.authors.find(author => 
      author.userId && author.userId.toString() === userId.toString()
    );
    
    conferenceParticipation.get(year).activities.presentations.push({
      _id: presentation._id,
      title: presentation.title,
      role: userAuthor?.role || 'co_author',
      isPresenter: userAuthor?.isPresenter || false,
      discipline: presentation.discipline,
      presentationType: presentation.presentationType,
      session: presentation.sessionId,
      awards: presentation.awards
    });
  });

  // Add manual SOBIE history entries
  if (user.sobieHistory) {
    // Add attendance history
    user.sobieHistory.attendance?.forEach(entry => {
      if (!conferenceParticipation.has(entry.year)) {
        conferenceParticipation.set(entry.year, {
          year: entry.year,
          conference: null, // May need to look up
          activities: {
            presentations: [],
            attendance: [],
            service: [],
            manualEntries: []
          }
        });
      }
      conferenceParticipation.get(entry.year).activities.attendance.push(entry);
    });

    // Add service history
    user.sobieHistory.service?.forEach(entry => {
      if (!conferenceParticipation.has(entry.year)) {
        conferenceParticipation.set(entry.year, {
          year: entry.year,
          conference: null,
          activities: {
            presentations: [],
            attendance: [],
            service: [],
            manualEntries: []
          }
        });
      }
      conferenceParticipation.get(entry.year).activities.service.push(entry);
    });

    // Add publications history (as manual entries)
    user.sobieHistory.publications?.forEach(entry => {
      if (!conferenceParticipation.has(entry.year)) {
        conferenceParticipation.set(entry.year, {
          year: entry.year,
          conference: null,
          activities: {
            presentations: [],
            attendance: [],
            service: [],
            manualEntries: []
          }
        });
      }
      conferenceParticipation.get(entry.year).activities.manualEntries.push({
        ...entry,
        type: 'publication'
      });
    });
  }

  // Convert to sorted array
  const participationHistory = Array.from(conferenceParticipation.values())
    .sort((a, b) => b.year - a.year);

  // Calculate comprehensive statistics
  const stats = {
    totalYearsParticipated: participationHistory.length,
    totalPresentations: presentations.length,
    totalAttendance: user.sobieHistory?.attendance?.length || 0,
    totalService: user.sobieHistory?.service?.length || 0,
    firstParticipation: participationHistory[participationHistory.length - 1]?.year || null,
    mostRecentParticipation: participationHistory[0]?.year || null,
    rolesHeld: [
      ...new Set([
        ...presentations.flatMap(p => 
          p.authors.filter(a => a.userId?.toString() === userId.toString())
            .map(a => a.role)
        ),
        ...(user.sobieHistory?.service || []).map(s => s.role),
        ...(user.sobieHistory?.attendance || []).map(a => a.role)
      ])
    ],
    disciplinesPresented: [...new Set(presentations.map(p => p.discipline))],
    presentationTypes: [...new Set(presentations.map(p => p.presentationType))],
    awardsReceived: presentations.flatMap(p => p.awards || [])
  };

  res.status(200).json({
    success: true,
    data: {
      participationHistory,
      statistics: stats,
      summary: {
        yearsActive: stats.totalYearsParticipated,
        totalContributions: stats.totalPresentations + stats.totalService + stats.totalAttendance,
        primaryRoles: stats.rolesHeld.slice(0, 3),
        mainDisciplines: stats.disciplinesPresented.slice(0, 3)
      }
    }
  });
});

// @desc    Search presentations by criteria (for user's own work)
// @route   GET /api/research/me/search
// @access  Private
const searchMyPresentations = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { q, discipline, year, type, role } = req.query;

  let query = { 'authors.userId': userId };
  
  // Text search
  if (q) {
    query.$text = { $search: q };
  }
  
  // Filters
  if (discipline) query.discipline = discipline;
  if (year) query.conferenceYear = parseInt(year);
  if (type) query.presentationType = type;
  
  // Role filter (requires specific author role)
  if (role) {
    query['authors'] = { 
      $elemMatch: { 
        userId: userId, 
        role: role 
      } 
    };
  }

  const presentations = await ResearchPresentation.find(query)
    .populate('conferenceId', 'name year')
    .populate('sessionId', 'title track')
    .sort(q ? { score: { $meta: "textScore" } } : { conferenceYear: -1 });

  res.status(200).json({
    success: true,
    count: presentations.length,
    data: presentations.map(p => {
      const userAuthor = p.authors.find(a => 
        a.userId && a.userId.toString() === userId.toString()
      );
      return {
        _id: p._id,
        title: p.title,
        abstract: p.abstract?.substring(0, 200) + '...',
        discipline: p.discipline,
        presentationType: p.presentationType,
        conferenceYear: p.conferenceYear,
        conference: p.conferenceId,
        session: p.sessionId,
        userRole: userAuthor?.role,
        isPresenter: userAuthor?.isPresenter,
        authorList: p.authorList
      };
    })
  });
});

module.exports = {
  getMyPresentations,
  getMyPresentationDetails,
  getMyCollaborations,
  getMyCompleteSobieHistory,
  searchMyPresentations
};
