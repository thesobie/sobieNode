const mongoose = require('mongoose');

const researchPresentationSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  abstract: {
    type: String,
    maxlength: 5000
  },
  keywords: [String],
  
  // Conference Context
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: true
  },
  conferenceYear: {
    type: Number,
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },

  // Research Classification
  researchType: {
    type: String,
    enum: ['empirical', 'theoretical', 'case_study', 'literature_review', 'experimental', 'survey', 'qualitative', 'quantitative', 'mixed_methods'],
    required: true
  },
  
  presentationType: {
    type: String,
    enum: ['paper', 'poster', 'presentation', 'panel', 'workshop'],
    default: 'paper'
  },
  
  discipline: {
    type: String,
    enum: ['accounting', 'economics', 'finance', 'management', 'marketing', 'operations', 'strategy', 'entrepreneurship', 'human_resources', 'information_systems', 'international_business', 'organizational_behavior', 'public_administration', 'supply_chain', 'analytics', 'pedagogy', 'other'],
    required: true
  },

  // Academic Level
  academicLevel: {
    type: String,
    enum: ['undergraduate', 'graduate', 'faculty', 'industry'],
    required: true
  },
  
  isStudentResearch: {
    type: Boolean,
    default: false
  },

  // Authors and Affiliations
  authors: [{
    name: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      middleName: String,
      title: String, // Dr., Prof., Mr., Ms., etc.
    },
    email: String,
    affiliation: {
      institution: { type: String, required: true },
      department: String,
      address: {
        city: String,
        state: String,
        country: String
      }
    },
    role: {
      type: String,
      enum: ['primary_author', 'co_author', 'faculty_advisor', 'faculty_mentor', 'student_researcher'],
      default: 'co_author'
    },
    isPresenter: {
      type: Boolean,
      default: false
    },
    isStudentAuthor: {
      type: Boolean,
      default: false
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    order: {
      type: Number,
      default: 1
    }
  }],

  // Research Content
  methodology: {
    approach: {
      type: String,
      enum: ['quantitative', 'qualitative', 'mixed_methods', 'theoretical', 'literature_review', 'case_study']
    },
    dataCollection: [String], // surveys, interviews, archival, experimental, etc.
    analysisMethod: [String], // regression, factor_analysis, content_analysis, etc.
    sampleSize: Number,
    dataSource: String
  },

  // Research Findings
  findings: {
    keyFindings: [String],
    contributions: [String],
    implications: {
      theoretical: String,
      practical: String,
      policy: String
    },
    limitations: [String],
    futureResearch: [String]
  },

  // Publication Status
  publicationStatus: {
    type: String,
    enum: ['conference_only', 'submitted_journal', 'under_review', 'accepted', 'published', 'working_paper'],
    default: 'conference_only'
  },
  
  journalSubmission: {
    journalName: String,
    submissionDate: Date,
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'revision_requested', 'accepted', 'rejected']
    }
  },

  // Presentation Details
  presentation: {
    duration: {
      type: Number, // minutes
      default: 20
    },
    hasSlides: {
      type: Boolean,
      default: true
    },
    slideCount: Number,
    presentationFile: {
      filename: String,
      filePath: String,
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      }
    },
    handouts: [{
      title: String,
      filename: String,
      filePath: String,
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      }
    }]
  },

  // Evaluation and Feedback
  evaluation: {
    peerReviewed: {
      type: Boolean,
      default: false
    },
    reviewers: [{
      name: String,
      affiliation: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    reviewScore: {
      type: Number,
      min: 1,
      max: 10
    },
    feedback: [{
      criterion: String, // methodology, contribution, presentation, etc.
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      comments: String,
      reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    audienceFeedback: [{
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comments: String,
      helpful: {
        type: Number,
        min: 1,
        max: 5
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },

  // Awards and Recognition
  awards: [{
    awardName: String,
    category: String, // best paper, best student paper, etc.
    year: Number,
    description: String
  }],

  // Related Research
  relatedPresentations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResearchPresentation'
  }],
  
  citations: [{
    title: String,
    authors: String,
    journal: String,
    year: Number,
    doi: String,
    url: String
  }],

  // Administrative
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'accepted', 'rejected', 'withdrawn', 'presented'],
    default: 'submitted'
  },
  
  submissionDate: {
    type: Date,
    default: Date.now
  },
  
  acceptanceDate: Date,
  presentationDate: Date,
  
  // Contact and Correspondence
  correspondingAuthor: {
    authorId: String, // References authors array index or userId
    email: String,
    phone: String
  },

  // Technical Requirements
  technicalRequirements: {
    projector: { type: Boolean, default: true },
    laptop: { type: Boolean, default: true },
    microphone: { type: Boolean, default: false },
    internet: { type: Boolean, default: false },
    specialSoftware: String,
    other: String
  },

  // Visibility and Access
  isPublic: {
    type: Boolean,
    default: true
  },
  
  embargoDate: Date, // If research should be kept private until this date
  
  downloadCount: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
researchPresentationSchema.index({ conferenceId: 1, conferenceYear: 1 });
researchPresentationSchema.index({ discipline: 1, academicLevel: 1 });
researchPresentationSchema.index({ isStudentResearch: 1 });
researchPresentationSchema.index({ 'authors.userId': 1 });
researchPresentationSchema.index({ status: 1, publicationStatus: 1 });
researchPresentationSchema.index({ keywords: 1 });
researchPresentationSchema.index({ title: 'text', abstract: 'text', keywords: 'text' });

// Virtual for primary author
researchPresentationSchema.virtual('primaryAuthor').get(function() {
  return this.authors.find(author => author.role === 'primary_author') || this.authors[0];
});

// Virtual for student authors
researchPresentationSchema.virtual('studentAuthors').get(function() {
  return this.authors.filter(author => author.isStudentAuthor);
});

// Virtual for faculty advisors
researchPresentationSchema.virtual('facultyAdvisors').get(function() {
  return this.authors.filter(author => author.role === 'faculty_advisor');
});

// Virtual for presenter
researchPresentationSchema.virtual('presenter').get(function() {
  return this.authors.find(author => author.isPresenter) || this.primaryAuthor;
});

// Virtual for author list string
researchPresentationSchema.virtual('authorList').get(function() {
  return this.authors
    .sort((a, b) => a.order - b.order)
    .map(author => `${author.name.firstName} ${author.name.lastName}`)
    .join(', ');
});

// Virtual for full citation
researchPresentationSchema.virtual('citation').get(function() {
  const authors = this.authorList;
  const year = this.conferenceYear;
  const title = this.title;
  return `${authors} (${year}). ${title}. SOBIE ${year} Conference.`;
});

// Instance methods
researchPresentationSchema.methods.addAuthor = function(authorData) {
  const order = this.authors.length + 1;
  this.authors.push({ ...authorData, order });
};

researchPresentationSchema.methods.removeAuthor = function(authorId) {
  this.authors = this.authors.filter(author => 
    author._id.toString() !== authorId.toString()
  );
  // Reorder remaining authors
  this.authors.forEach((author, index) => {
    author.order = index + 1;
  });
};

researchPresentationSchema.methods.setPrimaryAuthor = function(authorId) {
  this.authors.forEach(author => {
    author.role = author._id.toString() === authorId.toString() ? 'primary_author' : 'co_author';
  });
};

researchPresentationSchema.methods.setPresenter = function(authorId) {
  this.authors.forEach(author => {
    author.isPresenter = author._id.toString() === authorId.toString();
  });
};

researchPresentationSchema.methods.getAuthorsByInstitution = function() {
  const institutionGroups = {};
  this.authors.forEach(author => {
    const institution = author.affiliation.institution;
    if (!institutionGroups[institution]) {
      institutionGroups[institution] = [];
    }
    institutionGroups[institution].push(author);
  });
  return institutionGroups;
};

researchPresentationSchema.methods.addFeedback = function(feedback) {
  this.evaluation.audienceFeedback.push(feedback);
};

// Static methods
researchPresentationSchema.statics.getByConference = function(conferenceId) {
  return this.find({ conferenceId })
    .populate('sessionId')
    .populate('authors.userId', 'name email affiliation')
    .sort({ 'sessionId.date': 1, 'sessionId.startTime': 1 });
};

researchPresentationSchema.statics.getByDiscipline = function(discipline, conferenceYear) {
  const query = { discipline };
  if (conferenceYear) query.conferenceYear = conferenceYear;
  
  return this.find(query)
    .populate('authors.userId', 'name email affiliation')
    .sort({ conferenceYear: -1, title: 1 });
};

researchPresentationSchema.statics.getStudentResearch = function(conferenceYear) {
  const query = { isStudentResearch: true };
  if (conferenceYear) query.conferenceYear = conferenceYear;
  
  return this.find(query)
    .populate('authors.userId', 'name email affiliation')
    .sort({ conferenceYear: -1, title: 1 });
};

researchPresentationSchema.statics.getByAuthor = function(userId) {
  return this.find({ 'authors.userId': userId })
    .populate('sessionId')
    .populate('conferenceId', 'name year')
    .sort({ conferenceYear: -1 });
};

researchPresentationSchema.statics.searchResearch = function(searchTerm, filters = {}) {
  const query = {
    $text: { $search: searchTerm }
  };
  
  // Apply filters
  if (filters.discipline) query.discipline = filters.discipline;
  if (filters.conferenceYear) query.conferenceYear = filters.conferenceYear;
  if (filters.academicLevel) query.academicLevel = filters.academicLevel;
  if (filters.isStudentResearch !== undefined) query.isStudentResearch = filters.isStudentResearch;
  
  return this.find(query, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } })
    .populate('authors.userId', 'name email affiliation');
};

// Pre-save middleware
researchPresentationSchema.pre('save', function(next) {
  // Ensure at least one author is marked as primary
  const primaryAuthors = this.authors.filter(author => author.role === 'primary_author');
  if (primaryAuthors.length === 0 && this.authors.length > 0) {
    this.authors[0].role = 'primary_author';
  }
  
  // Ensure at least one author is marked as presenter
  const presenters = this.authors.filter(author => author.isPresenter);
  if (presenters.length === 0 && this.authors.length > 0) {
    this.authors[0].isPresenter = true;
  }
  
  // Set student research flag based on student authors
  this.isStudentResearch = this.authors.some(author => author.isStudentAuthor);
  
  next();
});

module.exports = mongoose.model('ResearchPresentation', researchPresentationSchema);
