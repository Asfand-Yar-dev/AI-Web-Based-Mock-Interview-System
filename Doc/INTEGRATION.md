# Frontend-Backend Integration Summary

## Overview

This document summarizes the complete integration of the Intervexa frontend with the backend API.

## Files Created

### New Files

| File | Purpose |
|------|---------|
| `lib/api-config.ts` | Centralized API configuration with endpoints |
| `lib/api.ts` | Complete API service with all backend endpoints |
| `contexts/auth-context.tsx` | Global auth state management with React Context |
| `contexts/index.ts` | Contexts barrel export |
| `.env.local` | Frontend environment configuration |
| `.env.example` | Frontend environment template |

### Updated Files

| File | Changes |
|------|---------|
| `app/layout.tsx` | Added AuthProvider wrapper |
| `components/auth/auth-form.tsx` | Replaced mock API with real backend calls |
| `components/dashboard/dashboard-layout.tsx` | Uses auth context for user info and logout |
| `components/dashboard/history-content.tsx` | Fetches real session history from API |
| `app/dashboard/page.tsx` | Uses real API for dashboard stats |
| `app/dashboard/settings/page.tsx` | Profile updates and password changes via API |
| `app/interview/setup/page.tsx` | Creates real interview sessions |
| `hooks/use-auth.ts` | Re-exports from auth context for compatibility |

## API Integration Details

### Authentication Flow

1. **Registration**: `POST /api/users/register`
   - Sends `{ name, email, password }`
   - Stores JWT token and user data in localStorage
   - Redirects to dashboard

2. **Login**: `POST /api/users/login`
   - Sends `{ email, password }`
   - Stores JWT token and user data
   - Redirects to dashboard

3. **Google Sign-In**: `POST /api/users/google`
   - Sends `{ idToken }` from Google OAuth
   - Creates or finds user
   - Returns JWT for session

4. **Token Verification**: `GET /api/users/verify-token`
   - Validates stored JWT on app load
   - User data refreshed from server

5. **Logout**: Client-side only
   - Clears localStorage
   - Redirects to login

### Protected Routes

All `/dashboard/*` and `/interview/*` routes are protected:
- `useRequireAuth()` hook checks authentication
- Redirects to `/login` if not authenticated
- Shows loading spinner during auth check

### Interview Flow

1. **Setup**: User configures interview type, job title, skills
2. **Start Session**: `POST /api/interviews/start`
3. **Get Questions**: `GET /api/questions/random`
4. **Submit Answers**: `POST /api/answers/submit`
5. **End Session**: `PUT /api/interviews/:id/end`
6. **View Results**: `GET /api/interviews/:id/results`

### Dashboard Stats

- **Get Stats**: `GET /api/users/stats` (server-side aggregated statistics)

## Security Implementation

### Frontend Security

1. **Token Storage**: JWT stored in localStorage under `aiInterviewToken`
2. **Auto-Injection**: Token automatically added to API request headers
3. **Token Validation**: Verified on app load and route changes
4. **Input Validation**: Client-side validation before API calls
5. **XSS Protection**: `sanitizeInput()` utility available

### Backend Security (Already Implemented)

1. **Password Hashing**: bcrypt with configurable salt rounds
2. **JWT Auth**: Token-based authentication
3. **Rate Limiting**: 100 requests per 15 minutes
4. **CORS**: Configured for frontend origin
5. **Helmet**: Security headers enabled
6. **Input Validation**: express-validator on all endpoints

## Environment Variables

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=optional-google-client-id
```

### Backend (`.env`)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai_interview_system
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
GOOGLE_CLIENT_ID=optional-google-client-id
```

## Running the Application

### Start Backend

```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```

### Start Frontend

```bash
# From project root
pnpm install
pnpm dev
# App runs on http://localhost:3000
```

## Future AI Integration Points

The architecture supports easy integration of AI modules:

### 1. AI Analysis Endpoints

Add to `lib/api-config.ts`:
```typescript
AI: {
  ANALYZE_ANSWER: '/api/ai/analyze',
  FACIAL_ANALYSIS: '/api/ai/facial',
  VOCAL_ANALYSIS: '/api/ai/vocal',
  GENERATE_QUESTIONS: '/api/ai/questions',
}
```

### 2. Backend AI Routes

Create in backend:
- `routes/aiRoutes.js` - AI analysis endpoints
- `controllers/aiController.js` - AI service integration
- `services/aiService.js` - AI model wrappers

### 3. Real-time Analysis

For live interview analysis:
- WebSocket connection for real-time feedback
- Video/audio stream processing
- Progressive score updates

### 4. Modular AI Services

Keep AI services decoupled:
```
backend/
├── services/
│   ├── nlpService.js      # NLP analysis
│   ├── facialService.js   # Facial analysis
│   ├── vocalService.js    # Voice analysis
│   └── scoringService.js  # Score aggregation
```

## Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Protected routes redirect unauthenticated users
- [ ] Dashboard shows user data
- [ ] Interview session creation works
- [ ] Profile update saves to backend
- [ ] Password change works (for local users)
- [ ] Logout clears session
- [ ] Error messages display correctly
- [ ] Loading states appear during API calls

## Known Limitations

1. **Google Sign-In**: Requires Google Client ID configuration
2. **AI Analysis**: Placeholder - requires AI model integration
3. **Real-time Features**: WebSocket not yet implemented
4. **Email Verification**: Not implemented in current version

## Maintenance Notes

1. **API Changes**: Update `lib/api-config.ts` for new endpoints
2. **Auth Changes**: Modify `contexts/auth-context.tsx`
3. **New Features**: Follow existing patterns in `lib/api.ts`
4. **Type Safety**: Add TypeScript interfaces for new data models
