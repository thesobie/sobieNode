const express = require('express');
const router = express.Router();
const {
  getMessages,
  getMessage,
  sendMessage,
  replyToMessage,
  sendAnnouncement,
  sendScheduleChangeNotification,
  getNotifications,
  markNotificationAsRead,
  markMultipleNotificationsAsRead
} = require('../controllers/communicationController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

// All communication routes require authentication
router.use(authenticateUser);

// Message validation schemas
const sendMessageValidation = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject must be less than 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 10000 })
    .withMessage('Message content must be less than 10,000 characters'),
  body('recipientIds')
    .isArray({ min: 1 })
    .withMessage('At least one recipient is required'),
  body('recipientIds.*')
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  body('messageType')
    .optional()
    .isIn(['direct', 'announcement', 'schedule_change'])
    .withMessage('Invalid message type'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('conferenceId')
    .optional()
    .isMongoId()
    .withMessage('Invalid conference ID'),
  body('sessionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid session ID'),
  body('activityId')
    .optional()
    .isMongoId()
    .withMessage('Invalid activity ID'),
  body('scheduledSendTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled send time format'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  body('attachments.*.filename')
    .if(body('attachments').exists())
    .trim()
    .notEmpty()
    .withMessage('Attachment filename is required'),
  body('attachments.*.fileType')
    .if(body('attachments').exists())
    .trim()
    .notEmpty()
    .withMessage('Attachment file type is required'),
  body('attachments.*.fileSize')
    .if(body('attachments').exists())
    .isNumeric()
    .withMessage('Attachment file size must be a number'),
  body('attachments.*.url')
    .if(body('attachments').exists())
    .trim()
    .notEmpty()
    .withMessage('Attachment URL is required')
];

const replyMessageValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Reply content is required')
    .isLength({ max: 10000 })
    .withMessage('Reply content must be less than 10,000 characters'),
  body('replyToAll')
    .optional()
    .isBoolean()
    .withMessage('replyToAll must be a boolean')
];

const announcementValidation = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Announcement subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject must be less than 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Announcement content is required')
    .isLength({ max: 20000 })
    .withMessage('Content must be less than 20,000 characters'),
  body('conferenceId')
    .isMongoId()
    .withMessage('Valid conference ID is required'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('targetAudience')
    .optional()
    .isIn(['all', 'students', 'academics', 'specific_roles'])
    .withMessage('Invalid target audience'),
  body('specificRoles')
    .if(body('targetAudience').equals('specific_roles'))
    .isArray({ min: 1 })
    .withMessage('Specific roles required when target audience is specific_roles'),
  body('specificRoles.*')
    .if(body('targetAudience').equals('specific_roles'))
    .isIn(['student', 'academic', 'admin', 'editor', 'reviewer', 'conference-chairperson', 'session-chairperson', 'activity-coordinator'])
    .withMessage('Invalid role specified'),
  body('scheduledSendTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled send time format')
];

const scheduleChangeValidation = [
  body('sessionId')
    .isMongoId()
    .withMessage('Valid session ID is required'),
  body('changeType')
    .isIn(['time', 'location', 'cancellation', 'postponement', 'other'])
    .withMessage('Invalid change type'),
  body('originalData')
    .isObject()
    .withMessage('Original data is required'),
  body('newData')
    .isObject()
    .withMessage('New data is required'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason for change is required')
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters'),
  body('customMessage')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Custom message must be less than 1000 characters')
];

const messageIdValidation = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID')
];

const notificationIdValidation = [
  param('notificationId')
    .isMongoId()
    .withMessage('Invalid notification ID')
];

const markMultipleReadValidation = [
  body('notificationIds')
    .isArray({ min: 1 })
    .withMessage('At least one notification ID is required'),
  body('notificationIds.*')
    .isMongoId()
    .withMessage('Invalid notification ID')
];

