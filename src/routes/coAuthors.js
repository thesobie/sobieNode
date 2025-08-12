const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  searchPotentialCoAuthors,
  addCoAuthor,
  removeCoAuthor,
  reorderCoAuthors,
  addFacultySponsor,
  removeFacultySponsor,
  designatePresenter,
  removePresenter,
  getSubmissionAuthors,
  validateCoAuthor,
  validateFacultySponsor
} = require('../controllers/coAuthorController');

// Search for potential co-authors
router.get('/search', authMiddleware, searchPotentialCoAuthors);

// Get all authors and presenters for a submission
router.get('/submission/:submissionId/authors', authMiddleware, getSubmissionAuthors);

// Co-author management
router.post('/submission/:submissionId/coauthors', authMiddleware, validateCoAuthor, addCoAuthor);
router.delete('/submission/:submissionId/coauthors/:authorId', authMiddleware, removeCoAuthor);
router.put('/submission/:submissionId/coauthors/reorder', authMiddleware, reorderCoAuthors);

// Faculty sponsor management (for student papers)
router.post('/submission/:submissionId/sponsors', authMiddleware, validateFacultySponsor, addFacultySponsor);
router.delete('/submission/:submissionId/sponsors/:sponsorId', authMiddleware, removeFacultySponsor);

// Presenter designation
router.post('/submission/:submissionId/presenters', authMiddleware, designatePresenter);
router.delete('/submission/:submissionId/presenters/:authorId', authMiddleware, removePresenter);

module.exports = router;
