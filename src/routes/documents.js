const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Public routes (with optional auth for access control)
router.get('/', authMiddleware, documentController.getDocuments);
router.get('/:id', authMiddleware, documentController.getDocument);
router.get('/:id/download', authMiddleware, documentController.downloadDocument);

// Protected routes - require authentication
router.use(authMiddleware);

// Admin/Organizer only routes
router.post('/upload', 
  requireRole(['admin', 'organizer']), 
  documentController.uploadDocument
);

router.get('/admin/stats', 
  requireRole(['admin', 'organizer']), 
  documentController.getDocumentStats
);

// Update/Delete - uploader, admin, or organizer
router.put('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