// Message routes
router.get('/messages', 
  query('type').optional().isIn(['direct', 'announcement', 'schedule_change']),
  query('status').optional().isIn(['read', 'unread']),
  query('conferenceId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  getMessages
);

router.get('/messages/:messageId', 
  messageIdValidation,
  validate,
  getMessage
);

router.post('/messages', 
  sendMessageValidation,
  validate,
  sendMessage
);

router.post('/messages/:messageId/reply', 
  messageIdValidation,
  replyMessageValidation,
  validate,
  replyToMessage
);

// Announcement routes (restricted to admin/conference roles)
router.post('/announcements',
  authorizeRoles(['admin', 'conference-chairperson', 'editor']),
  announcementValidation,
  validate,
  sendAnnouncement
);

// Schedule change routes (restricted to admin/editor)
router.post('/schedule-changes',
  authorizeRoles(['admin', 'editor']),
  scheduleChangeValidation,
  validate,
  sendScheduleChangeNotification
);

// Notification routes
router.get('/notifications',
  query('status').optional().isIn(['read', 'unread']),
  query('type').optional().isIn(['message', 'announcement', 'schedule_change', 'system', 'community']),
  query('conferenceId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('includeRead').optional().isBoolean(),
  validate,
  getNotifications
);

router.put('/notifications/:notificationId/read',
  notificationIdValidation,
  validate,
  markNotificationAsRead
);

router.put('/notifications/mark-read',
  markMultipleReadValidation,
  validate,
  markMultipleNotificationsAsRead
);

// Additional utility routes

// @desc    Get message statistics for user
// @route   GET /api/communications/stats
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;
    const { conferenceId } = req.query;

    const Message = require('../models/Message');
    const Notification = require('../models/Notification');

    // Build match conditions
    const messageMatch = { 'recipients.userId': userId };
    const notificationMatch = { userId };

    if (conferenceId) {
      messageMatch.conferenceId = conferenceId;
      notificationMatch.conferenceId = conferenceId;
    }

    // Get message statistics
    const messageStats = await Message.aggregate([
      { $match: messageMatch },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          unreadMessages: {
            $sum: {
              $cond: [
                { 
                  $in: ['unread', {
                    $map: {
                      input: { 
                        $filter: {
                          input: '$recipients',
                          cond: { $eq: ['$$this.userId', userId] }
                        }
                      },
                      in: '$$this.readStatus'
                    }
                  }]
                },
                1,
                0
              ]
            }
          },
          messagesByType: {
            $push: '$messageType'
          }
        }
      }
    ]);

    // Get notification statistics
    const notificationStats = await Notification.aggregate([
      { $match: notificationMatch },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          unreadNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] }
          },
          notificationsByType: {
            $push: '$type'
          }
        }
      }
    ]);

    // Process message types
    const messageTypeCount = {};
    if (messageStats[0]?.messagesByType) {
      messageStats[0].messagesByType.forEach(type => {
        messageTypeCount[type] = (messageTypeCount[type] || 0) + 1;
      });
    }

    // Process notification types
    const notificationTypeCount = {};
    if (notificationStats[0]?.notificationsByType) {
      notificationStats[0].notificationsByType.forEach(type => {
        notificationTypeCount[type] = (notificationTypeCount[type] || 0) + 1;
      });
    }

    res.json({
      success: true,
      data: {
        messages: {
          total: messageStats[0]?.totalMessages || 0,
          unread: messageStats[0]?.unreadMessages || 0,
          byType: messageTypeCount
        },
        notifications: {
          total: notificationStats[0]?.totalNotifications || 0,
          unread: notificationStats[0]?.unreadNotifications || 0,
          byType: notificationTypeCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving communication statistics',
      error: error.message
    });
  }
});

// @desc    Search messages
// @route   GET /api/communications/messages/search
// @access  Private
router.get('/messages/search',
  query('q').notEmpty().withMessage('Search query is required'),
  query('type').optional().isIn(['direct', 'announcement', 'schedule_change']),
  query('conferenceId').optional().isMongoId(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const {
        q,
        type,
        conferenceId,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20
      } = req.query;

      const Message = require('../models/Message');

      // Build search query
      const searchQuery = {
        'recipients.userId': userId,
        $or: [
          { subject: { $regex: q, $options: 'i' } },
          { content: { $regex: q, $options: 'i' } }
        ]
      };

      if (type) {
        searchQuery.messageType = type;
      }

      if (conferenceId) {
        searchQuery.conferenceId = conferenceId;
      }

      if (dateFrom || dateTo) {
        searchQuery.createdAt = {};
        if (dateFrom) {
          searchQuery.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          searchQuery.createdAt.$lte = new Date(dateTo);
        }
      }

      const messages = await Message.find(searchQuery)
        .populate('senderId', 'name email affiliation')
        .populate('conferenceId', 'name year')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const totalResults = await Message.countDocuments(searchQuery);

      res.json({
        success: true,
        data: {
          messages,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalResults / limit),
            totalResults,
            hasNextPage: page * limit < totalResults
          },
          searchQuery: q
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error searching messages',
        error: error.message
      });
    }
  }
);

module.exports = router;
