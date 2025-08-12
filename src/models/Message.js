const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Message Basic Information
  subject: {
    type: String,
    required: [true, 'Message subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [5000, 'Message content cannot be more than 5000 characters']
  },
  
  // Message Type and Context
  messageType: {
    type: String,
    enum: ['direct', 'group', 'announcement', 'system', 'schedule_change'],
    required: [true, 'Message type is required']
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Sender Information
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  senderRole: {
    type: String,
    enum: ['user', 'admin', 'coordinator', 'system'],
    required: [true, 'Sender role is required']
  },
  
  // Recipients
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: Date,
    readStatus: {
      type: String,
      enum: ['unread', 'read', 'archived'],
      default: 'unread'
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationMethod: {
      type: String,
      enum: ['email', 'sms', 'push', 'none'],
      default: 'none'
    }
  }],
  
  // Context and Associations
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference'
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityActivity'
  },
  
  // Message Threading
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message' // For reply threads
  },
  isReply: {
    type: Boolean,
    default: false
  },
  replyToMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // Schedule Change Specific Fields
  scheduleChange: {
    changeType: {
      type: String,
      enum: ['time_change', 'location_change', 'cancellation', 'addition', 'speaker_change', 'content_change'],
    },
    originalData: {
      time: String,
      location: String,
      speaker: String,
      title: String,
      description: String,
      duration: String
    },
    newData: {
      time: String,
      location: String,
      speaker: String,
      title: String,
      description: String,
      duration: String
    },
    effectiveDate: Date,
    reason: {
      type: String,
      maxlength: [500, 'Change reason cannot be more than 500 characters']
    }
  },
  
  // Delivery and Status
  deliveryStatus: {
    type: String,
    enum: ['draft', 'sending', 'sent', 'failed', 'cancelled'],
    default: 'draft'
  },
  scheduledSendTime: Date,
  actualSendTime: Date,
  
  // Engagement Tracking
  totalRecipients: {
    type: Number,
    default: 0
  },
  readCount: {
    type: Number,
    default: 0
  },
  
  // Message Features
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Rich Content Support
  formatting: {
    hasMarkdown: {
      type: Boolean,
      default: false
    },
    hasHTML: {
      type: Boolean,
      default: false
    },
    richContent: {
      type: mongoose.Schema.Types.Mixed // For rich text formatting
    }
  },
  
  // Message Actions
  actions: [{
    type: {
      type: String,
      enum: ['rsvp', 'confirm', 'reply_required', 'survey', 'link', 'download']
    },
    label: String,
    url: String,
    data: mongoose.Schema.Types.Mixed,
    responses: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      response: mongoose.Schema.Types.Mixed,
      respondedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  // Expiration and Archive
  expiresAt: Date,
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ conferenceId: 1, messageType: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ 'recipients.userId': 1, 'recipients.readStatus': 1 });
messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ deliveryStatus: 1, scheduledSendTime: 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for read percentage
messageSchema.virtual('readPercentage').get(function() {
  if (this.totalRecipients === 0) return 0;
  return Math.round((this.readCount / this.totalRecipients) * 100);
});

// Virtual for unread count
messageSchema.virtual('unreadCount').get(function() {
  return this.totalRecipients - this.readCount;
});

// Instance method to mark as read by user
messageSchema.methods.markAsRead = function(userId) {
  const recipient = this.recipients.find(r => r.userId.toString() === userId.toString());
  if (recipient && recipient.readStatus === 'unread') {
    recipient.readStatus = 'read';
    recipient.readAt = new Date();
    this.readCount = this.recipients.filter(r => r.readStatus === 'read').length;
  }
  return this.save();
};

// Instance method to add reply
messageSchema.methods.addReply = function(replyData) {
  const Message = mongoose.model('Message');
  
  return new Message({
    ...replyData,
    isReply: true,
    replyToMessageId: this._id,
    threadId: this.threadId || this._id,
    conferenceId: this.conferenceId
  });
};

