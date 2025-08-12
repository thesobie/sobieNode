const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const bugReportSchema = new mongoose.Schema({
  // User information
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Bug report details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  
  // Bug categorization
  category: {
    type: String,
    enum: [
      'ui_ux',           // User Interface/User Experience
      'functionality',   // Feature not working as expected
      'performance',     // Speed/loading issues
      'data',           // Data inconsistency/corruption
      'security',       // Security vulnerabilities
      'mobile',         // Mobile-specific issues
      'integration',    // Third-party integration issues
      'other'           // Other issues
    ],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Environment information
  environment: {
    browser: String,
    browserVersion: String,
    operatingSystem: String,
    screenResolution: String,
    userAgent: String,
    url: String,          // URL where bug occurred
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  // Reproduction steps
  stepsToReproduce: [{
    step: Number,
    description: String
  }],
  
  expectedBehavior: {
    type: String,
    maxlength: 1000
  },
  
  actualBehavior: {
    type: String,
    maxlength: 1000
  },
  
  // Additional context
  additionalContext: {
    type: String,
    maxlength: 2000
  },
  
  // Attachments (screenshots, logs, etc.)
  attachments: [{
    filename: String,
    fileType: String,
    fileSize: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // GitHub integration
  githubIssue: {
    issueNumber: Number,
    issueUrl: String,
    createdAt: Date,
    status: {
      type: String,
      enum: ['pending', 'created', 'failed'],
      default: 'pending'
    },
    errorMessage: String
  },
  
  // Internal tracking
  status: {
    type: String,
    enum: [
      'submitted',      // Just submitted by user
      'triaged',        // Reviewed by team
      'in_progress',    // Being worked on
      'resolved',       // Fixed
      'closed',         // Closed (resolved or won't fix)
      'duplicate'       // Duplicate of another issue
    ],
    default: 'submitted'
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // User feedback
  userCanContact: {
    type: Boolean,
    default: true
  },
  
  contactPreference: {
    type: String,
    enum: ['email', 'in_app', 'none'],
    default: 'in_app'
  },
  
  // Tags for categorization
  tags: [String],
  
  // Resolution information
  resolution: {
    type: String,
    maxlength: 1000
  },
  
  resolvedAt: Date,
  
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Metrics
  timeToResolve: Number, // in hours
  
  // Related entities
  relatedConference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference'
  },
  
  relatedSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  
  relatedSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResearchSubmission'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bugReportSchema.index({ reporterId: 1, createdAt: -1 });
bugReportSchema.index({ status: 1, createdAt: -1 });
bugReportSchema.index({ category: 1, severity: 1 });
bugReportSchema.index({ 'githubIssue.issueNumber': 1 });
bugReportSchema.index({ assignedTo: 1, status: 1 });

// Add pagination plugin
bugReportSchema.plugin(mongoosePaginate);

// Virtual for GitHub issue URL
bugReportSchema.virtual('githubUrl').get(function() {
  if (this.githubIssue && this.githubIssue.issueUrl) {
    return this.githubIssue.issueUrl;
  }
  return null;
});

// Virtual for time since reported
bugReportSchema.virtual('timeSinceReported').get(function() {
  const now = new Date();
  const reported = this.createdAt;
  const diffInHours = Math.floor((now - reported) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Less than an hour ago';
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
});

// Method to create GitHub issue description
bugReportSchema.methods.generateGithubIssueBody = function() {
  let body = `## Bug Report\n\n`;
  
  // Basic information
  body += `**Reported by:** ${this.reporterId?.name?.firstName} ${this.reporterId?.name?.lastName} (${this.reporterId?.email})\n`;
  body += `**Category:** ${this.category.replace('_', ' ').toUpperCase()}\n`;
  body += `**Severity:** ${this.severity.toUpperCase()}\n`;
  body += `**Priority:** ${this.priority.toUpperCase()}\n\n`;
  
  // Description
  body += `## Description\n${this.description}\n\n`;
  
  // Steps to reproduce
  if (this.stepsToReproduce && this.stepsToReproduce.length > 0) {
    body += `## Steps to Reproduce\n`;
    this.stepsToReproduce.forEach((step, index) => {
      body += `${index + 1}. ${step.description}\n`;
    });
    body += '\n';
  }
  
  // Expected vs Actual behavior
  if (this.expectedBehavior) {
    body += `## Expected Behavior\n${this.expectedBehavior}\n\n`;
  }
  
  if (this.actualBehavior) {
    body += `## Actual Behavior\n${this.actualBehavior}\n\n`;
  }
  
  // Environment information
  if (this.environment) {
    body += `## Environment\n`;
    if (this.environment.browser) body += `- **Browser:** ${this.environment.browser} ${this.environment.browserVersion || ''}\n`;
    if (this.environment.operatingSystem) body += `- **OS:** ${this.environment.operatingSystem}\n`;
    if (this.environment.screenResolution) body += `- **Screen Resolution:** ${this.environment.screenResolution}\n`;
    if (this.environment.url) body += `- **URL:** ${this.environment.url}\n`;
    body += `- **Timestamp:** ${this.environment.timestamp}\n\n`;
  }
  
  // Additional context
  if (this.additionalContext) {
    body += `## Additional Context\n${this.additionalContext}\n\n`;
  }
  
  // Attachments
  if (this.attachments && this.attachments.length > 0) {
    body += `## Attachments\n`;
    this.attachments.forEach(attachment => {
      body += `- [${attachment.filename}](${attachment.url})\n`;
    });
    body += '\n';
  }
  
  // Internal tracking
  body += `---\n`;
  body += `**Internal ID:** ${this._id}\n`;
  body += `**Contact User:** ${this.userCanContact ? 'Yes' : 'No'}\n`;
  body += `**Contact Preference:** ${this.contactPreference}\n`;
  
  return body;
};

// Method to generate GitHub labels
bugReportSchema.methods.generateGithubLabels = function() {
  const labels = ['bug', 'user-reported'];
  
  // Add category label
  labels.push(`category:${this.category}`);
  
  // Add severity label
  labels.push(`severity:${this.severity}`);
  
  // Add priority label if high or urgent
  if (this.priority === 'high' || this.priority === 'urgent') {
    labels.push(`priority:${this.priority}`);
  }
  
  // Add environment labels
  if (this.environment?.browser) {
    labels.push(`browser:${this.environment.browser.toLowerCase()}`);
  }
  
  if (this.environment?.operatingSystem) {
    const os = this.environment.operatingSystem.toLowerCase();
    if (os.includes('windows')) labels.push('os:windows');
    else if (os.includes('mac') || os.includes('darwin')) labels.push('os:macos');
    else if (os.includes('linux')) labels.push('os:linux');
    else if (os.includes('android')) labels.push('os:android');
    else if (os.includes('ios')) labels.push('os:ios');
  }
  
  return labels;
};

// Static method to get bug statistics
bugReportSchema.statics.getBugStatistics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalBugs: { $sum: 1 },
        byStatus: {
          $push: '$status'
        },
        byCategory: {
          $push: '$category'
        },
        bySeverity: {
          $push: '$severity'
        },
        avgTimeToResolve: {
          $avg: '$timeToResolve'
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  
  if (result.length === 0) {
    return {
      totalBugs: 0,
      byStatus: {},
      byCategory: {},
      bySeverity: {},
      avgTimeToResolve: 0
    };
  }
  
  const stats = result[0];
  
  // Count occurrences
  const countOccurrences = (arr) => {
    return arr.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});
  };
  
  return {
    totalBugs: stats.totalBugs,
    byStatus: countOccurrences(stats.byStatus),
    byCategory: countOccurrences(stats.byCategory),
    bySeverity: countOccurrences(stats.bySeverity),
    avgTimeToResolve: Math.round(stats.avgTimeToResolve || 0)
  };
};

module.exports = mongoose.model('BugReport', bugReportSchema);
