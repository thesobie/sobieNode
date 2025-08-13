const { AppError } = require('./AppError');

/**
 * Async error handler wrapper
 * Catches async errors and passes them to Express error handler
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler
 * Converts express-validator errors to AppError format
 */
const handleValidationError = (errors) => {
  const formattedErrors = errors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value
  }));

  return AppError.validationError(
    'Validation failed',
    'VALIDATION_ERROR',
    { errors: formattedErrors }
  );
};

/**
 * Mongoose error handlers
 */
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return AppError.badRequest(message, 'INVALID_ID');
};

const handleDuplicateFieldsError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  const message = `Duplicate value for ${field}: ${value}`;
  return AppError.conflict(message, 'DUPLICATE_FIELD', { field, value });
};

const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message,
    value: err.value
  }));

  return AppError.validationError(
    'Database validation failed',
    'DB_VALIDATION_ERROR',
    { errors }
  );
};

/**
 * JWT error handlers
 */
const handleJWTError = () => {
  return AppError.unauthorized('Invalid token', 'INVALID_TOKEN');
};

const handleJWTExpiredError = () => {
  return AppError.unauthorized('Token has expired', 'TOKEN_EXPIRED');
};

/**
 * Convert operational errors to AppError format
 */
const handleOperationalError = (error) => {
  // MongoDB errors
  if (error.name === 'CastError') return handleCastError(error);
  if (error.code === 11000) return handleDuplicateFieldsError(error);
  if (error.name === 'ValidationError') return handleValidationErrorDB(error);

  // JWT errors
  if (error.name === 'JsonWebTokenError') return handleJWTError();
  if (error.name === 'TokenExpiredError') return handleJWTExpiredError();

  // Default operational error
  return AppError.internal('Something went wrong', 'UNKNOWN_ERROR');
};

module.exports = {
  catchAsync,
  handleValidationError,
  handleOperationalError,
  handleCastError,
  handleDuplicateFieldsError,
  handleValidationErrorDB,
  handleJWTError,
  handleJWTExpiredError
};
