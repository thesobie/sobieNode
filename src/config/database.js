const mongoose = require('mongoose');
const config = require('./environment');
const logger = require('./logger');

const connectDB = async () => {
  try {
    // Connection options with proper configuration
    const options = {
      dbName: config.database.name,
      maxPoolSize: config.database.maxPoolSize,
      serverSelectionTimeoutMS: config.database.serverSelectionTimeoutMS,
      socketTimeoutMS: config.database.socketTimeoutMS,
      family: 4, // Use IPv4, skip trying IPv6
    };

    // Add authentication if credentials are provided
    if (config.database.username && config.database.password) {
      options.auth = {
        username: config.database.username,
        password: config.database.password
      };
    }

    const conn = await mongoose.connect(config.database.uri, options);

    logger.info('MongoDB connection established', {
      host: conn.connection.host,
      port: conn.connection.port,
      database: conn.connection.name,
      readyState: conn.connection.readyState
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error.message,
      stack: error.stack,
      uri: config.database.uri.replace(/\/\/.*@/, '//***:***@') // Hide credentials in logs
    });
    throw error;
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB', {
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    database: mongoose.connection.name
  });
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error', {
    error: err.message,
    name: err.name,
    code: err.code
  });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  logger.info('Mongoose reconnected to MongoDB');
});

mongoose.connection.on('reconnectFailed', () => {
  logger.error('Mongoose reconnection failed');
});

// Close connection when Node process terminates
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, closing MongoDB connection gracefully`);
  
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during MongoDB connection cleanup', {
      error: error.message,
      signal
    });
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = connectDB;
