const { body, query, validationResult } = require('express-validator');

// Validation for user creation
const validateUserCreation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least: 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character'),
  
  body('name.firstName')
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  
  body('name.lastName')
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  
  body('userType')
    .isIn(['student', 'academic', 'industry', 'other'])
    .withMessage('User type must be: student, academic, industry, or other'),
  
  body('studentLevel')
    .optional()
    .isIn(['undergraduate', 'graduate', 'doctorate'])
    .withMessage('Student level must be: undergraduate, graduate, or doctorate'),
  
  body('affiliation.organization')
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Organization is required and must be less than 100 characters'),
  
  body('affiliation.jobTitle')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Job title must be less than 100 characters'),
  
  body('affiliation.department')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  
  body('roles.*')
    .optional()
    .isIn(['organizer', 'reviewer', 'presenter', 'attendee', 'sponsor', 'volunteer'])
    .withMessage('Invalid role specified'),
  
  body('skipEmailVerification')
    .optional()
    .isBoolean()
    .withMessage('Skip email verification must be a boolean')
];

// Validation for user updates
const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('name.firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  
  body('name.lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  
  body('name.preferredName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Preferred name must be less than 50 characters'),
  
  body('userType')
    .optional()
    .isIn(['student', 'academic', 'industry', 'other'])
    .withMessage('User type must be: student, academic, industry, or other'),
  
  body('studentLevel')
    .optional()
    .isIn(['undergraduate', 'graduate', 'doctorate'])
    .withMessage('Student level must be: undergraduate, graduate, or doctorate'),
  
  body('affiliation.organization')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Organization must be less than 100 characters'),
  
  body('affiliation.jobTitle')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Job title must be less than 100 characters'),
  
  body('affiliation.department')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('isEmailVerified must be a boolean'),
  
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  
  body('roles.*')
    .optional()
    .isIn(['organizer', 'reviewer', 'presenter', 'attendee', 'sponsor', 'volunteer'])
    .withMessage('Invalid role specified'),
  
  body('profile.bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio must be less than 1000 characters'),
  
  body('profile.interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  
  body('profile.interests.*')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Each interest must be less than 50 characters')
];

// Validation for bulk updates
const validateBulkUpdate = [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('User IDs array is required and must not be empty'),
  
  body('userIds.*')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('updateData')
    .isObject()
    .withMessage('Update data must be an object'),
  
  body('updateData.isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('updateData.isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('isEmailVerified must be a boolean'),
  
  body('updateData.roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  
  body('updateData.roles.*')
    .optional()
    .isIn(['organizer', 'reviewer', 'presenter', 'attendee', 'sponsor', 'volunteer'])
    .withMessage('Invalid role specified')
];

// Validation for notifications
const validateNotification = [
  body('subject')
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage('Subject is required and must be less than 200 characters'),
  
  body('message')
    .notEmpty()
    .isLength({ max: 5000 })
    .withMessage('Message is required and must be less than 5000 characters'),
  
  body('recipients')
    .custom((value) => {
      if (value === 'all' || value === 'filtered') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every(id => typeof id === 'string' && id.length > 0);
      }
      return false;
    })
    .withMessage('Recipients must be "all", "filtered", or an array of user IDs'),
  
  body('type')
    .optional()
    .isIn(['email', 'sms'])
    .withMessage('Type must be email or sms'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high'])
    .withMessage('Priority must be low, normal, or high'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object')
];

// Validation for query parameters
const validateUserQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('userType')
    .optional()
    .isIn(['student', 'academic', 'industry', 'other'])
    .withMessage('Invalid user type'),
  
  query('studentLevel')
    .optional()
    .isIn(['undergraduate', 'graduate', 'doctorate'])
    .withMessage('Invalid student level'),
  
  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be true or false'),
  
  query('isEmailVerified')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isEmailVerified must be true or false'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'email', 'name.lastName', 'affiliation.organization', 'lastLogin'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Validation for memorial data
const validateMemorialData = [
  body('dateOfPassing')
    .isISO8601()
    .toDate()
    .withMessage('Valid date of passing is required')
    .custom((value) => {
      if (value > new Date()) {
        throw new Error('Date of passing cannot be in the future');
      }
      return true;
    }),
  
  body('memorialNote')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('Memorial note must be less than 500 characters'),
];

module.exports = {
  validateUserCreation,
  validateUserUpdate,
  validateBulkUpdate,
  validateNotification,
  validateUserQuery,
  validateMemorialData,
  handleValidationErrors
};
