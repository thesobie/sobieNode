/**
 * Custom Application Error Class
 * Extends Error to provide structured error handling
 */
class AppError extends Error {
  constructor(message, statusCode, code = null, details = {}) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      status: this.status,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: this.stack,
        details: this.details 
      })
    };
  }

  /**
   * Static methods for common error types
   */
  static badRequest(message = 'Bad Request', code = 'BAD_REQUEST', details = {}) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED', details = {}) {
    return new AppError(message, 401, code, details);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details = {}) {
    return new AppError(message, 403, code, details);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND', details = {}) {
    return new AppError(message, 404, code, details);
  }

  static conflict(message = 'Conflict', code = 'CONFLICT', details = {}) {
    return new AppError(message, 409, code, details);
  }

  static validationError(message = 'Validation Error', code = 'VALIDATION_ERROR', details = {}) {
    return new AppError(message, 422, code, details);
  }

  static tooManyRequests(message = 'Too Many Requests', code = 'RATE_LIMIT', details = {}) {
    return new AppError(message, 429, code, details);
  }

  static internal(message = 'Internal Server Error', code = 'INTERNAL_ERROR', details = {}) {
    return new AppError(message, 500, code, details);
  }

  static serviceUnavailable(message = 'Service Unavailable', code = 'SERVICE_UNAVAILABLE', details = {}) {
    return new AppError(message, 503, code, details);
  }
}

module.exports = { AppError };
