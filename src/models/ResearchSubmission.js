const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const researchSubmissionSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Research title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  abstract: {
    type: String,
    required: [true, 'Abstract is required'],
    maxlength: [5000, 'Abstract cannot exceed 5000 characters']
  },
  keywords: [{
    type: String,
    trim: true,
    maxlength: [50, 'Each keyword cannot exceed 50 characters']
  }],

  // Conference Information
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: true
  },
  conferenceYear: {
    type: Number,
    required: true
  },

  // Research Classification
  researchType: {
    type: String,
    enum: ['empirical', 'theoretical', 'case_study', 'literature_review', 'experimental', 'survey', 'qualitative', 'quantitative', 'mixed_methods'],
    required: [true, 'Research type is required']
  },
  presentationType: {
    type: String,
    enum: ['paper', 'poster', 'presentation', 'panel', 'workshop'],
    default: 'paper'
  },
  discipline: {
    type: String,
    enum: ['accounting', 'economics', 'finance', 'management', 'marketing', 'operations', 'strategy', 'entrepreneurship', 'human_resources', 'information_systems', 'international_business', 'organizational_behavior', 'public_administration', 'supply_chain', 'analytics', 'pedagogy', 'other'],
    required: [true, 'Discipline is required']
  },
  academicLevel: {
    type: String,
    enum: ['undergraduate', 'graduate', 'faculty', 'industry'],
    required: [true, 'Academic level is required']
  },

  // Corresponding Author (required)
  correspondingAuthor: {
    name: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      title: String
    },
    email: {
      type: String,
      required: [true, 'Corresponding author email is required'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
    },
    phone: String,
    affiliation: {
      institution: { type: String, required: true },
      department: String,
      address: {
        city: String,
        state: String,
        country: String
      }
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },

  // Co-Authors
  coAuthors: [{
    name: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      title: String, // Dr., Prof., Mr., Ms., etc.
      rank: String // Assistant Professor, Associate Professor, Full Professor, Graduate Student, etc.
    },
    email: String,
    affiliation: {
      institution: { type: String, required: true },
      department: String,
      college: String,
      jobTitle: String,
      address: {
        city: String,
        state: String,
        country: String
      }
    },
    role: {
      type: String,
      enum: ['co_author', 'faculty_advisor', 'faculty_mentor', 'faculty_sponsor', 'student_researcher'],
      default: 'co_author'
    },
    isStudentAuthor: {
      type: Boolean,
      default: false
    },
    isPresenter: {
      type: Boolean,
      default: false
    },
    isPrimaryPresenter: {
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
    },
    // For non-SOBIE users
    isExternalAuthor: {
      type: Boolean,
      default: false
    },
    // Known collaborator flag (for sorting search results)
    isKnownCollaborator: {
      type: Boolean,
      default: false
    },
    addedDate: {
      type: Date,
      default: Date.now
    }
  }],

  // Faculty Sponsors/Mentors (specifically for student papers)
  facultySponsors: [{
    name: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      title: String,
      rank: String
    },
    email: String,
    affiliation: {
      institution: { type: String, required: true },
      department: String,
      college: String,
      jobTitle: String
    },
    sponsorType: {
      type: String,
      enum: ['faculty_advisor', 'faculty_mentor', 'department_chair', 'research_supervisor'],
      default: 'faculty_advisor'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isExternalSponsor: {
      type: Boolean,
      default: false
    },
    addedDate: {
      type: Date,
      default: Date.now
    }
  }],

  // Presentation Information
  presentationDetails: {
    presenters: [{
      authorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      authorType: {
        type: String,
        enum: ['corresponding', 'coauthor'],
        required: true
      },
      isPrimary: {
        type: Boolean,
        default: false
      },
      presentationRole: {
        type: String,
        enum: ['presenter', 'co_presenter', 'discussant'],
        default: 'presenter'
      },
      order: {
        type: Number,
        default: 1
      }
    }],
    multiplePresenterNotes: String,
    presentationRequirements: String,
    // Presenter Availability for Conference Days (Wednesday, Thursday, Friday)
    presenterAvailability: {
      wednesday: {
        am: {
          available: { type: Boolean, default: true },
          conflictNote: { type: String, maxlength: 500 }
        },
        pm: {
          available: { type: Boolean, default: true },
          conflictNote: { type: String, maxlength: 500 }
        }
      },
      thursday: {
        am: {
          available: { type: Boolean, default: true },
          conflictNote: { type: String, maxlength: 500 }
        },
        pm: {
          available: { type: Boolean, default: true },
          conflictNote: { type: String, maxlength: 500 }
        }
      },
      friday: {
        am: {
          available: { type: Boolean, default: true },
          conflictNote: { type: String, maxlength: 500 }
        },
        pm: {
          available: { type: Boolean, default: true },
          conflictNote: { type: String, maxlength: 500 }
        }
      },
      generalNotes: {
        type: String,
        maxlength: 1000,
        trim: true
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }
  },

  // Research Paper Upload
  paperUpload: {
    filename: {
      type: String,
      required: [true, 'Paper file is required']
    },
    originalName: String,
    filePath: String,
    fileSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }
  },

  // Supporting Documents
  supportingDocuments: [{
    type: String, // 'supplementary_data', 'appendix', 'presentation_slides', 'other'
    filename: String,
    originalName: String,
    filePath: String,
    description: String,
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }
  }],

  // Submission Status
  status: {
    type: String,
    enum: [
      'draft',           // Being prepared by author
      'submitted',       // Submitted for review
      'under_review',    // Editor has assigned reviewers
      'pending_revision', // Reviewers requested changes
      'revised',         // Author submitted revisions
      'accepted',        // Accepted for presentation
      'rejected',        // Not accepted
      'withdrawn',       // Author withdrew submission
      'presented',       // Already presented at conference
      'proceedings_invited', // Invited to submit to proceedings
      'proceedings_submitted', // Final version submitted for proceedings
      'proceedings_under_review', // Proceedings version under review
      'proceedings_revision_required', // Proceedings version needs revision
      'proceedings_revised', // Revised proceedings version submitted
      'proceedings_accepted', // Accepted for proceedings publication
      'proceedings_rejected', // Rejected for proceedings publication
      'published'        // Published in conference proceedings
    ],
    default: 'draft'
  },

  // Review Workflow
  reviewWorkflow: {
    editor: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedDate: Date,
      notes: String
    },
    reviewers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      invitedDate: Date,
      acceptedDate: Date,
      declinedDate: Date,
      submissionDate: Date,
      status: {
        type: String,
        enum: ['invited', 'accepted', 'declined', 'completed', 'overdue'],
        default: 'invited'
      },
      review: {
        overallScore: {
          type: Number,
          min: 1,
          max: 5
        },
        recommendation: {
          type: String,
          enum: ['accept', 'minor_revision', 'major_revision', 'reject']
        },
        criteria: {
          relevance: { score: Number, comments: String },
          methodology: { score: Number, comments: String },
          originality: { score: Number, comments: String },
          clarity: { score: Number, comments: String },
          significance: { score: Number, comments: String }
        },
        confidentialComments: String, // To editor only
        authorComments: String,       // Shared with author
        reviewDate: Date
      },
      remindersSent: {
        type: Number,
        default: 0
      }
    }],
    reviewDeadline: Date,
    finalDecision: {
      decision: {
        type: String,
        enum: ['accept', 'minor_revision', 'major_revision', 'reject']
      },
      decisionDate: Date,
      editorComments: String,
      notifiedDate: Date
    },
    revisionRequests: [{
      requestDate: Date,
      deadline: Date,
      comments: String,
      submittedDate: Date,
      documents: [{
        filename: String,
        filePath: String,
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document'
        }
      }]
    }]
  },

  // Notifications and Communications
  notifications: [{
    type: {
      type: String,
      enum: [
        'submission_received',
        'editor_assigned',
        'reviewers_assigned',
        'review_completed',
        'decision_made',
        'revision_requested',
        'revision_submitted',
        'final_decision',
        'reminder_sent'
      ]
    },
    recipients: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      email: String,
      notifiedDate: Date,
      method: {
        type: String,
        enum: ['email', 'platform'],
        default: 'email'
      }
    }],
    message: String,
    sentDate: Date,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Timeline and Deadlines
  submissionDeadline: Date,
  initialSubmissionDate: Date,
  lastModifiedDate: {
    type: Date,
    default: Date.now
  },

  // Research Details
  researchDetails: {
    methodology: String,
    dataSource: String,
    sampleSize: Number,
    analysisMethod: [String],
    keyFindings: [String],
    contributions: [String],
    limitations: [String]
  },

  // Administrative
  submissionNumber: {
    type: String,
    unique: true
  },
  isStudentResearch: {
    type: Boolean,
    default: false
  },
  
  // Associated SOBIE Users tracking
  associatedUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    relationship: {
      type: String,
      enum: ['author', 'co_author', 'coauthor', 'reviewer', 'editor', 'advisor', 'student', 'faculty_sponsor']
    },
    notificationPreferences: {
      statusUpdates: { type: Boolean, default: true },
      reviewUpdates: { type: Boolean, default: true },
      deadlineReminders: { type: Boolean, default: true }
    }
  }],

  // Conference Proceedings Workflow
  proceedings: {
    // Invitation to submit proceedings
    invitationSent: {
      type: Boolean,
      default: false
    },
    invitationSentAt: Date,
    invitationSentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    invitationDeadline: Date,
    
    // Final paper submission for proceedings
    finalPaper: {
      filename: String,
      originalName: String,
      filePath: String,
      fileSize: Number,
      uploadDate: Date,
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    
    // Revision tracking for proceedings
    revisions: [{
      version: Number,
      filename: String,
      originalName: String,
      filePath: String,
      fileSize: Number,
      uploadDate: Date,
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      comments: String
    }],
    
    // Proceedings review workflow
    proceedingsReview: {
      assignedEditor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedAt: Date,
      reviewComments: String,
      
      reviewers: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        assignedAt: Date,
        reviewSubmittedAt: Date,
        recommendation: {
          type: String,
          enum: ['accept', 'minor_revision', 'major_revision', 'reject']
        },
        comments: String,
        confidentialComments: String
      }],
      
      // Final proceedings decision
      finalDecision: {
        decision: {
          type: String,
          enum: ['accept', 'reject', 'revision_required']
        },
        decisionDate: Date,
        decisionBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        comments: String,
        revisionDeadline: Date
      }
    },
    
    // Publication details
    publication: {
      publishedAt: Date,
      publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      proceedingsVolume: String,
      proceedingsIssue: String,
      pageNumbers: {
        start: Number,
        end: Number
      },
      doi: String,
      publishedUrl: String
    },
    
    // Author acknowledgment
    authorResponse: {
      acceptedInvitation: Boolean,
      responseDate: Date,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      comments: String
    },
    
    // Important dates
    submittedAt: Date,
    reviewCompletedAt: Date,
    finalDecisionAt: Date,
    publishedAt: Date
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add pagination plugin
researchSubmissionSchema.plugin(mongoosePaginate);

