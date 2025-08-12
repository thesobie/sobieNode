const express = require('express');
const router = express.Router();
const {
  submitBugReport,
  getMyBugReports,
  getBugReport,
  updateBugReportStatus,
  getAllBugReports,
  getBugReportStatistics,
  getGitHubStatus
} = require('../controllers/bugReportController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

// All bug report routes require authentication
router.use(authenticateUser);

// Bug report validation schemas
const submitBugReportValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Bug report title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Bug description is required')
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  
  body('category')
    .isIn(['ui_ux', 'functionality', 'performance', 'data', 'security', 'mobile', 'integration', 'other'])
    .withMessage('Invalid bug category'),
  
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('stepsToReproduce')
    .optional()
    .isArray()
    .withMessage('Steps to reproduce must be an array'),
  
  body('stepsToReproduce.*')
    .if(body('stepsToReproduce').exists())
    .trim()
    .notEmpty()
    .withMessage('Each step description is required'),
  
  body('expectedBehavior')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Expected behavior must be less than 1000 characters'),
  
  body('actualBehavior')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Actual behavior must be less than 1000 characters'),
  
  body('additionalContext')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Additional context must be less than 2000 characters'),
  
  body('environment.browser')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Browser name must be less than 100 characters'),
  
  body('environment.browserVersion')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Browser version must be less than 50 characters'),
  
  body('environment.operatingSystem')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Operating system must be less than 100 characters'),
  
  body('environment.screenResolution')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Screen resolution must be less than 50 characters'),
  
  body('environment.url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid URL format'),
  
  body('userCanContact')
    .optional()
    .isBoolean()
    .withMessage('userCanContact must be a boolean'),
  
  body('contactPreference')
    .optional()
    .isIn(['email', 'in_app', 'none'])
    .withMessage('Invalid contact preference'),
  
  body('relatedConference')
    .optional()
    .isMongoId()
    .withMessage('Invalid conference ID'),
  
  body('relatedSession')
    .optional()
    .isMongoId()
    .withMessage('Invalid session ID'),
  
  body('relatedSubmission')
    .optional()
    .isMongoId()
    .withMessage('Invalid submission ID'),
  
  body('createGithubIssue')
    .optional()
    .isBoolean()
    .withMessage('createGithubIssue must be a boolean')
];

const updateStatusValidation = [
  body('status')
    .optional()
    .isIn(['submitted', 'triaged', 'in_progress', 'resolved', 'closed', 'duplicate'])
    .withMessage('Invalid status'),
  
  body('resolution')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Resolution must be less than 1000 characters'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID for assignment')
];

const reportIdValidation = [
  param('reportId')
    .isMongoId()
    .withMessage('Invalid bug report ID')
];

// Public user routes

// @desc    Submit a new bug report
// @route   POST /api/bug-reports
// @access  Private
router.post('/', 
  submitBugReportValidation,
  validate,
  submitBugReport
);

