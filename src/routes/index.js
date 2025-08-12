const express = require('express');
const router = express.Router();

// Import route modules (only stable ones for now)
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
    message: 'Welcome to the SOBIE Conference API - Photo Upload Test Mode',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      auth: '/api/auth',
      profiles: '/api/profiles (with photo upload functionality)',
      health: '/health'
    },
    photoUpload: {
      endpoints: {
        upload: 'POST /api/profiles/me/photo',
        remove: 'DELETE /api/profiles/me/photo',
        config: 'GET /api/profiles/me/photo/config'
      },
      features: [
        'Image processing with Sharp',
        'Multiple storage options (local, S3, Cloudinary)',
        'Automatic resizing (thumbnail, medium, large)',
        'File validation and security',
        'Drag & drop frontend support'
      ]
    }
  });
});

module.exports = router;