// Indexes
researchSubmissionSchema.index({ conferenceId: 1, conferenceYear: 1 });
researchSubmissionSchema.index({ status: 1 });
researchSubmissionSchema.index({ 'correspondingAuthor.userId': 1 });
researchSubmissionSchema.index({ 'coAuthors.userId': 1 });
researchSubmissionSchema.index({ 'reviewWorkflow.reviewers.userId': 1 });
researchSubmissionSchema.index({ 'associatedUsers.userId': 1 });
// Note: submissionNumber index is automatically created by unique: true constraint
researchSubmissionSchema.index({ title: 'text', abstract: 'text', keywords: 'text' });
// Proceedings indexes
researchSubmissionSchema.index({ 'proceedings.invitationSent': 1 });
researchSubmissionSchema.index({ 'proceedings.invitationDeadline': 1 });
researchSubmissionSchema.index({ 'proceedings.proceedingsReview.assignedEditor': 1 });
researchSubmissionSchema.index({ 'proceedings.publication.publishedAt': 1 });

// Virtual for all authors
researchSubmissionSchema.virtual('allAuthors').get(function() {
  const authors = [{
    ...this.correspondingAuthor,
    role: 'corresponding_author',
    order: 0
  }];
  
  this.coAuthors.forEach(author => {
    authors.push({
      ...author.toObject(),
      order: author.order || authors.length
    });
  });
  
  return authors.sort((a, b) => a.order - b.order);
});