// @desc    Get current user's bug reports
// @route   GET /api/bug-reports/my-reports
// @access  Private
router.get('/my-reports',
  query('status').optional().isIn(['submitted', 'triaged', 'in_progress', 'resolved', 'closed', 'duplicate']),
  query('category').optional().isIn(['ui_ux', 'functionality', 'performance', 'data', 'security', 'mobile', 'integration', 'other']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  getMyBugReports
);

// @desc    Get specific bug report details
// @route   GET /api/bug-reports/:reportId
// @access  Private (Own reports or Admin/Editor)
router.get('/:reportId',
  reportIdValidation,
  validate,
  getBugReport
);

// Admin/Editor routes

// @desc    Get all bug reports (Admin/Editor only)
// @route   GET /api/bug-reports/admin/all
// @access  Private (Admin/Editor)
router.get('/admin/all',
  authorizeRoles(['admin', 'editor']),
  query('status').optional().isIn(['submitted', 'triaged', 'in_progress', 'resolved', 'closed', 'duplicate']),
  query('category').optional().isIn(['ui_ux', 'functionality', 'performance', 'data', 'security', 'mobile', 'integration', 'other']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  query('assignedTo').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  validate,
  getAllBugReports
);

// @desc    Update bug report status (Admin/Editor only)
// @route   PUT /api/bug-reports/:reportId/status
// @access  Private (Admin/Editor)
router.put('/:reportId/status',
  authorizeRoles(['admin', 'editor']),
  reportIdValidation,
  updateStatusValidation,
  validate,
  updateBugReportStatus
);

// @desc    Get bug report statistics (Admin only)
// @route   GET /api/bug-reports/admin/statistics
// @access  Private (Admin)
router.get('/admin/statistics',
  authorizeRoles(['admin']),
  query('timeframe').optional().isIn(['7d', '30d', '90d', 'all']),
  query('conferenceId').optional().isMongoId(),
  validate,
  getBugReportStatistics
);

// @desc    Check GitHub integration status (Admin only)
// @route   GET /api/bug-reports/admin/github-status
// @access  Private (Admin)
router.get('/admin/github-status',
  authorizeRoles(['admin']),
  getGitHubStatus
);

// Additional utility routes

// @desc    Get bug categories with descriptions
// @route   GET /api/bug-reports/categories
// @access  Private
router.get('/categories', (req, res) => {
  const categories = [
    {
      value: 'ui_ux',
      label: 'UI/UX',
      description: 'User interface or user experience issues'
    },
    {
      value: 'functionality',
      label: 'Functionality',
      description: 'Features not working as expected'
    },
    {
      value: 'performance',
      label: 'Performance',
      description: 'Speed, loading, or responsiveness issues'
    },
    {
      value: 'data',
      label: 'Data',
      description: 'Data inconsistency or corruption issues'
    },
    {
      value: 'security',
      label: 'Security',
      description: 'Security vulnerabilities or concerns'
    },
    {
      value: 'mobile',
      label: 'Mobile',
      description: 'Mobile-specific issues'
    },
    {
      value: 'integration',
      label: 'Integration',
      description: 'Third-party service integration problems'
    },
    {
      value: 'other',
      label: 'Other',
      description: 'Issues that don\'t fit other categories'
    }
  ];

  res.json({
    success: true,
    data: { categories }
  });
});

// @desc    Get severity levels with descriptions
// @route   GET /api/bug-reports/severity-levels
// @access  Private
router.get('/severity-levels', (req, res) => {
  const severityLevels = [
    {
      value: 'low',
      label: 'Low',
      description: 'Minor issue that doesn\'t significantly impact functionality',
      color: '#28a745'
    },
    {
      value: 'medium',
      label: 'Medium',
      description: 'Moderate issue that affects some functionality',
      color: '#ffc107'
    },
    {
      value: 'high',
      label: 'High',
      description: 'Significant issue that impacts important functionality',
      color: '#fd7e14'
    },
    {
      value: 'critical',
      label: 'Critical',
      description: 'Severe issue that breaks core functionality or poses security risk',
      color: '#dc3545'
    }
  ];

  res.json({
    success: true,
    data: { severityLevels }
  });
});

// @desc    Get bug report template for users
// @route   GET /api/bug-reports/template
// @access  Private
router.get('/template', (req, res) => {
  const template = {
    title: '',
    description: '',
    category: 'functionality',
    severity: 'medium',
    stepsToReproduce: [''],
    expectedBehavior: '',
    actualBehavior: '',
    additionalContext: '',
    environment: {
      browser: '',
      browserVersion: '',
      operatingSystem: '',
      screenResolution: '',
      url: ''
    },
    userCanContact: true,
    contactPreference: 'in_app',
    createGithubIssue: true
  };

  const guidelines = [
    'Be specific and detailed in your description',
    'Include clear steps to reproduce the issue',
    'Describe what you expected to happen vs what actually happened',
    'Include relevant environment information (browser, OS, etc.)',
    'Add screenshots or attachments if helpful',
    'Check if the issue is reproducible in different browsers/devices'
  ];

  res.json({
    success: true,
    data: {
      template,
      guidelines
    }
  });
});

module.exports = router;
