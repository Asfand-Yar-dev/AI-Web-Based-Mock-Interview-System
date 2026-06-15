/**
 * OpenAPI 3.0 specification for the Intervexa AI Interview System API.
 * Served at GET /api-docs (Swagger UI) and GET /api-docs.json (raw spec).
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Intervexa – AI Interview System API',
      version: '1.0.0',
      description:
        'REST API for the Intervexa Smart Mock Interview System. ' +
        'All protected routes require a Bearer JWT token obtained from /api/users/login or /api/users/register.',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from login/register. Format: Bearer <token>',
        },
      },
      schemas: {
        // ── Common ──────────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error description' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        // ── User ────────────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            id:        { type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d1' },
            name:      { type: 'string', example: 'John Doe' },
            email:     { type: 'string', example: 'john@example.com' },
            user_role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            isActive:  { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                token:        { type: 'string', description: 'JWT access token' },
                refreshToken: { type: 'string', description: 'Refresh token' },
                user:         { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
        // ── Interview Session ────────────────────────────────────────────
        InterviewSession: {
          type: 'object',
          properties: {
            _id:                { type: 'string' },
            user_id:            { type: 'string' },
            session_type:       { type: 'string', enum: ['technical', 'behavioral', 'mixed', 'general'], example: 'technical' },
            jobTitle:           { type: 'string', example: 'Software Engineer' },
            skills:             { type: 'array', items: { type: 'string' }, example: ['JavaScript', 'React'] },
            difficulty:         { type: 'string', enum: ['easy', 'medium', 'hard'], example: 'medium' },
            status:             { type: 'string', enum: ['pending', 'ongoing', 'completed', 'cancelled'] },
            overall_score:      { type: 'number', example: 75 },
            total_questions:    { type: 'number', example: 5 },
            answered_questions: { type: 'number', example: 5 },
            started_at:         { type: 'string', format: 'date-time' },
            ended_at:           { type: 'string', format: 'date-time' },
            createdAt:          { type: 'string', format: 'date-time' },
          },
        },
        // ── Answer ──────────────────────────────────────────────────────
        Answer: {
          type: 'object',
          properties: {
            _id:              { type: 'string' },
            questionId:       { type: 'string' },
            interviewId:      { type: 'string' },
            answerText:       { type: 'string' },
            evaluationScore:  { type: 'number', example: 72 },
            processingStatus: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            createdAt:        { type: 'string', format: 'date-time' },
          },
        },
      },
    },

    // ── Route documentation via JSDoc tags below ──────────────────────
    paths: {

      // ═══════════════════════════════════════════════════════════════
      // AUTH
      // ═══════════════════════════════════════════════════════════════
      '/api/users/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name:     { type: 'string', example: 'John Doe' },
                    email:    { type: 'string', example: 'john@example.com' },
                    password: { type: 'string', minLength: 6, example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
            409: { description: 'Email already registered' },
          },
        },
      },

      '/api/users/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email:    { type: 'string', example: 'john@example.com' },
                    password: { type: 'string', example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            400: { description: 'Validation error' },
            401: { description: 'Invalid credentials' },
          },
        },
      },

      '/api/users/google': {
        post: {
          tags: ['Auth'],
          summary: 'Login / register via Google OAuth',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    idToken:     { type: 'string', description: 'Google ID token from client-side OAuth' },
                    authCode:    { type: 'string', description: 'Authorization code flow' },
                    accessToken: { type: 'string', description: 'Google access token' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            400: { description: 'Token required or invalid' },
          },
        },
      },

      '/api/users/refresh-token': {
        post: {
          tags: ['Auth'],
          summary: 'Exchange a refresh token for a new access token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'New tokens issued', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            401: { description: 'Invalid or expired refresh token' },
          },
        },
      },

      '/api/users/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Request a password reset token (sent via email in production)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', example: 'john@example.com' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Reset token sent (or silently ignored if email not found)' },
          },
        },
      },

      '/api/users/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password using the token from forgot-password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'newPassword'],
                  properties: {
                    token:       { type: 'string' },
                    newPassword: { type: 'string', minLength: 6 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password reset successful' },
            400: { description: 'Invalid or expired token' },
          },
        },
      },

      '/api/users/me': {
        get: {
          tags: ['Users'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { description: 'Unauthorized' },
          },
        },
        put: {
          tags: ['Users'],
          summary: 'Update current user profile (name only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { name: { type: 'string', example: 'Jane Doe' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Profile updated' },
            401: { description: 'Unauthorized' },
          },
        },
      },

      '/api/users/change-password': {
        put: {
          tags: ['Users'],
          summary: 'Change password (requires current password)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword'],
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword:     { type: 'string', minLength: 6 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password changed' },
            401: { description: 'Current password incorrect' },
          },
        },
      },

      '/api/users/settings': {
        patch: {
          tags: ['Users'],
          summary: 'Update notification preferences',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    emailNotifications:  { type: 'boolean' },
                    interviewReminders:  { type: 'boolean' },
                    resultNotifications: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Settings updated' },
            401: { description: 'Unauthorized' },
          },
        },
      },

      '/api/users/stats': {
        get: {
          tags: ['Users'],
          summary: 'Get dashboard stats for the current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'User stats',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalInterviews:       { type: 'number' },
                      completedInterviews:   { type: 'number' },
                      averageScore:          { type: 'number' },
                      confidenceImprovement: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '/api/users/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Invalidate the current refresh token',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Logged out' } },
        },
      },

      '/api/users/verify-token': {
        get: {
          tags: ['Auth'],
          summary: 'Verify that the current JWT is still valid',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Token is valid' },
            401: { description: 'Token invalid or expired' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // INTERVIEWS
      // ═══════════════════════════════════════════════════════════════
      '/api/interviews/start': {
        post: {
          tags: ['Interviews'],
          summary: 'Start a new interview session (AI questions generated automatically)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    session_type:    { type: 'string', enum: ['technical', 'behavioral', 'mixed', 'general'], example: 'technical' },
                    jobTitle:        { type: 'string', example: 'Frontend Developer' },
                    skills:          { type: 'array', items: { type: 'string' }, example: ['React', 'TypeScript'] },
                    jobDescription:  { type: 'string' },
                    difficulty:      { type: 'string', enum: ['easy', 'medium', 'hard'], example: 'medium' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Session created', content: { 'application/json': { schema: { $ref: '#/components/schemas/InterviewSession' } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },

      '/api/interviews/my-sessions': {
        get: {
          tags: ['Interviews'],
          summary: 'List current user\'s interview sessions (paginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'ongoing', 'completed', 'cancelled'] } },
            { in: 'query', name: 'page',   schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit',  schema: { type: 'integer', default: 10, maximum: 50 } },
          ],
          responses: {
            200: { description: 'Paginated list of sessions' },
          },
        },
      },

      '/api/interviews/{sessionId}': {
        get: {
          tags: ['Interviews'],
          summary: 'Get a specific interview session',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Session details', content: { 'application/json': { schema: { $ref: '#/components/schemas/InterviewSession' } } } },
            404: { description: 'Session not found' },
          },
        },
        patch: {
          tags: ['Interviews'],
          summary: 'Update a session (e.g. update score)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Session updated' } },
        },
        delete: {
          tags: ['Interviews'],
          summary: 'Delete an interview session and all its answers',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Session deleted' },
            404: { description: 'Session not found' },
          },
        },
      },

      '/api/interviews/{sessionId}/questions': {
        get: {
          tags: ['Interviews'],
          summary: 'Get the questions assigned to a session',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'List of questions' } },
        },
      },

      '/api/interviews/{sessionId}/end': {
        put: {
          tags: ['Interviews'],
          summary: 'End an interview and trigger AI scoring',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Session ended, scoring queued' },
            400: { description: 'Session not ongoing' },
          },
        },
      },

      '/api/interviews/{sessionId}/cancel': {
        put: {
          tags: ['Interviews'],
          summary: 'Cancel an ongoing interview session',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Session cancelled' } },
        },
      },

      '/api/interviews/{sessionId}/results': {
        get: {
          tags: ['Interviews'],
          summary: 'Get the full results and AI feedback for a completed session',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Session results with per-answer analysis' } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // QUESTIONS
      // ═══════════════════════════════════════════════════════════════
      '/api/questions': {
        get: {
          tags: ['Questions'],
          summary: 'List questions with optional filters',
          parameters: [
            { in: 'query', name: 'category',   schema: { type: 'string' } },
            { in: 'query', name: 'difficulty',  schema: { type: 'string', enum: ['easy', 'medium', 'hard'] } },
            { in: 'query', name: 'search',      schema: { type: 'string' }, description: 'Full-text search on question text' },
            { in: 'query', name: 'page',        schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit',       schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: { 200: { description: 'Paginated question list' } },
        },
      },

      '/api/questions/categories': {
        get: {
          tags: ['Questions'],
          summary: 'Get all unique question categories',
          responses: { 200: { description: 'Array of category strings' } },
        },
      },

      '/api/questions/random': {
        get: {
          tags: ['Questions'],
          summary: 'Get a random selection of questions',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'count',      schema: { type: 'integer', default: 5, maximum: 20 } },
            { in: 'query', name: 'category',   schema: { type: 'string' } },
            { in: 'query', name: 'difficulty', schema: { type: 'string', enum: ['easy', 'medium', 'hard'] } },
          ],
          responses: { 200: { description: 'Random questions' } },
        },
      },

      '/api/questions/add': {
        post: {
          tags: ['Questions'],
          summary: 'Add a new question (admin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['questionText', 'category'],
                  properties: {
                    questionText:    { type: 'string', minLength: 10 },
                    category:        { type: 'string' },
                    difficulty:      { type: 'string', enum: ['easy', 'medium', 'hard'] },
                    expectedAnswer:  { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Question created' },
            403: { description: 'Admin role required' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // ANSWERS
      // ═══════════════════════════════════════════════════════════════
      '/api/answers/submit': {
        post: {
          tags: ['Answers'],
          summary: 'Submit a text or audio answer to a question',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['questionId', 'interviewId', 'answerText'],
                  properties: {
                    questionId:  { type: 'string' },
                    interviewId: { type: 'string' },
                    answerText:  { type: 'string' },
                  },
                },
              },
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    questionId:  { type: 'string' },
                    interviewId: { type: 'string' },
                    audio:       { type: 'string', format: 'binary', description: 'Audio file (WAV/MP4)' },
                    video:       { type: 'string', format: 'binary', description: 'Video file for facial analysis' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Answer submitted, AI analysis queued', content: { 'application/json': { schema: { $ref: '#/components/schemas/Answer' } } } },
            400: { description: 'Validation error' },
            404: { description: 'Session or question not found' },
          },
        },
      },

      '/api/answers/user/my-answers': {
        get: {
          tags: ['Answers'],
          summary: 'List all answers submitted by the current user (paginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page',  schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: {
            200: { description: 'Paginated list of the user\'s answers' },
            401: { description: 'Unauthorized' },
          },
        },
      },

      '/api/answers/session/{sessionId}': {
        get: {
          tags: ['Answers'],
          summary: 'Get all answers submitted for a given interview session',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'List of answers for the session' },
            404: { description: 'Session not found' },
          },
        },
      },

      '/api/answers/{answerId}': {
        get: {
          tags: ['Answers'],
          summary: 'Get a single answer with its AI analysis (scores, feedback, transcription)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'answerId', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Answer detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/Answer' } } } },
            404: { description: 'Answer not found' },
          },
        },
        put: {
          tags: ['Answers'],
          summary: 'Update an answer (e.g. edit answer text before scoring)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'answerId', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { answerText: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Answer updated' },
            404: { description: 'Answer not found' },
          },
        },
      },

      '/api/answers/{answerId}/status': {
        get: {
          tags: ['Answers'],
          summary: 'Poll the AI processing status of an answer',
          description: 'Lightweight endpoint the frontend polls while AI scoring runs in the background.',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'answerId', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Current processing status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      processingStatus: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
                      evaluationScore:  { type: 'number' },
                    },
                  },
                },
              },
            },
            404: { description: 'Answer not found' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // RESULTS
      // ═══════════════════════════════════════════════════════════════
      '/api/results': {
        get: {
          tags: ['Results'],
          summary: 'Get all completed interview results for the current user',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'session_type', schema: { type: 'string' } },
            { in: 'query', name: 'page',         schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit',        schema: { type: 'integer', default: 10, maximum: 50 } },
          ],
          responses: { 200: { description: 'Paginated results list' } },
        },
      },

      '/api/results/{resultId}': {
        get: {
          tags: ['Results'],
          summary: 'Get a single result by ID (the session ID of a completed interview)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'resultId', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Result detail with per-answer analysis' },
            404: { description: 'Result not found' },
          },
        },
      },

      '/api/results/{resultId}/report': {
        get: {
          tags: ['Results'],
          summary: 'Get a detailed, formatted report for a completed interview',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'resultId', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Full report payload (summary, strengths, weaknesses, recommendations)' },
            404: { description: 'Result not found' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // HEALTH / METRICS
      // ═══════════════════════════════════════════════════════════════
      '/api/health/metrics': {
        get: {
          tags: ['Admin'],
          summary: 'Detailed runtime performance metrics (admin only)',
          description: 'Returns in-process metrics: request counts, latency percentiles (p50/p95/p99), status-code distribution, slowest routes, and system memory/CPU.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Performance snapshot',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      process:       { type: 'object', description: 'Node.js process info (uptime, heap, RSS)' },
                      system:        { type: 'object', description: 'OS metrics (CPU count, load avg, free memory)' },
                      requests:      { type: 'object', description: 'Total requests, active, error rate, status-code buckets' },
                      latency:       { type: 'object', description: 'p50/p95/p99 ms and histogram buckets' },
                      slowestRoutes: { type: 'array',  description: 'Top 10 routes by average response time' },
                    },
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            403: { description: 'Admin role required' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // ADMIN
      // ═══════════════════════════════════════════════════════════════
      '/api/admin/dashboard': {
        get: {
          tags: ['Admin'],
          summary: 'Get full admin dashboard data (requires admin role)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Dashboard payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      stats:                 { type: 'object' },
                      analytics:             { type: 'object' },
                      feedbackMonitoring:    { type: 'object' },
                      securityAccessControl: { type: 'object' },
                      users:                 { type: 'array' },
                      recentActivity:        { type: 'array' },
                      services:              { type: 'array' },
                    },
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            403: { description: 'Admin role required' },
          },
        },
      },

      '/api/admin/users/{id}/plan': {
        patch: {
          tags: ['Admin'],
          summary: 'Change a user\'s subscription plan (admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['plan'],
                  properties: { plan: { type: 'string', enum: ['free', 'premium', 'pro'], example: 'premium' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Plan updated' },
            403: { description: 'Admin role required' },
            404: { description: 'User not found' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // USERS (additional)
      // ═══════════════════════════════════════════════════════════════
      '/api/users/set-password': {
        post: {
          tags: ['Users'],
          summary: 'Set a password for an account created via OAuth (no current password required)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['newPassword'],
                  properties: { newPassword: { type: 'string', minLength: 6 } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password set' },
            400: { description: 'Account already has a password' },
            401: { description: 'Unauthorized' },
          },
        },
      },

      '/api/users/upgrade-plan': {
        post: {
          tags: ['Users'],
          summary: 'Upgrade the current user\'s subscription plan',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['plan'],
                  properties: { plan: { type: 'string', enum: ['premium', 'pro'], example: 'premium' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Plan upgraded' },
            401: { description: 'Unauthorized' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // INTERVIEWS (additional)
      // ═══════════════════════════════════════════════════════════════
      '/api/interviews/{sessionId}/answers': {
        get: {
          tags: ['Interviews'],
          summary: 'Get all answers submitted for a session',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'List of answers' } },
        },
        post: {
          tags: ['Interviews'],
          summary: 'Submit an answer (with optional audio/video) to a session',
          description: 'Multipart upload accepting optional `audio` and `video` files for AI analysis.',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    questionId: { type: 'string' },
                    answerText: { type: 'string' },
                    audio:      { type: 'string', format: 'binary' },
                    video:      { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Answer submitted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Answer' } } } },
            404: { description: 'Session not found' },
          },
        },
      },

      '/api/interviews/user/{userId}': {
        get: {
          tags: ['Interviews'],
          summary: 'Get all interview sessions for a specific user',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'List of the user\'s sessions' },
            403: { description: 'Not permitted to view another user\'s sessions' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // QUESTIONS (additional)
      // ═══════════════════════════════════════════════════════════════
      '/api/questions/generate': {
        post: {
          tags: ['Questions'],
          summary: 'Generate AI interview questions on the fly',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobTitle:    { type: 'string', example: 'Backend Developer' },
                    skills:      { type: 'array', items: { type: 'string' }, example: ['Node.js', 'MongoDB'] },
                    difficulty:  { type: 'string', enum: ['easy', 'medium', 'hard'] },
                    count:       { type: 'integer', default: 5, maximum: 20 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Generated questions' },
            401: { description: 'Unauthorized' },
          },
        },
      },

      '/api/questions/{id}': {
        get: {
          tags: ['Questions'],
          summary: 'Get a single question by ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Question detail' },
            404: { description: 'Question not found' },
          },
        },
        put: {
          tags: ['Questions'],
          summary: 'Update a question (admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    questionText:   { type: 'string' },
                    category:       { type: 'string' },
                    difficulty:     { type: 'string', enum: ['easy', 'medium', 'hard'] },
                    expectedAnswer: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Question updated' },
            403: { description: 'Admin role required' },
            404: { description: 'Question not found' },
          },
        },
        delete: {
          tags: ['Questions'],
          summary: 'Delete a question (admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Question deleted' },
            403: { description: 'Admin role required' },
            404: { description: 'Question not found' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // HEALTH
      // ═══════════════════════════════════════════════════════════════
      '/': {
        get: {
          tags: ['Health'],
          summary: 'Basic server status',
          responses: { 200: { description: 'Server is running' } },
        },
      },

      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check (DB status, uptime, memory) for load balancers',
          responses: { 200: { description: 'Health snapshot' } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // BOOKINGS (Premium Live Interviews)
      // ═══════════════════════════════════════════════════════════════
      '/api/bookings/request': {
        post: {
          tags: ['Bookings'],
          summary: 'Request a live interview booking with an interviewer',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['interviewerId', 'scheduledAt'],
                  properties: {
                    interviewerId: { type: 'string' },
                    scheduledAt:   { type: 'string', format: 'date-time' },
                    durationMins:  { type: 'integer', example: 60 },
                    notes:         { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Booking requested' },
            401: { description: 'Unauthorized' },
          },
        },
      },

      '/api/bookings/check-conflict': {
        post: {
          tags: ['Bookings'],
          summary: 'Check whether a proposed time slot conflicts with existing bookings',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['interviewerId', 'scheduledAt'],
                  properties: {
                    interviewerId: { type: 'string' },
                    scheduledAt:   { type: 'string', format: 'date-time' },
                    durationMins:  { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Conflict check result' } },
        },
      },

      '/api/bookings/mine': {
        get: {
          tags: ['Bookings'],
          summary: 'List the current user\'s bookings (as applicant or interviewer)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'List of bookings' } },
        },
      },

      '/api/bookings/{id}': {
        get: {
          tags: ['Bookings'],
          summary: 'Get a single booking by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Booking detail' },
            404: { description: 'Booking not found' },
          },
        },
      },

      '/api/bookings/{id}/respond': {
        post: {
          tags: ['Bookings'],
          summary: 'Interviewer accepts or declines a booking request',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action'],
                  properties: { action: { type: 'string', enum: ['accept', 'decline'] }, reason: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Booking updated' } },
        },
      },

      '/api/bookings/{id}/join': {
        post: {
          tags: ['Bookings'],
          summary: 'Join the live meeting room for a booking',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Meeting join token / room info' } },
        },
      },

      '/api/bookings/{id}/end': {
        post: {
          tags: ['Bookings'],
          summary: 'End the live meeting for a booking',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Meeting ended' } },
        },
      },

      '/api/bookings/{id}/upload-recording': {
        post: {
          tags: ['Bookings'],
          summary: 'Upload the local recording for a completed booking (applicant only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: { recording: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Recording stored' },
            403: { description: 'Only the applicant can upload' },
          },
        },
      },

      '/api/bookings/{id}/recording-uploaded': {
        post: {
          tags: ['Bookings'],
          summary: 'Notify the backend that a recording finished uploading',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Acknowledged' } },
        },
      },

      '/api/bookings/{id}/feedback': {
        post: {
          tags: ['Bookings'],
          summary: 'Interviewer submits feedback for a completed booking',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rating:   { type: 'number', minimum: 1, maximum: 5 },
                    comments: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Feedback saved' } },
        },
      },

      '/api/bookings/{id}/no-show': {
        post: {
          tags: ['Bookings'],
          summary: 'Mark a booking as a no-show (admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Marked as no-show' },
            403: { description: 'Admin role required' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // INTERVIEWERS (Premium Live Interviews)
      // ═══════════════════════════════════════════════════════════════
      '/api/interviewers': {
        get: {
          tags: ['Interviewers'],
          summary: 'List available interviewers (public)',
          parameters: [
            { in: 'query', name: 'expertise', schema: { type: 'string' } },
            { in: 'query', name: 'page',      schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit',     schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'List of interviewers' } },
        },
        post: {
          tags: ['Interviewers'],
          summary: 'Create / register an interviewer profile for the current user',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    headline:    { type: 'string' },
                    bio:         { type: 'string' },
                    expertise:   { type: 'array', items: { type: 'string' } },
                    hourlyRate:  { type: 'number' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Interviewer profile created' } },
        },
      },

      '/api/interviewers/me': {
        get: {
          tags: ['Interviewers'],
          summary: 'Get the current user\'s interviewer profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Interviewer profile' },
            404: { description: 'No interviewer profile for this user' },
          },
        },
        patch: {
          tags: ['Interviewers'],
          summary: 'Update the current user\'s interviewer profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    headline:    { type: 'string' },
                    bio:         { type: 'string' },
                    expertise:   { type: 'array', items: { type: 'string' } },
                    hourlyRate:  { type: 'number' },
                    isAvailable: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Profile updated' } },
        },
      },

      '/api/interviewers/{id}': {
        get: {
          tags: ['Interviewers'],
          summary: 'Get a public interviewer profile by ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Interviewer profile' },
            404: { description: 'Interviewer not found' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // PAYMENTS
      // ═══════════════════════════════════════════════════════════════
      '/api/payments/create-checkout': {
        post: {
          tags: ['Payments'],
          summary: 'Create a checkout session for a booking or plan upgrade',
          description: 'Note: payment provider is currently stubbed (see backend/services/paymentService.js).',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bookingId: { type: 'string' },
                    plan:      { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Checkout session / redirect URL' },
            401: { description: 'Unauthorized' },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // WEBHOOKS (called by external services, not by the UI)
      // ═══════════════════════════════════════════════════════════════
      '/api/webhooks/jazzcash': {
        post: {
          tags: ['Webhooks'],
          summary: 'Payment provider callback (raw body, signature-verified)',
          description: 'Invoked by the payment provider. Not meant to be called manually from the UI.',
          responses: { 200: { description: 'Webhook processed' } },
        },
      },

      '/api/webhooks/ai-analysis-complete': {
        post: {
          tags: ['Webhooks'],
          summary: 'AI gateway callback fired when async answer analysis finishes',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    answerId: { type: 'string' },
                    result:   { type: 'object' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Result recorded' } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // VETTING (Interviewer onboarding)
      // ═══════════════════════════════════════════════════════════════
      '/api/vetting/status': {
        get: {
          tags: ['Vetting'],
          summary: 'Get the current user\'s interviewer vetting status',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Vetting status' } },
        },
      },

      '/api/vetting/start': {
        post: {
          tags: ['Vetting'],
          summary: 'Start the interviewer vetting process',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Vetting session started' } },
        },
      },

      '/api/vetting/message': {
        post: {
          tags: ['Vetting'],
          summary: 'Send a message in the vetting conversation',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: { message: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Assistant reply' } },
        },
      },
    },
  },
  // No JSDoc scanning needed — spec is defined fully above
  apis: [],
};

module.exports = swaggerJsdoc(options);
