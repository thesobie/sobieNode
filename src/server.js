// Load environment configuration first
const config = require('./config/environment');
const logger = require('./config/logger');

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const connectDB = require('./config/database');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

const app = express();

// Add request ID middleware for tracking
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substr(2, 9);
  res.set('X-Request-ID', req.requestId);
  next();
});

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(15 * 60 * 1000 / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      requestId: req.requestId
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60 * 1000 / 1000)
    });
  }
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: Math.ceil(15 * 60 * 1000 / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      requestId: req.requestId
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil(15 * 60 * 1000 / 1000)
    });
  }
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'https://sobie.org',
      'https://www.sobie.org'
    ];
    
    // Add environment-specific origins
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', {
        origin,
        allowedOrigins
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Configure Morgan with Winston
const morganFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';
const morganStream = {
  write: (message) => {
    logger.info(message.trim(), { service: 'http' });
  }
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(morgan(morganFormat, { stream: morganStream }));
app.use(generalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    res.set('X-Content-Type-Options', 'nosniff');
    if (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.php')) {
      res.set('Content-Type', 'text/plain');
    }
  }
}));

// Apply stricter rate limiting to auth routes
const authRoutes = [
  '/api/auth/login',
  '/api/auth/register', 
  '/api/auth/magic-link',
  '/api/auth/forgot-password',
  '/api/auth/reset-password'
];

authRoutes.forEach(route => {
  app.use(route, authLimiter);
});

// Security headers middleware
app.use((req, res, next) => {
  // Prevent caching of sensitive endpoints
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/api/profile/')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  
  // Add security headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const notificationService = require('./services/notificationService');
    
    // Check database connection
    let dbStatus = 'disconnected';
    switch (mongoose.connection.readyState) {
      case 1: dbStatus = 'connected'; break;
      case 2: dbStatus = 'connecting'; break;
      case 3: dbStatus = 'disconnecting'; break;
      default: dbStatus = 'disconnected';
    }

    // Check email service
    let emailStatus = 'unknown';
    try {
      const emailConfigValid = await notificationService.testEmailConfig();
      emailStatus = emailConfigValid ? 'configured' : 'misconfigured';
    } catch (error) {
      emailStatus = 'error';
      logger.warn('Email service check failed', { error: error.message });
    }

    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        name: mongoose.connection.name || 'N/A'
      },
      services: {
        email: emailStatus,
        jwt: config.JWT_SECRET ? 'configured' : 'missing',
        sms: (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) ? 'configured' : 'not configured'
      },
      environment: config.NODE_ENV,
      version: require('../package.json').version
    };

    logger.debug('Health check performed', healthData);
    res.status(200).json(healthData);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  const response = {
    message: 'SOBIE Conference Platform API',
    version: require('../package.json').version,
    environment: config.NODE_ENV,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      profile: '/api/profile'
    },
    documentation: 'See README.md for API documentation'
  };

  logger.debug('Root endpoint accessed', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json(response);
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('Database connection closed');
    }
    
    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // Give Winston time to log
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });
  
  // Close server gracefully
  gracefulShutdown('unhandledRejection');
});

// Start server (only if not in test environment)
if (config.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(config.PORT || 3000, () => {
      logger.info('Server started successfully', {
        port: config.PORT || 3000,
        environment: config.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform
      });
      
      logger.info('Configuration status', {
        jwt: config.JWT_SECRET ? 'configured' : 'missing',
        database: config.MONGODB_URI ? 'configured' : 'missing',
        email: config.SMTP_USER ? 'configured' : 'not configured',
        sms: (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) ? 'configured' : 'not configured'
      });
      
      if (config.NODE_ENV !== 'production') {
        logger.info('Development endpoints', {
          api: `http://localhost:${config.PORT || 3000}`,
          health: `http://localhost:${config.PORT || 3000}/health`
        });
      }
    });
  }).catch((error) => {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
}

module.exports = app;
