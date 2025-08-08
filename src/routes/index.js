const express = require('express');
const router = express.Router();

// Import route modules
const userRoutes = require('./users');
const authRoutes = require('./auth');
const profileRoutes = require('./profile');

// Mount routes
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/profiles', profileRoutes);

// Default API route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      auth: '/api/auth',
      profiles: '/api/profiles',
      health: '/health'
    }
  });
});

module.exports = router;
