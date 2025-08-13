#!/usr/bin/env node

const config = require('../src/config/environment');
const logger = require('../src/config/logger');

// Test environment validation
try {
  logger.info('Environment validation successful', {
    nodeEnv: config.nodeEnv,
    serverPort: config.server.port,
    databaseConfigured: !!config.database.uri,
    jwtConfigured: !!config.jwt.secret,
    emailConfigured: config.email.enabled,
    smsConfigured: config.sms.enabled
  });
  
  console.log('✅ Environment validation passed');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🚀 Server will run on port: ${config.server.port}`);
  console.log(`🗄️  Database: ${config.database.uri ? 'Configured' : 'Missing'}`);
  console.log(`🔑 JWT: ${config.jwt.secret ? 'Configured' : 'Missing'}`);
  console.log(`📧 Email: ${config.email.enabled ? 'Configured' : 'Not configured'}`);
  console.log(`📱 SMS: ${config.sms.enabled ? 'Configured' : 'Not configured'}`);
  
  process.exit(0);
} catch (error) {
  console.error('❌ Environment validation failed');
  console.error(error.message);
  process.exit(1);
}
