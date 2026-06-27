/**
 * Premium Live Interview — frontend API helpers
 * ---------------------------------------------
 * Thin fetch wrappers that match the updated backend routes:
 *   backend/routes/bookingRoutes.js   (7-stage lifecycle)
 *   backend/routes/paymentRoutes.js
 *   backend/routes/interviewerRoutes.js
 */

import { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS } from './api-config';

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function jsonFetch<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${input}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message || `Request failed (${res.status})`);
  return data as T;
}

// ── Booking status constants (mirrors backend constants.js) ─────────────────
export const BOOKING_STATUS = {
  PENDING_APPROVAL:  'pending_approval',
  ACCEPTED:          'accepted',
  REJECTED:          'rejected',
  PAYMENT_PENDING:   'payment_pending',
  PAYMENT_COMPLETED: 'payment_completed',
  MEETING_SCHEDULED: 'meeting_scheduled',
  MEETING_STARTED:   'meeting_started',
  MEETING_COMPLETED: 'meeting_completed',
  // Legacy
  EVALUATING_AI:     'evaluating_ai',
  RESULTS_READY:     'results_ready',
  FAILED_NO_SHOW:    'failed_no_show',
  REFUNDED:          'refunded',
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

export interface LiveBooking {
  _id: string;
  applicantId: string | { _id: string; name: string; email: string; profilePicture?: string };
  interviewerId: string | InterviewerProfile;
  role: string;
  skills: string[];
  domain: string;
  scheduledTime: string;
  durationMinutes: number;
  status: BookingStatus | string;
  paymentStatus: string;
  meetingRoomId: string;
  interviewerNote?: string;
  applicantJoinedAt?: string;
  interviewerJoinedAt?: string;
  meetingStartedAt?: string;
  meetingEndedAt?: string;
  recordingUrl?: string;
  aiReport?: Record<string, unknown>;
  interviewTranscript?: string;
  combinedScore?: number;
  humanScore?: number;
  humanFeedback?: string;
  humanDimensionScores?: {
    confidence?: number;
    communication?: number;
    technical?: number;
    problemSolving?: number;
    bodyLanguage?: number;
    voiceClarity?: number;
  };
  amountCents?: number;
  currency?: string;
  createdAt: string;
}

export interface InterviewerProfile {
  _id: string;
  userId: { _id: string; name: string; email?: string; profilePicture?: string } | string;
  bio?: string;
  linkedinUrl?: string;
  yearsOfExperience?: number;
  domains: string[];
  skills: string[];
  roles: string[];
  hourlyRate: number;
  currency: string;
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
  isAcceptingBookings: boolean;
  rating: number;
  totalSessions: number;
  totalReviews: number;
  isVerified?: boolean;
  vettingStatus?: 'unstarted' | 'interviewing' | 'approved' | 'rejected';
  vettingScore?: number;
}

// ── API helpers ─────────────────────────────────────────────────────────────

export const liveInterviewApi = {
  /** User sends a booking request to a specific interviewer (manual select) */
  requestBooking: (payload: {
    interviewerId: string;
    role: string;
    skills?: string[];
    domain: string;
    scheduledTime: string;
    durationMinutes?: number;
  }) =>
    jsonFetch<{ data: { bookingId: string; interviewerId: string; status: string } }>(
      API_ENDPOINTS.LIVE.REQUEST_BOOKING,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  /** Check if the interviewer is available and doesn't have a conflict near this time slot */
  checkConflict: (payload: {
    interviewerId: string;
    role: string;
    skills?: string[];
    domain: string;
    scheduledTime: string;
  }) =>
    jsonFetch<{ success: boolean; available: boolean; message?: string }>(
      '/api/bookings/check-conflict',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  /** Interviewer accepts or rejects a pending booking request */
  respondToBooking: (bookingId: string, action: 'accept' | 'reject', note?: string) =>
    jsonFetch<{ data: { bookingId: string; status: string } }>(
      API_ENDPOINTS.LIVE.RESPOND_BOOKING(bookingId),
      { method: 'POST', body: JSON.stringify({ action, note }) },
    ),

  /** Mark current user as joined; transitions to meeting_started when both are in */
  joinMeeting: (bookingId: string) =>
    jsonFetch<{ data: { status: string; meetingUrl: string } }>(
      API_ENDPOINTS.LIVE.JOIN_MEETING(bookingId),
      { method: 'POST' },
    ),

  /** End the meeting session */
  endMeeting: (bookingId: string) =>
    jsonFetch<{ data: { status: string } }>(
      API_ENDPOINTS.LIVE.END_MEETING(bookingId),
      { method: 'POST' },
    ),

  myBookings: (as?: 'applicant' | 'interviewer') =>
    jsonFetch<{ data: LiveBooking[] }>(
      `${API_ENDPOINTS.LIVE.MY_BOOKINGS}${as ? `?as=${as}` : ''}`,
    ),

  getBooking: (bookingId: string) =>
    jsonFetch<{ data: { booking: LiveBooking; meetingUrl: string } }>(
      API_ENDPOINTS.LIVE.BOOKING_BY_ID(bookingId),
    ),

  createCheckout: (bookingId: string) =>
    jsonFetch<{ data: { url: string } }>(API_ENDPOINTS.LIVE.CHECKOUT, {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    }),

  notifyRecordingUploaded: (bookingId: string, recordingUrl: string) =>
    jsonFetch(API_ENDPOINTS.LIVE.NOTIFY_RECORDING(bookingId), {
      method: 'POST',
      body: JSON.stringify({ recordingUrl }),
    }),

  submitInterviewerFeedback: (
    bookingId: string,
    humanScore: number,
    humanFeedback?: string,
    transcript?: string,
    dimensionScores?: Partial<Record<'confidence' | 'communication' | 'technical' | 'problemSolving' | 'bodyLanguage' | 'voiceClarity', number>>,
  ) =>
    jsonFetch(API_ENDPOINTS.LIVE.INTERVIEWER_FEEDBACK(bookingId), {
      method: 'POST',
      body: JSON.stringify({ humanScore, humanFeedback, transcript, dimensionScores }),
    }),

  searchInterviewers: (params: { domain?: string; skill?: string; role?: string } = {}) => {
    // Strip empty/undefined values — URLSearchParams converts undefined to the string "undefined"
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    );
    const qs = new URLSearchParams(clean).toString();
    return jsonFetch<{ data: InterviewerProfile[] }>(
      `${API_ENDPOINTS.LIVE.INTERVIEWERS}${qs ? `?${qs}` : ''}`
    );
  },

  getInterviewerById: (interviewerId: string) =>
    jsonFetch<{ data: InterviewerProfile }>(
      `${API_ENDPOINTS.LIVE.INTERVIEWERS}/${interviewerId}`,
    ),

  getMyInterviewerProfile: () =>
    jsonFetch<{ data: InterviewerProfile }>(
      API_ENDPOINTS.LIVE.MY_INTERVIEWER_PROFILE,
    ),

  upsertMyInterviewerProfile: (payload: Record<string, unknown>) =>
    jsonFetch(API_ENDPOINTS.LIVE.INTERVIEWERS, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getVettingStatus: () =>
    jsonFetch<{
      data: {
        isVerified: boolean;
        vettingStatus: 'unstarted' | 'interviewing' | 'approved' | 'rejected';
        vettingScore: number;
        vettingConversation: { role: 'user' | 'assistant'; content: string; timestamp: string }[];
      };
    }>('/api/vetting/status'),

  startVetting: () =>
    jsonFetch<{
      data: {
        vettingStatus: 'interviewing';
        vettingConversation: { role: 'user' | 'assistant'; content: string; timestamp: string }[];
      };
    }>('/api/vetting/start', { method: 'POST' }),

  sendVettingMessage: (message: string, opts: { wasPasted?: boolean; skipped?: boolean } = {}) =>
    jsonFetch<{
      data: {
        isCompleted: boolean;
        vettingStatus: 'interviewing' | 'approved' | 'rejected';
        vettingScore?: number;
        isVerified?: boolean;
        summary?: string;
        mistakes?: string[];
        strengths?: string[];
        aiGeneratedSuspected?: boolean;
        audit?: { reason: string; count?: number; points: number }[];
        vettingConversation: { role: 'user' | 'assistant'; content: string; timestamp: string }[];
      };
    }>('/api/vetting/message', {
      method: 'POST',
      body: JSON.stringify({ message, wasPasted: opts.wasPasted ?? false, skipped: opts.skipped ?? false }),
    }),
};
