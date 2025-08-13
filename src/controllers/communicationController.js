const { catchAsync } = require('../utils/catchAsync');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Conference = require('../models/Conference');
const Session = require('../models/Session');
const mongoose = require('mongoose');

// @desc    Get user's messages inbox
// @route   GET /api/communications/messages
// @access  Private
const getMessages = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const {
    type,
    status,
    conferenceId,
    page = 1,
    limit = 20,
    search
  } = req.query;

  const options = {
    messageType: type,
    readStatus: status,
    conferenceId,
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit)
  };

  let messages = await Message.getUserMessages(userId, options);

  // Apply search filter if provided
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    messages = messages.filter(msg => 
      searchRegex.test(msg.subject) || 
      searchRegex.test(msg.content) ||
      (msg.sender && msg.sender[0] && searchRegex.test(msg.sender[0].name?.firstName + ' ' + msg.sender[0].name?.lastName))
    );
  }

  // Get unread count
  const unreadCount = await Message.aggregate([
    {
      $match: {
        'recipients.userId': userId,
        'recipients.readStatus': 'unread'
      }
    },
    { $count: 'unread' }
  ]);

  res.json({
    success: true,
    data: {
      messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(messages.length / parseInt(limit)),
        totalMessages: messages.length,
        hasNextPage: parseInt(page) * parseInt(limit) < messages.length
      },
      unreadCount: unreadCount[0]?.unread || 0
    }
  });
});

// @desc    Get specific message with thread
// @route   GET /api/communications/messages/:messageId
// @access  Private
const getMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  // Get the main message
  const message = await Message.findOne({
    _id: messageId,
    'recipients.userId': userId
  })
    .populate('senderId', 'name email affiliation')
    .populate('conferenceId', 'name year location')
    .populate('sessionId', 'title track scheduledTime location');

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  // Mark as read
  await message.markAsRead(userId);

  // Get thread messages if this is part of a thread
  let threadMessages = [];
  if (message.threadId || message.isReply) {
    const threadId = message.threadId || message._id;
    threadMessages = await Message.find({
      $or: [
        { _id: threadId },
        { threadId: threadId }
      ]
    })
      .populate('senderId', 'name email affiliation')
      .sort({ createdAt: 1 });
  }

  // Generate HTML content for schedule changes
  let htmlContent = message.content;
  if (message.messageType === 'schedule_change') {
    htmlContent = message.getScheduleChangeHTML();
  }

  res.json({
    success: true,
    data: {
      message: {
        ...message.toObject(),
        htmlContent
      },
      thread: threadMessages,
      userRecipient: message.recipients.find(r => r.userId.toString() === userId.toString())
    }
  });
});

// @desc    Send a new message
// @route   POST /api/communications/messages
// @access  Private
const sendMessage = catchAsync(async (req, res) => {
  const senderId = req.user._id;
  const {
    subject,
    content,
    messageType = 'direct',
    priority = 'normal',
    recipientIds,
    conferenceId,
    sessionId,
    activityId,
    scheduledSendTime,
    attachments = []
  } = req.body;

  // Validate recipients
  if (!recipientIds || recipientIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one recipient is required'
    });
  }

  // Verify recipients exist
  const recipients = await User.find({
    _id: { $in: recipientIds },
    isActive: true
  }).select('_id email name');

  if (recipients.length !== recipientIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Some recipients were not found or are inactive'
    });
  }

  // Create message
  const message = new Message({
    subject,
    content,
    messageType,
    priority,
    senderId,
    senderRole: req.user.primaryRole,
    recipients: recipients.map(user => ({
      userId: user._id,
      readStatus: 'unread',
      notificationSent: false
    })),
    conferenceId,
    sessionId,
    activityId,
    attachments,
    scheduledSendTime: scheduledSendTime ? new Date(scheduledSendTime) : undefined,
    deliveryStatus: scheduledSendTime ? 'draft' : 'sending',
    totalRecipients: recipients.length,
    actualSendTime: scheduledSendTime ? undefined : new Date()
  });

  await message.save();

  // If not scheduled, send immediately
  if (!scheduledSendTime) {
    await sendMessageNotifications(message, recipients);
    message.deliveryStatus = 'sent';
    await message.save();
  }

  res.status(201).json({
    success: true,
    message: scheduledSendTime ? 'Message scheduled successfully' : 'Message sent successfully',
    data: { message }
  });
});