// Instance method to get formatted schedule change content
messageSchema.methods.getScheduleChangeHTML = function() {
  if (this.messageType !== 'schedule_change' || !this.scheduleChange) {
    return this.content;
  }
  
  const { originalData, newData, changeType } = this.scheduleChange;
  let html = this.content + '<br><br>';
  
  html += '<div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 10px 0;">';
  html += '<h4 style="color: #dc3545; margin-top: 0;">Schedule Change Details</h4>';
  
  if (changeType === 'time_change' && originalData.time && newData.time) {
    html += `<p><strong>Time:</strong> <span style="text-decoration: line-through; color: #6c757d;">${originalData.time}</span> → <span style="color: #28a745; font-weight: bold;">${newData.time}</span></p>`;
  }
  
  if (changeType === 'location_change' && originalData.location && newData.location) {
    html += `<p><strong>Location:</strong> <span style="text-decoration: line-through; color: #6c757d;">${originalData.location}</span> → <span style="color: #28a745; font-weight: bold;">${newData.location}</span></p>`;
  }
  
  if (changeType === 'speaker_change' && originalData.speaker && newData.speaker) {
    html += `<p><strong>Speaker:</strong> <span style="text-decoration: line-through; color: #6c757d;">${originalData.speaker}</span> → <span style="color: #28a745; font-weight: bold;">${newData.speaker}</span></p>`;
  }
  
  if (changeType === 'content_change' && originalData.title && newData.title) {
    html += `<p><strong>Title:</strong> <span style="text-decoration: line-through; color: #6c757d;">${originalData.title}</span> → <span style="color: #28a745; font-weight: bold;">${newData.title}</span></p>`;
  }
  
  if (this.scheduleChange.reason) {
    html += `<p><strong>Reason:</strong> ${this.scheduleChange.reason}</p>`;
  }
  
  if (this.scheduleChange.effectiveDate) {
    html += `<p><strong>Effective:</strong> ${this.scheduleChange.effectiveDate.toLocaleString()}</p>`;
  }
  
  html += '</div>';
  
  return html;
};

// Static method to get user's messages
messageSchema.statics.getUserMessages = function(userId, options = {}) {
  const {
    messageType,
    readStatus,
    conferenceId,
    limit = 50,
    skip = 0
  } = options;
  
  const pipeline = [
    {
      $match: {
        'recipients.userId': mongoose.Types.ObjectId(userId)
      }
    },
    {
      $addFields: {
        userRecipient: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$recipients',
                cond: { $eq: ['$$this.userId', mongoose.Types.ObjectId(userId)] }
              }
            },
            0
          ]
        }
      }
    }
  ];
  
  // Add filters
  if (messageType) {
    pipeline.push({ $match: { messageType } });
  }
  
  if (readStatus) {
    pipeline.push({ $match: { 'userRecipient.readStatus': readStatus } });
  }
  
  if (conferenceId) {
    pipeline.push({ $match: { conferenceId: mongoose.Types.ObjectId(conferenceId) } });
  }
  
  // Add sorting, population, and pagination
  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'senderId',
        foreignField: '_id',
        as: 'sender'
      }
    },
    {
      $lookup: {
        from: 'conferences',
        localField: 'conferenceId',
        foreignField: '_id',
        as: 'conference'
      }
    }
  );
  
  return this.aggregate(pipeline);
};

// Static method to create announcement
messageSchema.statics.createAnnouncement = function(announcementData) {
  return new this({
    messageType: 'announcement',
    senderRole: 'admin',
    deliveryStatus: 'draft',
    ...announcementData
  });
};

// Static method to create schedule change notification
messageSchema.statics.createScheduleChange = function(sessionId, changes, senderId, reason) {
  return new this({
    messageType: 'schedule_change',
    senderRole: 'admin',
    sessionId,
    senderId,
    subject: `Schedule Change: ${changes.originalData.title || 'Session Update'}`,
    content: `Important: There has been a change to your session schedule. Please review the details below.`,
    scheduleChange: {
      ...changes,
      reason,
      effectiveDate: new Date()
    },
    priority: 'high',
    deliveryStatus: 'draft'
  });
};

module.exports = mongoose.model('Message', messageSchema);
