/**
 * Validation Middleware
 * Handles request validation using express-validator
 */

const { body, param, validationResult } = require('express-validator');
const { HTTP_STATUS, VALIDATION, DIFFICULTY_LEVELS, ALLOWED_EMAIL_DOMAINS } = require('../config/constants');
const mongoose = require('mongoose');

const allowedDomains = new Set(ALLOWED_EMAIL_DOMAINS);

/**
 * Custom validator: only accept sign-ups from the allowlisted email domains
 * (see ALLOWED_EMAIL_DOMAINS). Every other domain is rejected.
 */
const isAllowedEmailDomain = (value) => {
  const domain = String(value).split('@')[1]?.toLowerCase();
  if (!domain || !allowedDomains.has(domain)) {
    throw new Error(`Email must be from an allowed domain: ${ALLOWED_EMAIL_DOMAINS.join(', ')}`);
  }
  return true;
};

/**
 * Middleware to check validation results and return errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }

  next();
};

/**
 * Custom validator for MongoDB ObjectId
 */
const isValidObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

// ============ USER VALIDATION RULES ============

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: VALIDATION.NAME_MIN_LENGTH, max: VALIDATION.NAME_MAX_LENGTH })
    .withMessage(`Name must be between ${VALIDATION.NAME_MIN_LENGTH} and ${VALIDATION.NAME_MAX_LENGTH} characters`),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
    .custom(isAllowedEmailDomain),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: VALIDATION.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`),

  validate
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  validate
];

// ============ INTERVIEW VALIDATION RULES ============

const startInterviewValidation = [
  body('session_type')
    .optional()
    .trim()
    .isString().withMessage('Session type must be a string'),

  body('jobTitle')
    .optional()
    .trim()
    .isString(),

  body('skills')
    .optional()
    .isArray(),

  body('jobDescription')
    .optional()
    .trim()
    .isString(),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard']),

  validate
];

const userIdParamValidation = [
  param('userId')
    .custom(isValidObjectId),

  validate
];

// ============ QUESTION VALIDATION RULES ============

const addQuestionValidation = [
  body('questionText')
    .trim()
    .notEmpty().withMessage('Question text is required')
    .isLength({ min: 10 }).withMessage('Question must be at least 10 characters'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required'),

  body('difficulty')
    .optional()
    .isIn(Object.values(DIFFICULTY_LEVELS))
    .withMessage(`Difficulty must be one of: ${Object.values(DIFFICULTY_LEVELS).join(', ')}`),

  validate
];

// ============ ANSWER VALIDATION RULES ============
// NOTE: Field names must match the Answer model (camelCase)

const submitAnswerValidation = [
  body('questionId')
    .notEmpty().withMessage('Question ID is required')
    .custom(isValidObjectId),

  body('interviewId')
    .notEmpty().withMessage('Interview session ID is required')
    .custom(isValidObjectId),

  body('answerText')
    .trim()
    .notEmpty().withMessage('Answer text is required'),

  validate
];

module.exports = {
  validate,
  isValidObjectId,
  registerValidation,
  loginValidation,
  startInterviewValidation,
  userIdParamValidation,
  addQuestionValidation,
  submitAnswerValidation
};