// @desc    Reply to a message
// @route   POST /api/communications/messages/:messageId/reply
// @access  Private
const replyToMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const senderId = req.user._id;
  const { content, replyToAll = false } = req.body;

  // Get original message
  const originalMessage = await Message.findById(messageId)
    .populate('senderId', '_id name email');

  if (!originalMessage) {
    return res.status(404).json({
      success: false,
      message: 'Original message not found'
    });
  }

  // Determine recipients
  let recipientIds = [originalMessage.senderId._id];
  if (replyToAll) {
    recipientIds = [
      ...recipientIds,
      ...originalMessage.recipients
        .map(r => r.userId)
        .filter(id => id.toString() !== senderId.toString())
    ];
    // Remove duplicates
    recipientIds = [...new Set(recipientIds.map(id => id.toString()))];
  }

  // Create reply message
  const replyMessage = originalMessage.addReply({
    subject: `Re: ${originalMessage.subject}`,
    content,
    messageType: originalMessage.messageType,
    priority: originalMessage.priority,
    senderId,
    senderRole: req.user.primaryRole,
    recipients: recipientIds.map(id => ({
      userId: id,
      readStatus: 'unread'
    })),
    conferenceId: originalMessage.conferenceId,
    sessionId: originalMessage.sessionId,
    activityId: originalMessage.activityId,
    deliveryStatus: 'sending',
    totalRecipients: recipientIds.length,
    actualSendTime: new Date()
  });

  await replyMessage.save();

  // Send notifications
  const recipients = await User.find({ _id: { $in: recipientIds } });
  await sendMessageNotifications(replyMessage, recipients);
  
  replyMessage.deliveryStatus = 'sent';
  await replyMessage.save();

  res.status(201).json({
    success: true,
    message: 'Reply sent successfully',
    data: { message: replyMessage }
  });
});

// @desc    Create and send announcement
// @route   POST /api/communications/announcements
// @access  Private (Admin/Conference roles)
const sendAnnouncement = catchAsync(async (req, res) => {
  // Check permissions
  if (!req.user.hasRole('admin') && !req.user.hasRole('conference-chairperson') && !req.user.hasRole('editor')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin, Conference Chairperson, or Editor role required.'
    });
  }

  const {
    subject,
    content,
    priority = 'normal',
    conferenceId,
    targetAudience = 'all', // all, students, academics, specific_roles
    specificRoles = [],
    scheduledSendTime
  } = req.body;

  // Verify conference
  const conference = await Conference.findById(conferenceId);
  if (!conference) {
    return res.status(404).json({
      success: false,
      message: 'Conference not found'
    });
  }

  // Determine recipients based on target audience
  let recipientFilter = { isActive: true };
  
  if (targetAudience === 'students') {
    recipientFilter.userType = 'student';
  } else if (targetAudience === 'academics') {
    recipientFilter.userType = 'academic';
  } else if (targetAudience === 'specific_roles' && specificRoles.length > 0) {
    recipientFilter.roles = { $in: specificRoles };
  }

  // For conference-specific announcements, we might want to filter by conference registration
  // This would require a ConferenceRegistration model or similar

  const recipients = await User.find(recipientFilter).select('_id email name');

  // Create announcement message
  const announcement = Message.createAnnouncement({
    subject,
    content,
    priority,
    senderId: req.user._id,
    recipients: recipients.map(user => ({
      userId: user._id,
      readStatus: 'unread'
    })),
    conferenceId,
    scheduledSendTime: scheduledSendTime ? new Date(scheduledSendTime) : undefined,
    deliveryStatus: scheduledSendTime ? 'draft' : 'sending',
    totalRecipients: recipients.length,
    actualSendTime: scheduledSendTime ? undefined : new Date()
  });

  await announcement.save();

  // Send immediately if not scheduled
  if (!scheduledSendTime) {
    await sendAnnouncementNotifications(announcement, recipients);
    announcement.deliveryStatus = 'sent';
    await announcement.save();
  }

  res.status(201).json({
    success: true,
    message: `Announcement ${scheduledSendTime ? 'scheduled' : 'sent'} to ${recipients.length} recipients`,
    data: {
      announcement,
      recipientCount: recipients.length,
      targetAudience
    }
  });
});

// @desc    Create schedule change notification
// @route   POST /api/communications/schedule-changes
// @access  Private (Admin/Editor)
const sendScheduleChangeNotification = catchAsync(async (req, res) => {
  // Check permissions
  if (!req.user.hasRole('admin') && !req.user.hasRole('editor')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Editor role required.'
    });
  }

  const {
    sessionId,
    changeType,
    originalData,
    newData,
    reason,
    customMessage = ''
  } = req.body;

  // Get session details
  const session = await Session.findById(sessionId)
    .populate('presentations.submissionId', 'correspondingAuthor coAuthors title')
    .populate('conferenceId', 'name year');

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }

  // Get all affected users (presenters, co-authors, etc.)
  const affectedUserIds = new Set();
  
  session.presentations.forEach(presentation => {
    const submission = presentation.submissionId;
    if (submission) {
      // Add corresponding author
      if (submission.correspondingAuthor.userId) {
        affectedUserIds.add(submission.correspondingAuthor.userId.toString());
      }
      
      // Add co-authors
      submission.coAuthors.forEach(coAuthor => {
        if (coAuthor.userId) {
          affectedUserIds.add(coAuthor.userId.toString());
        }
      });
    }
  });

  const recipients = await User.find({
    _id: { $in: Array.from(affectedUserIds) }
  }).select('_id email name');

  // Create schedule change message
  const scheduleChangeMessage = Message.createScheduleChange(
    sessionId,
    { changeType, originalData, newData },
    req.user._id,
    reason
  );

  // Add custom message if provided
  if (customMessage) {
    scheduleChangeMessage.content = `${customMessage}\n\n${scheduleChangeMessage.content}`;
  }

  scheduleChangeMessage.recipients = recipients.map(user => ({
    userId: user._id,
    readStatus: 'unread'
  }));
  scheduleChangeMessage.totalRecipients = recipients.length;
  scheduleChangeMessage.conferenceId = session.conferenceId;
  scheduleChangeMessage.deliveryStatus = 'sending';
  scheduleChangeMessage.actualSendTime = new Date();

  await scheduleChangeMessage.save();

  // Send notifications
  await sendScheduleChangeNotifications(scheduleChangeMessage, recipients, session);
  
  scheduleChangeMessage.deliveryStatus = 'sent';
  await scheduleChangeMessage.save();

  res.status(201).json({
    success: true,
    message: `Schedule change notification sent to ${recipients.length} affected users`,
    data: {
      scheduleChange: scheduleChangeMessage,
      affectedUsers: recipients.length,
      session: {
        id: session._id,
        title: session.title,
        track: session.track
      }
    }
  });
});

