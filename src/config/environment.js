const dotenv = require('dotenv');
const Joi = require('joi');

// Load environment variables
dotenv.config();

// Define environment schema
const envSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number()
    .default(3000),
  FRONTEND_URL: Joi.string()
    .uri()
    .default('http://localhost:3000'),

  // Database
  MONGODB_URI: Joi.string()
    .required()
    .error(new Error('MONGODB_URI is required')),
  DB_NAME: Joi.string()
    .default('sobienode'),

  // JWT Configuration
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .error(new Error('JWT_SECRET is required and must be at least 32 characters')),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .optional(),
  JWT_EXPIRE: Joi.string()
    .default('15m'),
  JWT_REFRESH_EXPIRE: Joi.string()
    .default('7d'),

  // Email Configuration
  SMTP_HOST: Joi.string()
    .default('smtp.gmail.com'),
  SMTP_PORT: Joi.number()
    .default(587),
  SMTP_USER: Joi.string()
    .email()
    .optional(),
  SMTP_PASS: Joi.string()
    .optional(),
  FROM_EMAIL: Joi.string()
    .email()
    .default('noreply@sobie.org'),

  // SMS Configuration (Optional)
  TWILIO_ACCOUNT_SID: Joi.string()
    .optional(),
  TWILIO_AUTH_TOKEN: Joi.string()
    .optional(),
  TWILIO_PHONE_NUMBER: Joi.string()
    .optional(),

  // Security
  COOKIE_DOMAIN: Joi.string()
    .optional(),
  MAX_LOGIN_ATTEMPTS: Joi.number()
    .default(5),
  LOCKOUT_DURATION: Joi.string()
    .default('2h'),

  // Development/Testing
  TEST_USER_EMAIL: Joi.string()
    .email()
    .when('NODE_ENV', {
      is: Joi.string().valid('development', 'test'),
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    }),
  EMAIL_SERVICE_ENABLED: Joi.boolean()
    .default(false),
  SEND_TO_TEST_EMAIL: Joi.boolean()
    .default(false),
  BLOCK_ALL_SMS: Joi.boolean()
    .default(true),
  BLOCK_ALL_PUSH_NOTIFICATIONS: Joi.boolean()
    .default(true),
  LOG_COMMUNICATION_ATTEMPTS: Joi.boolean()
    .default(true),

  // Content Moderation
  CONTENT_MODERATION_LEVEL: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium'),

  // Platform Branding
  PLATFORM_NAME: Joi.string()
    .default('SOBIE Conference Platform'),
  SUPPORT_EMAIL: Joi.string()
    .email()
    .default('support@sobie.org'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info')
}).unknown(); // Allow additional environment variables

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  console.error('❌ Environment Configuration Error:');
  console.error(error.message);
  console.error('\n📋 Required Environment Variables:');
  console.error('  - MONGODB_URI: Your MongoDB connection string');
  console.error('  - JWT_SECRET: A secure secret (32+ characters)');
  console.error('\n💡 Run: cp .env.example .env and configure your variables');
  process.exit(1);
}

// Environment-specific validations
if (envVars.NODE_ENV === 'production') {
  // Production-specific validations
  const productionSchema = Joi.object({
    JWT_SECRET: Joi.string().min(64).required(),
    JWT_REFRESH_SECRET: Joi.string().min(64).required(),
    SMTP_USER: Joi.string().required(),
    SMTP_PASS: Joi.string().required(),
    COOKIE_DOMAIN: Joi.string().required()
  }).unknown();

  const { error: prodError } = productionSchema.validate(envVars);
  if (prodError) {
    console.error('❌ Production Environment Error:');
    console.error(prodError.message);
    process.exit(1);
  }
}

// Log configuration status
if (envVars.NODE_ENV !== 'test') {
  console.log('✅ Environment configuration validated');
  console.log(`📍 Environment: ${envVars.NODE_ENV}`);
  console.log(`🔐 Security: ${envVars.JWT_SECRET ? 'JWT configured' : 'JWT missing'}`);
  console.log(`📧 Email: ${envVars.SMTP_USER ? 'SMTP configured' : 'SMTP not configured'}`);
  console.log(`📱 SMS: ${envVars.TWILIO_ACCOUNT_SID ? 'Twilio configured' : 'SMS not configured'}`);
}

// Export structured configuration
module.exports = {
  // Environment
  nodeEnv: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  isTesting: envVars.NODE_ENV === 'test',

  // Server
  server: {
    port: envVars.PORT,
    bodyLimit: '10mb'
  },

  // Database
  database: {
    uri: envVars.MONGODB_URI,
    name: envVars.DB_NAME,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD
  },

  // JWT
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET || envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRE,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRE
  },

  // Email
  email: {
    enabled: envVars.EMAIL_SERVICE_ENABLED || !!envVars.SMTP_USER,
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    user: envVars.SMTP_USER,
    pass: envVars.SMTP_PASS,
    from: envVars.FROM_EMAIL,
    sendToTestEmail: envVars.SEND_TO_TEST_EMAIL,
    testUser: envVars.TEST_USER_EMAIL
  },

  // SMS
  sms: {
    enabled: !!(envVars.TWILIO_ACCOUNT_SID && envVars.TWILIO_AUTH_TOKEN) && !envVars.BLOCK_ALL_SMS,
    accountSid: envVars.TWILIO_ACCOUNT_SID,
    authToken: envVars.TWILIO_AUTH_TOKEN,
    phoneNumber: envVars.TWILIO_PHONE_NUMBER,
    blocked: envVars.BLOCK_ALL_SMS
  },

  // Security
  security: {
    cookieDomain: envVars.COOKIE_DOMAIN,
    maxLoginAttempts: envVars.MAX_LOGIN_ATTEMPTS,
    lockoutDuration: envVars.LOCKOUT_DURATION,
    corsOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'https://sobie.org',
      'https://www.sobie.org',
      envVars.FRONTEND_URL
    ].filter(Boolean),
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    authRateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10
    }
  },

  // Platform
  platform: {
    name: envVars.PLATFORM_NAME,
    supportEmail: envVars.SUPPORT_EMAIL,
    contentModerationLevel: envVars.CONTENT_MODERATION_LEVEL
  },

  // Logging
  logging: {
    level: envVars.LOG_LEVEL,
    logCommunicationAttempts: envVars.LOG_COMMUNICATION_ATTEMPTS
  },

  // Development
  development: {
    blockAllSms: envVars.BLOCK_ALL_SMS,
    blockAllPushNotifications: envVars.BLOCK_ALL_PUSH_NOTIFICATIONS,
    testUserEmail: envVars.TEST_USER_EMAIL
  }
};
