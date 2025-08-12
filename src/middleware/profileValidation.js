const { body, validationResult } = require('express-validator');

// Validation rules for profile updates
const validateProfileUpdate = [
  // Name validation
  body('name.firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('name.lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('name.preferredName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Preferred name must be between 1 and 50 characters'),

  body('name.prefix')
    .optional()
    .isIn(['', 'Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.', 'Mx.'])
    .withMessage('Invalid prefix'),

  body('name.suffix')
    .optional()
    .isIn(['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'Ph.D.', 'M.D.', 'Ed.D.', 'J.D.'])
    .withMessage('Invalid suffix'),

  body('name.pronouns')
    .optional()
    .isIn(['he/him', 'she/her', 'they/them', 'prefer not to say', 'other'])
    .withMessage('Invalid pronouns selection'),

  body('name.pronounsCustom')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Custom pronouns must be 20 characters or less'),

  // Affiliation validation
  body('affiliation.organization')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Organization must be between 1 and 200 characters'),

  body('affiliation.department')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Department must be 100 characters or less'),

  body('affiliation.jobTitle')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Job title must be 100 characters or less'),

  body('affiliation.years')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Years of experience must be between 0 and 100'),

  // User type validation
  body('userType')
    .optional()
    .isIn(['student', 'academic', 'other'])
    .withMessage('Invalid user type'),

  body('studentLevel')
    .optional()
    .isIn(['undergraduate', 'graduate', 'doctorate'])
    .withMessage('Invalid student level'),

  // Contact validation
  body('contact.phones.*.number')
    .optional()
    .matches(/^\+?[\d\s\-\(\)\.]+$/)
    .withMessage('Invalid phone number format'),

  body('contact.phones.*.type')
    .optional()
    .isIn(['mobile', 'work', 'home'])
    .withMessage('Invalid phone type'),

  // Profile validation
  body('profile.bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio must be 1000 characters or less'),

  body('profile.interests')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Maximum 20 interests allowed'),

  body('profile.interests.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each interest must be between 1 and 50 characters'),

  body('profile.expertiseAreas')
    .optional()
    .isArray({ max: 15 })
    .withMessage('Maximum 15 expertise areas allowed'),

  body('profile.expertiseAreas.*')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each expertise area must be between 1 and 100 characters'),

  body('profile.photo')
    .optional()
    .isURL()
    .withMessage('Photo must be a valid URL'),

  // Social links validation
  body('profile.socialLinks.*.platform')
    .optional()
    .isIn(['twitter', 'linkedin', 'researchgate', 'orcid', 'googlescholar', 'website', 'other'])
    .withMessage('Invalid social media platform'),

  body('profile.socialLinks.*.url')
    .optional()
    .isURL()
    .withMessage('Social link must be a valid URL'),
];

// Validation rules for privacy settings
const validatePrivacySettings = [
  body('privacySettings.name')
    .optional()
    .isBoolean()
    .withMessage('Name privacy setting must be boolean'),

  body('privacySettings.photo')
    .optional()
    .isBoolean()
    .withMessage('Photo privacy setting must be boolean'),

  body('privacySettings.bio')
    .optional()
    .isBoolean()
    .withMessage('Bio privacy setting must be boolean'),

  body('privacySettings.affiliation')
    .optional()
    .isBoolean()
    .withMessage('Affiliation privacy setting must be boolean'),

  body('privacySettings.socialLinks')
    .optional()
    .isBoolean()
    .withMessage('Social links privacy setting must be boolean'),

  body('privacySettings.contactInfo.email')
    .optional()
    .isBoolean()
    .withMessage('Email privacy setting must be boolean'),

  body('privacySettings.contactInfo.phone')
    .optional()
    .isBoolean()
    .withMessage('Phone privacy setting must be boolean'),

  body('privacySettings.contactInfo.address')
    .optional()
    .isBoolean()
    .withMessage('Address privacy setting must be boolean'),

  body('privacySettings.sobieHistory.attendance')
    .optional()
    .isBoolean()
    .withMessage('Attendance history privacy setting must be boolean'),

  body('privacySettings.sobieHistory.service')
    .optional()
    .isBoolean()
    .withMessage('Service history privacy setting must be boolean'),

  body('privacySettings.sobieHistory.publications')
    .optional()
    .isBoolean()
    .withMessage('Publications history privacy setting must be boolean'),
];

// Validation rules for SOBIE history
const validateSobieHistory = [
  body('sobieHistory.attendance')
    .optional()
    .isArray()
    .withMessage('Attendance history must be an array'),

  body('sobieHistory.attendance.*.year')
    .optional()
    .isInt({ min: 1980, max: new Date().getFullYear() + 5 })
    .withMessage('Invalid year for attendance history'),

  body('sobieHistory.attendance.*.role')
    .optional()
    .isIn(['attendee', 'presenter', 'organizer', 'keynote', 'panelist'])
    .withMessage('Invalid attendance role'),

  body('sobieHistory.service')
    .optional()
    .isArray()
    .withMessage('Service history must be an array'),

  body('sobieHistory.service.*.year')
    .optional()
    .isInt({ min: 1980, max: new Date().getFullYear() + 5 })
    .withMessage('Invalid year for service history'),

  body('sobieHistory.service.*.role')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Service role must be between 1 and 100 characters'),

  body('sobieHistory.publications')
    .optional()
    .isArray()
    .withMessage('Publications history must be an array'),

  body('sobieHistory.publications.*.year')
    .optional()
    .isInt({ min: 1980, max: new Date().getFullYear() + 5 })
    .withMessage('Invalid year for publication'),

  body('sobieHistory.publications.*.title')
    .optional()
    .isLength({ min: 1, max: 300 })
    .withMessage('Publication title must be between 1 and 300 characters'),

  body('sobieHistory.publications.*.authors')
    .optional()
    .isArray()
    .withMessage('Publication authors must be an array'),

  body('sobieHistory.publications.*.authors.*')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each author name must be between 1 and 100 characters'),
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// Custom validation for conditional fields
const validateConditionalFields = (req, res, next) => {
  const { body } = req;
  const errors = [];

  // If user type is student, student level should be provided
  if (body.userType === 'student' && !body.studentLevel) {
    errors.push({
      field: 'studentLevel',
      message: 'Student level is required when user type is student'
    });
  }

  // If pronouns is 'other', custom pronouns should be provided
  if (body.name?.pronouns === 'other' && !body.name?.pronounsCustom) {
    errors.push({
      field: 'name.pronounsCustom',
      message: 'Custom pronouns are required when pronouns selection is "other"'
    });
  }

  // Validate social links array structure
  if (body.profile?.socialLinks) {
    body.profile.socialLinks.forEach((link, index) => {
      if (!link.platform || !link.url) {
        errors.push({
          field: `profile.socialLinks[${index}]`,
          message: 'Social links must have both platform and url'
        });
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = {
  validateProfileUpdate,
  validatePrivacySettings,
  validateSobieHistory,
  handleValidationErrors,
  validateConditionalFields
};