// Virtual for author list string
researchSubmissionSchema.virtual('authorList').get(function() {
  return this.allAuthors
    .map(author => `${author.name.firstName} ${author.name.lastName}`)
    .join(', ');
});

// Virtual for review status summary
researchSubmissionSchema.virtual('reviewStatus').get(function() {
  if (!this.reviewWorkflow.reviewers.length) {
    return { phase: 'pending_assignment', reviewersNeeded: true };
  }
  
  const reviewers = this.reviewWorkflow.reviewers;
  const completed = reviewers.filter(r => r.status === 'completed').length;
  const total = reviewers.length;
  const pending = reviewers.filter(r => ['invited', 'accepted'].includes(r.status)).length;
  const declined = reviewers.filter(r => r.status === 'declined').length;
  
  return {
    phase: completed === total ? 'reviews_complete' : 'in_review',
    completed,
    total,
    pending,
    declined,
    completionRate: total > 0 ? (completed / total * 100).toFixed(0) : 0
  };
});

// Virtual for days since submission
researchSubmissionSchema.virtual('daysSinceSubmission').get(function() {
  if (!this.initialSubmissionDate) return null;
  const diffTime = Date.now() - this.initialSubmissionDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Instance Methods
researchSubmissionSchema.methods.assignEditor = function(editorUserId, notes = '') {
  this.reviewWorkflow.editor = {
    userId: editorUserId,
    assignedDate: new Date(),
    notes
  };
  this.status = 'under_review';
};

researchSubmissionSchema.methods.addReviewer = function(reviewerUserId) {
  // Check if reviewer already assigned
  const existingReviewer = this.reviewWorkflow.reviewers.find(
    r => r.userId.toString() === reviewerUserId.toString()
  );
  
  if (existingReviewer) {
    throw new Error('Reviewer already assigned to this submission');
  }
  
  this.reviewWorkflow.reviewers.push({
    userId: reviewerUserId,
    invitedDate: new Date(),
    status: 'invited'
  });
};

researchSubmissionSchema.methods.removeReviewer = function(reviewerUserId) {
  this.reviewWorkflow.reviewers = this.reviewWorkflow.reviewers.filter(
    r => r.userId.toString() !== reviewerUserId.toString()
  );
};

researchSubmissionSchema.methods.acceptReview = function(reviewerUserId) {
  const reviewer = this.reviewWorkflow.reviewers.find(
    r => r.userId.toString() === reviewerUserId.toString()
  );
  
  if (!reviewer) {
    throw new Error('Reviewer not found');
  }
  
  reviewer.status = 'accepted';
  reviewer.acceptedDate = new Date();
};

researchSubmissionSchema.methods.declineReview = function(reviewerUserId) {
  const reviewer = this.reviewWorkflow.reviewers.find(
    r => r.userId.toString() === reviewerUserId.toString()
  );
  
  if (!reviewer) {
    throw new Error('Reviewer not found');
  }
  
  reviewer.status = 'declined';
  reviewer.declinedDate = new Date();
};

researchSubmissionSchema.methods.submitReview = function(reviewerUserId, reviewData) {
  const reviewer = this.reviewWorkflow.reviewers.find(
    r => r.userId.toString() === reviewerUserId.toString()
  );
  
  if (!reviewer) {
    throw new Error('Reviewer not found');
  }
  
  reviewer.review = {
    ...reviewData,
    reviewDate: new Date()
  };
  reviewer.status = 'completed';
  reviewer.submissionDate = new Date();
};

researchSubmissionSchema.methods.makeDecision = function(decision, editorComments = '') {
  this.reviewWorkflow.finalDecision = {
    decision,
    decisionDate: new Date(),
    editorComments
  };
  
  // Update submission status based on decision
  switch (decision) {
    case 'accept':
      this.status = 'accepted';
      break;
    case 'minor_revision':
    case 'major_revision':
      this.status = 'pending_revision';
      break;
    case 'reject':
      this.status = 'rejected';
      break;
  }
};

researchSubmissionSchema.methods.addNotification = function(type, recipients, message, sentBy) {
  this.notifications.push({
    type,
    recipients: recipients.map(recipient => ({
      userId: recipient.userId || null,
      email: recipient.email,
      notifiedDate: new Date(),
      method: recipient.method || 'email'
    })),
    message,
    sentDate: new Date(),
    sentBy
  });
};

researchSubmissionSchema.methods.addAssociatedUser = function(userId, relationship, notificationPrefs = {}) {
  // Check if user already associated
  const existingUser = this.associatedUsers.find(
    user => user.userId.toString() === userId.toString()
  );
  
  if (existingUser) {
    existingUser.relationship = relationship;
    existingUser.notificationPreferences = {
      statusUpdates: notificationPrefs.statusUpdates !== false,
      reviewUpdates: notificationPrefs.reviewUpdates !== false,
      deadlineReminders: notificationPrefs.deadlineReminders !== false
    };
  } else {
    this.associatedUsers.push({
      userId,
      relationship,
      notificationPreferences: {
        statusUpdates: notificationPrefs.statusUpdates !== false,
        reviewUpdates: notificationPrefs.reviewUpdates !== false,
        deadlineReminders: notificationPrefs.deadlineReminders !== false
      }
    });
  }
};

// Co-Author Management Methods
researchSubmissionSchema.methods.addCoAuthor = async function(authorData, isKnownCollaborator = false) {
  let newAuthorData = { ...authorData };
  const User = mongoose.model('User');
  
  // If no userId provided but email is available, try to find the user
  if (!authorData.userId && authorData.email) {
    const existingUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${authorData.email}$`, 'i') } 
    });
    
    if (existingUser) {
      newAuthorData.userId = existingUser._id;
      console.log(`📧 Auto-linked co-author ${authorData.email} to SOBIE user ${existingUser._id}`);
    }
  }
  
  // If userId is provided but no name/affiliation, populate from User model
  if (newAuthorData.userId && (!authorData.name || !authorData.affiliation)) {
    const user = await User.findById(newAuthorData.userId);
    
    if (user) {
      // Populate name from user if not provided
      if (!newAuthorData.name) {
        newAuthorData.name = {
          firstName: user.name.firstName,
          lastName: user.name.lastName,
          title: user.title || '',
          rank: user.rank || ''
        };
      }
      
      // Populate affiliation from user if not provided
      if (!newAuthorData.affiliation) {
        newAuthorData.affiliation = {
          institution: user.affiliation.organization, // Map organization to institution
          department: user.affiliation.department || '',
          college: user.affiliation.college || '',
          jobTitle: user.affiliation.jobTitle || '',
          address: {
            city: user.address?.city || '',
            state: user.address?.state || '',
            country: user.address?.country || ''
          }
        };
      }
      
      // Set email from user if not provided
      if (!newAuthorData.email) {
        newAuthorData.email = user.email;
      }
    }
  }
  
  const newAuthor = {
    ...newAuthorData,
    order: this.coAuthors.length + 1,
    isKnownCollaborator,
    addedDate: new Date()
  };
  
  this.coAuthors.push(newAuthor);
  
  // If it's a SOBIE user, add to associated users
  if (newAuthorData.userId) {
    this.addAssociatedUser(newAuthorData.userId, 'coauthor');
  }
  
  return this.coAuthors[this.coAuthors.length - 1];
};

researchSubmissionSchema.methods.removeCoAuthor = function(authorId) {
  const authorIndex = this.coAuthors.findIndex(author => 
    author._id.toString() === authorId.toString()
  );
  
  if (authorIndex > -1) {
    const removedAuthor = this.coAuthors[authorIndex];
    this.coAuthors.splice(authorIndex, 1);
    
    // Reorder remaining authors
    this.coAuthors.forEach((author, index) => {
      author.order = index + 1;
    });
    
    // Remove from associated users if they were a SOBIE user
    if (removedAuthor.userId) {
      this.associatedUsers = this.associatedUsers.filter(
        user => user.userId.toString() !== removedAuthor.userId.toString()
      );
    }
    
    // Remove from presenters if they were designated as presenter
    if (this.presentationDetails && this.presentationDetails.presenters) {
      this.presentationDetails.presenters = this.presentationDetails.presenters.filter(
        presenter => presenter.authorId.toString() !== authorId.toString()
      );
    }
    
    return removedAuthor;
  }
  return null;
};

researchSubmissionSchema.methods.reorderCoAuthors = function(newOrder) {
  // newOrder should be an array of author IDs in desired order
  const reorderedAuthors = [];
  
  newOrder.forEach((authorId, index) => {
    const author = this.coAuthors.find(a => a._id.toString() === authorId.toString());
    if (author) {
      author.order = index + 1;
      reorderedAuthors.push(author);
    }
  });
  
  this.coAuthors = reorderedAuthors;
};

researchSubmissionSchema.methods.addFacultySponsor = async function(sponsorData) {
  let newSponsorData = { ...sponsorData };
  
  // If userId is provided but no name/affiliation, populate from User model
  if (sponsorData.userId && (!sponsorData.name || !sponsorData.affiliation)) {
    const User = mongoose.model('User');
    const user = await User.findById(sponsorData.userId);
    
    if (user) {
      // Populate name from user if not provided
      if (!newSponsorData.name) {
        newSponsorData.name = {
          firstName: user.name.firstName,
          lastName: user.name.lastName,
          title: user.title || '',
          rank: user.rank || ''
        };
      }
      
      // Populate affiliation from user if not provided
      if (!newSponsorData.affiliation) {
        newSponsorData.affiliation = {
          institution: user.affiliation.organization, // Map organization to institution
          department: user.affiliation.department || '',
          college: user.affiliation.college || '',
          jobTitle: user.affiliation.jobTitle || '',
          address: {
            city: user.address?.city || '',
            state: user.address?.state || '',
            country: user.address?.country || ''
          }
        };
      }
      
      // Set email from user if not provided
      if (!newSponsorData.email) {
        newSponsorData.email = user.email;
      }
    }
  }
  
  const newSponsor = {
    ...newSponsorData,
    addedDate: new Date()
  };
  
  this.facultySponsors.push(newSponsor);
  
  // If it's a SOBIE user, add to associated users
  if (sponsorData.userId) {
    this.addAssociatedUser(sponsorData.userId, 'faculty_sponsor');
  }
  
  return this.facultySponsors[this.facultySponsors.length - 1];
};

researchSubmissionSchema.methods.removeFacultySponsor = function(sponsorId) {
  const sponsorIndex = this.facultySponsors.findIndex(sponsor => 
    sponsor._id.toString() === sponsorId.toString()
  );
  
  if (sponsorIndex > -1) {
    const removedSponsor = this.facultySponsors[sponsorIndex];
    this.facultySponsors.splice(sponsorIndex, 1);
    
    // Remove from associated users if they were a SOBIE user
    if (removedSponsor.userId) {
      this.associatedUsers = this.associatedUsers.filter(
        user => user.userId.toString() !== removedSponsor.userId.toString()
      );
    }
    
    return removedSponsor;
  }
  return null;
};

researchSubmissionSchema.methods.designatePresenter = function(authorId, authorType, isPrimary = false, presentationRole = 'presenter') {
  if (!this.presentationDetails) {
    this.presentationDetails = { presenters: [] };
  }
  
  // If setting as primary, remove primary designation from others
  if (isPrimary) {
    this.presentationDetails.presenters.forEach(presenter => {
      presenter.isPrimary = false;
    });
  }
  
  // Check if this author is already a presenter
  const existingPresenter = this.presentationDetails.presenters.find(
    presenter => presenter.authorId.toString() === authorId.toString()
  );
  
  if (existingPresenter) {
    existingPresenter.isPrimary = isPrimary;
    existingPresenter.presentationRole = presentationRole;
    existingPresenter.authorType = authorType;
  } else {
    this.presentationDetails.presenters.push({
      authorId,
      authorType,
      isPrimary,
      presentationRole,
      order: this.presentationDetails.presenters.length + 1
    });
  }
  
  // Update presenter flags in coAuthors array
  if (authorType === 'coauthor') {
    const coAuthor = this.coAuthors.find(author => 
      author._id.toString() === authorId.toString()
    );
    if (coAuthor) {
      coAuthor.isPresenter = true;
      coAuthor.isPrimaryPresenter = isPrimary;
    }
  }
};

researchSubmissionSchema.methods.removePresenter = function(authorId) {
  if (!this.presentationDetails || !this.presentationDetails.presenters) {
    return null;
  }
  
  const presenterIndex = this.presentationDetails.presenters.findIndex(
    presenter => presenter.authorId.toString() === authorId.toString()
  );
  
  if (presenterIndex > -1) {
    const removedPresenter = this.presentationDetails.presenters[presenterIndex];
    this.presentationDetails.presenters.splice(presenterIndex, 1);
    
    // Reorder remaining presenters
    this.presentationDetails.presenters.forEach((presenter, index) => {
      presenter.order = index + 1;
    });
    
    // Update presenter flags in coAuthors array
    const coAuthor = this.coAuthors.find(author => 
      author._id.toString() === authorId.toString()
    );
    if (coAuthor) {
      coAuthor.isPresenter = false;
      coAuthor.isPrimaryPresenter = false;
    }
    
    return removedPresenter;
  }
  return null;
};

researchSubmissionSchema.methods.getPresenters = function() {
  if (!this.presentationDetails || !this.presentationDetails.presenters) {
    return [];
  }
  
  return this.presentationDetails.presenters.map(presenter => {
    let authorInfo;
    if (presenter.authorType === 'corresponding') {
      authorInfo = this.correspondingAuthor;
    } else {
      authorInfo = this.coAuthors.find(author => 
        author._id.toString() === presenter.authorId.toString()
      );
    }
    
    return {
      ...presenter.toObject(),
      authorInfo: authorInfo || null
    };
  }).sort((a, b) => a.order - b.order);
};

researchSubmissionSchema.methods.getKnownCollaborators = function() {
  return this.coAuthors.filter(author => author.isKnownCollaborator && author.userId);
};

researchSubmissionSchema.methods.getAllAuthors = function() {
  const allAuthors = [
    {
      ...this.correspondingAuthor,
      type: 'corresponding',
      isPresenter: this.presentationDetails?.presenters?.some(p => 
        p.authorType === 'corresponding'
      ) || false
    }
  ];
  
  this.coAuthors.forEach(author => {
    allAuthors.push({
      ...author.toObject(),
      type: 'coauthor'
    });
  });
  
  return allAuthors.sort((a, b) => (a.order || 0) - (b.order || 0));
};

// Proceedings Management Methods
researchSubmissionSchema.methods.inviteToProceedings = function(invitedBy, deadline = null) {
  if (!deadline) {
    // Default deadline is 6 weeks from invitation
    deadline = new Date();
    deadline.setDate(deadline.getDate() + 42);
  }
  
  this.proceedings = this.proceedings || {};
  this.proceedings.invitationSent = true;
  this.proceedings.invitationSentAt = new Date();
  this.proceedings.invitationSentBy = invitedBy;
  this.proceedings.invitationDeadline = deadline;
  this.status = 'proceedings_invited';
  
  return this;
};

researchSubmissionSchema.methods.respondToProceedings = function(userId, accepted, comments = '') {
  this.proceedings = this.proceedings || {};
  this.proceedings.authorResponse = {
    acceptedInvitation: accepted,
    responseDate: new Date(),
    respondedBy: userId,
    comments
  };
  
  if (!accepted) {
    this.status = 'presented'; // Keep as presented if declined
  }
  
  return this;
};

researchSubmissionSchema.methods.submitProceedingsPaper = function(paperData, uploadedBy) {
  this.proceedings = this.proceedings || {};
  this.proceedings.finalPaper = {
    ...paperData,
    uploadDate: new Date(),
    uploadedBy
  };
  this.proceedings.submittedAt = new Date();
  this.status = 'proceedings_submitted';
  
  return this;
};

researchSubmissionSchema.methods.assignProceedingsEditor = function(editorId, assignedBy) {
  this.proceedings = this.proceedings || {};
  this.proceedings.proceedingsReview = this.proceedings.proceedingsReview || {};
  this.proceedings.proceedingsReview.assignedEditor = editorId;
  this.proceedings.proceedingsReview.assignedAt = new Date();
  this.status = 'proceedings_under_review';
  
  // Add editor to associated users
  this.addAssociatedUser(editorId, 'editor');
  
  return this;
};

researchSubmissionSchema.methods.addProceedingsRevision = function(revisionData, uploadedBy, comments = '') {
  this.proceedings = this.proceedings || {};
  this.proceedings.revisions = this.proceedings.revisions || [];
  
  const versionNumber = this.proceedings.revisions.length + 1;
  
  this.proceedings.revisions.push({
    version: versionNumber,
    ...revisionData,
    uploadDate: new Date(),
    uploadedBy,
    comments
  });
  
  this.status = 'proceedings_revised';
  
  return this;
};

researchSubmissionSchema.methods.makeProceedingsDecision = function(decision, decisionBy, comments = '', revisionDeadline = null) {
  this.proceedings = this.proceedings || {};
  this.proceedings.proceedingsReview = this.proceedings.proceedingsReview || {};
  
  this.proceedings.proceedingsReview.finalDecision = {
    decision,
    decisionDate: new Date(),
    decisionBy,
    comments,
    revisionDeadline
  };
  
  this.proceedings.finalDecisionAt = new Date();
  
  // Update status based on decision
  switch (decision) {
    case 'accept':
      this.status = 'proceedings_accepted';
      break;
    case 'reject':
      this.status = 'proceedings_rejected';
      break;
    case 'revision_required':
      this.status = 'proceedings_revision_required';
      break;
  }
  
  return this;
};

researchSubmissionSchema.methods.publishProceedings = function(publicationData, publishedBy) {
  this.proceedings = this.proceedings || {};
  this.proceedings.publication = {
    ...publicationData,
    publishedAt: new Date(),
    publishedBy
  };
  this.proceedings.publishedAt = new Date();
  this.status = 'published';
  
  return this;
};

researchSubmissionSchema.methods.getProceedingsStatus = function() {
  if (!this.proceedings) {
    return {
      phase: 'not_invited',
      description: 'Not yet invited for proceedings'
    };
  }
  
  const p = this.proceedings;
  
  if (p.publication && p.publication.publishedAt) {
    return {
      phase: 'published',
      description: 'Published in conference proceedings',
      publishedAt: p.publication.publishedAt
    };
  }
  
  if (p.proceedingsReview && p.proceedingsReview.finalDecision) {
    const decision = p.proceedingsReview.finalDecision.decision;
    switch (decision) {
      case 'accept':
        return {
          phase: 'accepted',
          description: 'Accepted for proceedings publication'
        };
      case 'reject':
        return {
          phase: 'rejected',
          description: 'Not accepted for proceedings publication'
        };
      case 'revision_required':
        return {
          phase: 'revision_required',
          description: 'Revision required for proceedings',
          deadline: p.proceedingsReview.finalDecision.revisionDeadline
        };
    }
  }
  
  if (p.finalPaper && p.submittedAt) {
    return {
      phase: 'under_review',
      description: 'Proceedings submission under review',
      submittedAt: p.submittedAt
    };
  }
  
  if (p.authorResponse) {
    if (p.authorResponse.acceptedInvitation) {
      return {
        phase: 'accepted_invitation',
        description: 'Accepted invitation, awaiting submission',
        deadline: p.invitationDeadline
      };
    } else {
      return {
        phase: 'declined_invitation',
        description: 'Declined proceedings invitation'
      };
    }
  }
  
  if (p.invitationSent) {
    return {
      phase: 'invitation_sent',
      description: 'Invited to submit to proceedings',
      deadline: p.invitationDeadline
    };
  }
  
  return {
    phase: 'eligible',
    description: 'Eligible for proceedings invitation'
  };
};

// Static Methods
researchSubmissionSchema.statics.generateSubmissionNumber = function(conferenceYear) {
  // Format: SOBIE-YYYY-###
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `SOBIE-${conferenceYear}-${randomNum}`;
};

researchSubmissionSchema.statics.getByUser = function(userId, status = null) {
  const query = {
    $or: [
      { 'correspondingAuthor.userId': userId },
      { 'coAuthors.userId': userId },
      { 'associatedUsers.userId': userId }
    ]
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('conferenceId', 'name year')
    .populate('correspondingAuthor.userId', 'name email')
    .populate('coAuthors.userId', 'name email')
    .sort({ createdAt: -1 });
};

researchSubmissionSchema.statics.getForReviewer = function(reviewerUserId, status = null) {
  const query = { 'reviewWorkflow.reviewers.userId': reviewerUserId };
  
  if (status) {
    query['reviewWorkflow.reviewers.status'] = status;
  }
  
  return this.find(query)
    .populate('conferenceId', 'name year')
    .populate('correspondingAuthor.userId', 'name email')
    .sort({ 'reviewWorkflow.reviewers.invitedDate': -1 });
};

researchSubmissionSchema.statics.getForEditor = function(editorUserId, status = null) {
  const query = { 'reviewWorkflow.editor.userId': editorUserId };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('conferenceId', 'name year')
    .populate('correspondingAuthor.userId', 'name email')
    .populate('reviewWorkflow.reviewers.userId', 'name email')
    .sort({ 'reviewWorkflow.editor.assignedDate': -1 });
};

// Instance method to update presenter availability
researchSubmissionSchema.methods.updatePresenterAvailability = function(availabilityData) {
  if (!this.presentationDetails) {
    this.presentationDetails = {};
  }
  
  if (!this.presentationDetails.presenterAvailability) {
    this.presentationDetails.presenterAvailability = {
      wednesday: { am: { available: true }, pm: { available: true } },
      thursday: { am: { available: true }, pm: { available: true } },
      friday: { am: { available: true }, pm: { available: true } }
    };
  }
  
  // Update each day's availability
  ['wednesday', 'thursday', 'friday'].forEach(day => {
    if (availabilityData[day]) {
      ['am', 'pm'].forEach(period => {
        if (availabilityData[day][period]) {
          this.presentationDetails.presenterAvailability[day][period] = {
            available: availabilityData[day][period].available !== false,
            conflictNote: availabilityData[day][period].conflictNote || ''
          };
        }
      });
    }
  });
  
  // Update general notes if provided
  if (availabilityData.generalNotes !== undefined) {
    this.presentationDetails.presenterAvailability.generalNotes = availabilityData.generalNotes;
  }
  
  // Update timestamp
  this.presentationDetails.presenterAvailability.updatedAt = new Date();
  
  return this.presentationDetails.presenterAvailability;
};

// Instance method to get presenter conflicts summary
researchSubmissionSchema.methods.getPresenterConflictsSummary = function() {
  if (!this.presentationDetails?.presenterAvailability) {
    return { hasConflicts: false, conflicts: [] };
  }
  
  const availability = this.presentationDetails.presenterAvailability;
  const conflicts = [];
  
  ['wednesday', 'thursday', 'friday'].forEach(day => {
    ['am', 'pm'].forEach(period => {
      if (!availability[day]?.[period]?.available) {
        conflicts.push({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          period: period.toUpperCase(),
          note: availability[day][period].conflictNote || 'No reason provided'
        });
      }
    });
  });
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    generalNotes: availability.generalNotes || '',
    totalAvailableSlots: 6 - conflicts.length,
    lastUpdated: availability.updatedAt
  };
};

// Pre-save middleware
researchSubmissionSchema.pre('save', function(next) {
  // Generate submission number if not exists
  if (!this.submissionNumber && this.conferenceYear) {
    this.submissionNumber = this.constructor.generateSubmissionNumber(this.conferenceYear);
  }
  
  // Set initial submission date
  if (!this.initialSubmissionDate && this.status === 'submitted') {
    this.initialSubmissionDate = new Date();
  }
  
  // Check if this is student research
  const hasStudentAuthor = this.coAuthors.some(author => author.isStudentAuthor);
  this.isStudentResearch = hasStudentAuthor;
  
  // Update last modified date
  this.lastModifiedDate = new Date();
  
  // Set up associated users
  const associatedUserIds = new Set();
  
  // Add corresponding author
  associatedUserIds.add(this.correspondingAuthor.userId.toString());
  this.addAssociatedUser(this.correspondingAuthor.userId, 'author');
  
  // Add co-authors
  this.coAuthors.forEach(author => {
    if (author.userId) {
      associatedUserIds.add(author.userId.toString());
      this.addAssociatedUser(
        author.userId, 
        author.isStudentAuthor ? 'student' : 'co_author'
      );
    }
  });
  
  // Add reviewers
  this.reviewWorkflow.reviewers.forEach(reviewer => {
    associatedUserIds.add(reviewer.userId.toString());
    this.addAssociatedUser(reviewer.userId, 'reviewer');
  });
  
  // Add editor
  if (this.reviewWorkflow.editor.userId) {
    associatedUserIds.add(this.reviewWorkflow.editor.userId.toString());
    this.addAssociatedUser(this.reviewWorkflow.editor.userId, 'editor');
  }
  
  next();
});

module.exports = mongoose.model('ResearchSubmission', researchSubmissionSchema);
