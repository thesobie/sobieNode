const express = require('express');
const router = express.Router();

// Import route modules
const userRoutes = require('./users');
const authRoutes = require('./auth');
const profileRoutes = require('./profile');
const adminRoutes = require('./admin');
const documentRoutes = require('./documents');
// const historicalRoutes = require('./historical'); // Temporarily disabled
const researchRoutes = require('./research');
const researchSubmissionRoutes = require('./researchSubmission');
const coAuthorRoutes = require('./coAuthors');
const suggestionRoutes = require('./suggestions');
const adminSuggestionRoutes = require('./adminSuggestions');
const conferenceRoutes = require('./conference');
const proceedingsRoutes = require('./proceedingsRoutes');
const programBuilderRoutes = require('./programBuilderRoutes');
const communityRoutes = require('./communityRoutes');
const communicationRoutes = require('./communication');
const bugReportRoutes = require('./bugReports');

// Mount routes
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/profiles', profileRoutes);
router.use('/admin', adminRoutes);
router.use('/admin', adminSuggestionRoutes);
router.use('/documents', documentRoutes);
// router.use('/historical', historicalRoutes); // Temporarily disabled due to issues
router.use('/research', researchRoutes);
router.use('/research-submission', researchSubmissionRoutes);
router.use('/coauthors', coAuthorRoutes);
router.use('/suggestions', suggestionRoutes);
router.use('/conference', conferenceRoutes);
router.use('/proceedings', proceedingsRoutes);
router.use('/program-builder', programBuilderRoutes);
router.use('/community', communityRoutes);
router.use('/communications', communicationRoutes);
router.use('/bug-reports', bugReportRoutes);

// Default API route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the SOBIE Conference API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      auth: '/api/auth',
      profiles: '/api/profiles',
      admin: '/api/admin (requires admin role)',
      documents: '/api/documents',
      historical: '/api/historical',
      research: '/api/research',
      researchSubmission: '/api/research-submission',
      coAuthors: '/api/coauthors',
      suggestions: '/api/suggestions',
      adminSuggestions: '/api/admin/suggestions',
      conference: '/api/conference',
      proceedings: '/api/proceedings',
      programBuilder: '/api/program-builder (requires editor/admin role)',
      community: '/api/community (community activities and interests)',
      communications: '/api/communications (messaging and notifications)',
      bugReports: '/api/bug-reports (bug reporting with GitHub integration)',
      health: '/health'
    }
  });
});

module.exports = router;
