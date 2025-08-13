const logger = require('../config/logger');
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Handle known AppError instances
  if (err instanceof AppError) {
    // Log operational errors at info level
    logger.info('Operational error handled', {
      message: err.message,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
      requestId: req.requestId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        isOperational: err.isOperational 
      })
    });
  }

  // Log unexpected errors at error level
  logger.error('Unexpected error occurred', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = AppError.badRequest(message);
    error.statusCode = 404;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = field 
      ? `Duplicate field value for ${field}. Please use another value.`
      : 'Duplicate entry found';
    error = AppError.conflict(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = AppError.validationError(message);
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    const message = 'Database connection error. Please try again later.';
    error = AppError.serviceUnavailable(message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = AppError.unauthorized(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = AppError.unauthorized(message);
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      name: err.name,
      isOperational: error.isOperational || false
    })
  });
};

module.exports = { errorHandler };
