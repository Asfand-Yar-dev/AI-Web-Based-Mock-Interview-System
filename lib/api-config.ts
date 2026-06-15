/**
 * =============================================================================
 * API Configuration
 * =============================================================================
 * 
 * Centralized API configuration for frontend-backend communication.
 * This file contains all API endpoints and configuration settings.
 */

// API Base URL - uses environment variable or defaults to localhost
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/api/users/register',
    LOGIN: '/api/users/login',
    GOOGLE: '/api/users/google',
    ME: '/api/users/me',
    UPDATE_PROFILE: '/api/users/me',
    CHANGE_PASSWORD: '/api/users/change-password',
    SET_PASSWORD: '/api/users/set-password',
    VERIFY_TOKEN: '/api/users/verify-token',
    FORGOT_PASSWORD: '/api/users/forgot-password',
    VERIFY_RESET_OTP: '/api/users/verify-reset-otp',
    RESET_PASSWORD: '/api/users/reset-password',
  },
  
  // Interviews
  INTERVIEWS: {
    START: '/api/interviews/start',
    MY_SESSIONS: '/api/interviews/my-sessions',
    END: (sessionId: string) => `/api/interviews/${sessionId}/end`,
    CANCEL: (sessionId: string) => `/api/interviews/${sessionId}/cancel`,
    GET_BY_ID: (sessionId: string) => `/api/interviews/${sessionId}`,
    QUESTIONS: (sessionId: string) => `/api/interviews/${sessionId}/questions`,
    RESULTS: (sessionId: string) => `/api/interviews/${sessionId}/results`,
  },
  
  // Questions
  QUESTIONS: {
    GET_ALL: '/api/questions',
    CATEGORIES: '/api/questions/categories',
    RANDOM: '/api/questions/random',
    ADD: '/api/questions/add',
    GET_BY_ID: (questionId: string) => `/api/questions/${questionId}`,
  },
  
  // Answers
  ANSWERS: {
    SUBMIT: '/api/answers/submit',
    SESSION: (sessionId: string) => `/api/answers/session/${sessionId}`,
  },
  
  // Admin
  ADMIN: {
    DASHBOARD: '/api/admin/dashboard',
  },

  // User Stats
  STATS: '/api/users/stats',
  
  // Health Check
  HEALTH: '/health',

  // ── Premium Live Interview ──────────────────────────────────────────────────
  // Matches backend routes in:
  //   backend/routes/bookingRoutes.js
  //   backend/routes/paymentRoutes.js
  //   backend/routes/interviewerRoutes.js
  LIVE: {
    REQUEST_BOOKING:        '/api/bookings/request',
    MY_BOOKINGS:            '/api/bookings/mine',
    BOOKING_BY_ID:          (bookingId: string) => `/api/bookings/${bookingId}`,
    RESPOND_BOOKING:        (bookingId: string) => `/api/bookings/${bookingId}/respond`,
    JOIN_MEETING:           (bookingId: string) => `/api/bookings/${bookingId}/join`,
    END_MEETING:            (bookingId: string) => `/api/bookings/${bookingId}/end`,
    CHECKOUT:               '/api/payments/create-checkout',
    // Notify backend that an S3 upload is complete (sends the resulting URL)
    NOTIFY_RECORDING:       (bookingId: string) => `/api/bookings/${bookingId}/recording-uploaded`,
    // Direct multipart upload to backend (dev / FYP path, no S3 needed)
    UPLOAD_RECORDING:       (bookingId: string) => `/api/bookings/${bookingId}/upload-recording`,
    INTERVIEWER_FEEDBACK:   (bookingId: string) => `/api/bookings/${bookingId}/feedback`,
    INTERVIEWERS:           '/api/interviewers',
    MY_INTERVIEWER_PROFILE: '/api/interviewers/me',
  },

} as const;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 60000;

// Token storage keys
export const STORAGE_KEYS = {
  TOKEN: 'aiInterviewToken',
  USER: 'aiInterviewUser',
  USER_NAME: 'aiInterviewUserName',
  USER_EMAIL: 'aiInterviewUserEmail',
} as const;

// Socket.IO path used by the signalling server (LiveInterviewRoom)
export const SOCKET_IO_PATH = '/socket.io';
