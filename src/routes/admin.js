const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserRoles,
  bulkUpdateUsers,
  sendNotification,
  getDashboardStats,
  exportUsers,
  // Memorial management
  getMemorialUsers,
  addMemorialStatus,
  removeMemorialStatus,
  updateMemorialInfo,
  getMemorialStats
} = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { 
  validateUserCreation,
  validateUserUpdate,
  validateBulkUpdate,
  validateNotification,
  validateMemorialData,
  handleValidationErrors
} = require('../middleware/adminValidation');

// Apply authentication and admin role requirement to all routes
router.use(authMiddleware);
router.use(requireRole(['admin', 'organizer']));

// Dashboard and statistics
router.get('/dashboard/stats', getDashboardStats);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/export', exportUsers);
router.post('/users', validateUserCreation, handleValidationErrors, createUser);
router.get('/users/:id', getUserById);
router.put('/users/:id', validateUserUpdate, handleValidationErrors, updateUser);
router.delete('/users/:id', deleteUser);

// Role management
router.put('/users/:id/roles', updateUserRoles);

// Bulk operations
router.put('/users/bulk', validateBulkUpdate, handleValidationErrors, bulkUpdateUsers);

// Notifications
router.post('/notifications/send', validateNotification, handleValidationErrors, sendNotification);

// Memorial management routes
router.get('/memorial/users', getMemorialUsers);
router.get('/memorial/stats', getMemorialStats);
router.post('/memorial/:userId/add', validateMemorialData, handleValidationErrors, addMemorialStatus);
router.put('/memorial/:userId/update', validateMemorialData, handleValidationErrors, updateMemorialInfo);
router.delete('/memorial/:userId/remove', removeMemorialStatus);

module.exports = router;
