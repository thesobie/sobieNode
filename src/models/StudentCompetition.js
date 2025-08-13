const mongoose = require('mongoose');

/**
 * Student Competition Model
 * Handles student research competitions for conferences
 */

const studentCompetitionSchema = new mongoose.Schema({
  // Competition Details
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  competitionType: {
    type: String,
    enum: ['undergraduate', 'graduate', 'mixed'],
    required: true
  },
  
  category: {
    type: String,
    required: true,
    trim: true
  },
  
  // Conference Association
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: true
  },
  
  // Competition Timeline
  submissionDeadline: {
    type: Date,
    required: true
  },
  
  judgingDate: {
    type: Date,
    required: true
  },
  
  announcementDate: {
    type: Date,
    required: true
  },
  
  // Participants
  participants: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    researchSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchSubmission'
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    institution: {
      type: String,
      required: true
    },
    submissionDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['submitted', 'under-review', 'accepted', 'rejected'],
      default: 'submitted'
    }
  }],
  
  // Judging Panel
  judges: [{
    judgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    expertise: [String],
    assignedDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Judging Criteria
  judgingCriteria: [{
    criterion: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    description: String
  }],
  
  // Scores and Results
  scores: [{
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    judgeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    criteriaScores: [{
      criterion: String,
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      comments: String
    }],
    totalScore: {
      type: Number,
      min: 0,
      max: 100
    },
    feedback: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Awards and Recognition
  awards: [{
    place: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    prize: {
      monetary: Number,
      description: String,
      sponsor: String
    },
    certificate: {
      issued: {
        type: Boolean,
        default: false
      },
      issuedDate: Date,
      certificateUrl: String
    }
  }],
  
  // Competition Settings
  settings: {
    maxParticipants: {
      type: Number,
      default: 50
    },
    presentationRequired: {
      type: Boolean,
      default: true
    },
    presentationDuration: {
      type: Number, // minutes
      default: 15
    },
    qaDuration: {
      type: Number, // minutes
      default: 5
    },
    anonymousJudging: {
      type: Boolean,
      default: false
    }
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['draft', 'open', 'closed', 'judging', 'completed'],
    default: 'draft'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
studentCompetitionSchema.index({ conferenceId: 1, competitionType: 1 });
studentCompetitionSchema.index({ status: 1, submissionDeadline: 1 });
studentCompetitionSchema.index({ 'participants.studentId': 1 });
studentCompetitionSchema.index({ 'judges.judgeId': 1 });

// Methods
studentCompetitionSchema.methods.calculateFinalScores = function() {
  const participantScores = new Map();
  
  // Calculate average scores for each participant
  this.scores.forEach(score => {
    const participantId = score.participantId.toString();
    if (!participantScores.has(participantId)) {
      participantScores.set(participantId, []);
    }
    participantScores.get(participantId).push(score.totalScore);
  });
  
  // Calculate averages and rank
  const finalScores = [];
  participantScores.forEach((scores, participantId) => {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    finalScores.push({ participantId, averageScore: average });
  });
  
  return finalScores.sort((a, b) => b.averageScore - a.averageScore);
};

studentCompetitionSchema.methods.isJudgingComplete = function() {
  const totalExpectedScores = this.participants.length * this.judges.length;
  return this.scores.length >= totalExpectedScores;
};

studentCompetitionSchema.methods.getParticipantRank = function(participantId) {
  const finalScores = this.calculateFinalScores();
  const rank = finalScores.findIndex(score => score.participantId.toString() === participantId.toString());
  return rank >= 0 ? rank + 1 : null;
};

// Virtuals
studentCompetitionSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

studentCompetitionSchema.virtual('judgeCount').get(function() {
  return this.judges.length;
});

studentCompetitionSchema.virtual('isSubmissionOpen').get(function() {
  return this.status === 'open' && new Date() < this.submissionDeadline;
});

// Middleware
studentCompetitionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

studentCompetitionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('StudentCompetition', studentCompetitionSchema);