// @desc    Get user's notifications
// @route   GET /api/communications/notifications
// @access  Private
const getNotifications = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const {
    status,
    type,
    conferenceId,
    page = 1,
    limit = 20,
    includeRead = 'true'
  } = req.query;

  const options = {
    status,
    type,
    conferenceId,
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    includeRead: includeRead === 'true'
  };

  const notifications = await Notification.getUserNotifications(userId, options);
  const counts = await Notification.getNotificationCounts(userId, conferenceId);

  res.json({
    success: true,
    data: {
      notifications,
      counts,
      pagination: {
        currentPage: parseInt(page),
        hasNextPage: notifications.length === parseInt(limit)
      }
    }
  });
});

// @desc    Mark notification as read
// @route   PUT /api/communications/notifications/:notificationId/read
// @access  Private
const markNotificationAsRead = catchAsync(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOne({
    _id: notificationId,
    userId
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  await notification.markAsRead();

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: { notification }
  });
});

// @desc    Mark multiple notifications as read
// @route   PUT /api/communications/notifications/mark-read
// @access  Private
const markMultipleNotificationsAsRead = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return res.status(400).json({
      success: false,
      message: 'notificationIds array is required'
    });
  }

  const result = await Notification.markMultipleAsRead(userId, notificationIds);

  res.json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
    data: { modifiedCount: result.modifiedCount }
  });
});

// Helper function to send message notifications
async function sendMessageNotifications(message, recipients) {
  const notifications = recipients.map(recipient => ({
    title: `New Message: ${message.subject}`,
    message: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
    type: 'message',
    priority: message.priority,
    userId: recipient._id,
    sourceType: 'user',
    sourceId: message.senderId,
    sourceModel: 'User',
    messageId: message._id,
    conferenceId: message.conferenceId,
    actionRequired: false,
    actionType: 'view',
    actionUrl: `/messages/${message._id}`,
    icon: 'message',
    color: message.priority === 'urgent' ? 'red' : message.priority === 'high' ? 'yellow' : 'blue'
  }));

  await Notification.insertMany(notifications);
}

// Helper function to send announcement notifications
async function sendAnnouncementNotifications(announcement, recipients) {
  const notifications = recipients.map(recipient => ({
    title: 'Conference Announcement',
    message: announcement.subject,
    type: 'announcement',
    priority: announcement.priority,
    userId: recipient._id,
    sourceType: 'admin',
    sourceId: announcement.senderId,
    sourceModel: 'User',
    messageId: announcement._id,
    conferenceId: announcement.conferenceId,
    actionRequired: false,
    actionType: 'view',
    actionUrl: `/messages/${announcement._id}`,
    icon: 'bell',
    color: announcement.priority === 'urgent' ? 'red' : 'blue'
  }));

  await Notification.insertMany(notifications);
}

// Helper function to send schedule change notifications
async function sendScheduleChangeNotifications(scheduleChange, recipients, session) {
  const notifications = recipients.map(recipient => ({
    title: 'Schedule Change Alert',
    message: `Important change to your session: ${session.title}`,
    type: 'schedule_change',
    priority: 'high',
    userId: recipient._id,
    sourceType: 'admin',
    sourceId: scheduleChange.senderId,
    sourceModel: 'User',
    messageId: scheduleChange._id,
    sessionId: session._id,
    conferenceId: scheduleChange.conferenceId,
    actionRequired: true,
    actionType: 'view',
    actionUrl: `/messages/${scheduleChange._id}`,
    icon: 'calendar',
    color: 'red'
  }));

  await Notification.insertMany(notifications);
}

module.exports = {
  getMessages,
  getMessage,
  sendMessage,
  replyToMessage,
  sendAnnouncement,
  sendScheduleChangeNotification,
  getNotifications,
  markNotificationAsRead,
  markMultipleNotificationsAsRead
};
