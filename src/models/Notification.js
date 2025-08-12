const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification Basic Information
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [150, 'Title cannot be more than 150 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  
  // Notification Type and Priority
  type: {
    type: String,
    enum: [
      'message', 'announcement', 'schedule_change', 'activity_update',
      'deadline_reminder', 'system_alert', 'welcome', 'confirmation',
      'invitation', 'reminder', 'warning', 'error'
    ],
    required: [true, 'Notification type is required']
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Recipient Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  
  // Status and Interaction
  status: {
    type: String,
    enum: ['unread', 'read', 'dismissed', 'archived'],
    default: 'unread'
  },
  readAt: Date,
  dismissedAt: Date,
  
  // Source and Context
  sourceType: {
    type: String,
    enum: ['system', 'user', 'admin', 'coordinator', 'automated']
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceModel'
  },
  sourceModel: {
    type: String,
    enum: ['User', 'Message', 'Session', 'CommunityActivity', 'Conference']
  },
  
  // Associated Entities
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference'
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityActivity'
  },
  
  // Action and Navigation
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionType: {
    type: String,
    enum: ['none', 'view', 'respond', 'confirm', 'update', 'download', 'rsvp']
  },
  actionUrl: String,
  actionData: mongoose.Schema.Types.Mixed,
  
  // Delivery Channels
  channels: {
    inApp: {
      sent: { type: Boolean, default: true },
      sentAt: { type: Date, default: Date.now }
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      emailId: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      smsId: String
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      pushId: String
    }
  },
  
  // Scheduling
  scheduledFor: Date,
  expiresAt: Date,
  
  // Rich Content
  icon: {
    type: String,
    enum: [
      'info', 'warning', 'error', 'success', 'message', 'calendar',
      'location', 'user', 'bell', 'clock', 'exclamation', 'check'
    ],
    default: 'info'
  },
  color: {
    type: String,
    enum: ['blue', 'green', 'yellow', 'red', 'purple', 'gray'],
    default: 'blue'
  },
  
  // Grouping and Batching
  groupKey: String, // For grouping related notifications
  batchId: String,  // For batch notifications
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ conferenceId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ groupKey: 1, userId: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });

// Virtual for age in minutes
notificationSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
});

// Virtual for is urgent
notificationSchema.virtual('isUrgent').get(function() {
  return this.priority === 'urgent' || this.priority === 'high';
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  if (this.status === 'unread') {
    this.status = 'read';
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to dismiss notification
notificationSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  this.dismissedAt = new Date();
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  // Check for duplicate notifications
  if (notificationData.groupKey) {
    const existing = await this.findOne({
      userId: notificationData.userId,
      groupKey: notificationData.groupKey,
      status: { $in: ['unread', 'read'] }
    });
    
    if (existing) {
      // Update existing notification instead of creating duplicate
      Object.assign(existing, {
        ...notificationData,
        createdAt: new Date(),
        status: 'unread',
        readAt: undefined
      });
      return existing.save();
    }
  }
  
  return this.create(notificationData);
};

// Static method to get user's notifications
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    status,
    type,
    conferenceId,
    limit = 50,
    skip = 0,
    includeRead = true
  } = options;
  
  const filter = { userId };
  
  if (status) {
    filter.status = status;
  } else if (!includeRead) {
    filter.status = { $ne: 'read' };
  }
  
  if (type) {
    filter.type = type;
  }
  
  if (conferenceId) {
    filter.conferenceId = conferenceId;
  }
  
  return this.find(filter)
    .populate('sourceId')
    .populate('conferenceId', 'name year')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get notification counts
notificationSchema.statics.getNotificationCounts = function(userId, conferenceId = null) {
  const pipeline = [
    { $match: { userId: mongoose.Types.ObjectId(userId) } }
  ];
  
  if (conferenceId) {
    pipeline.push({ $match: { conferenceId: mongoose.Types.ObjectId(conferenceId) } });
  }
  
  pipeline.push({
    $group: {
      _id: '$status',
      count: { $sum: 1 }
    }
  });
  
  return this.aggregate(pipeline).then(results => {
    const counts = { unread: 0, read: 0, dismissed: 0, total: 0 };
    results.forEach(result => {
      counts[result._id] = result.count;
      counts.total += result.count;
    });
    return counts;
  });
};

// Static method to mark multiple notifications as read
notificationSchema.statics.markMultipleAsRead = function(userId, notificationIds) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      userId,
      status: 'unread'
    },
    {
      $set: {
        status: 'read',
        readAt: new Date()
      }
    }
  );
};

// Static method to cleanup old notifications
notificationSchema.statics.cleanupOldNotifications = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    status: { $in: ['read', 'dismissed'] },
    createdAt: { $lt: cutoffDate }
  });
};

// Static method for bulk notification creation
notificationSchema.statics.createBulkNotifications = async function(userIds, baseNotification) {
  const batchId = new mongoose.Types.ObjectId().toString();
  
  const notifications = userIds.map(userId => ({
    ...baseNotification,
    userId,
    batchId
  }));
  
  return this.insertMany(notifications);
};

module.exports = mongoose.model('Notification', notificationSchema);
