/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

const logger = require('../config/logger');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {Object|null} details - Optional extra fields (e.g. { code, email })
   *                                that get merged into the JSON error response.
   * @param {boolean} isOperational
   */
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper to catch async errors
 * Eliminates need for try-catch in every route
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not Found handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(HTTP_STATUS.NOT_FOUND, `Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_ERROR;
  let message = err.message || 'Internal Server Error';

  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid ID format';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expired';
  }

  // SECURITY: Only include stack trace in development
  // Safe default: if NODE_ENV is not explicitly 'development', hide internals
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    message,
    // Merge any operational details (e.g. { code: 'EMAIL_NOT_VERIFIED', email })
    // so the frontend can react to specific error cases.
    ...(err.details && typeof err.details === 'object' ? err.details : {}),
    ...(isDev && {
      stack: err.stack,
      error: err
    })
  });
};

module.exports = {
  ApiError,
  asyncHandler,
  notFoundHandler,
  errorHandler
};
