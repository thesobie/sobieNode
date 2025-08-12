const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/users
router.get('/', userController.getAllUsers);

// GET /api/users/me/submissions - Must come before /:id routes
router.get('/me/submissions', authMiddleware, userController.getMySubmissions);

// GET /api/users/me/stats - Must come before /:id routes  
router.get('/me/stats', authMiddleware, userController.getMyStats);

// GET /api/users/:id/public
router.get('/:id/public', userController.getUserPublicProfile);

// GET /api/users/:id
router.get('/:id', userController.getUserById);

// POST /api/users
router.post('/', userController.createUser);

// PUT /api/users/:id
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id
router.delete('/:id', userController.deleteUser);

module.exports = router;
