"use client";

/**
 * Premium Live Interview — Applicant's Bookings List
 * Shows booking status with in-app notification banners for actionable states.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  Briefcase,
  Tag,
  Video,
  ExternalLink,
  CreditCard,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Bell,
  ArrowRight,
  User,
  CalendarPlus,
} from "lucide-react";
import { liveInterviewApi, type LiveBooking, BOOKING_STATUS } from "@/lib/liveInterviewApi";
import { useBookingRealtime } from "@/hooks/use-booking-realtime";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { BookingStatusBadge } from "@/components/live-interview/booking-status-badge";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";

// ── Notification banner ───────────────────────────────────────────────────────

function AcceptedBanner({ bookings }: { bookings: LiveBooking[] }) {
  const accepted = bookings.filter((b) => b.status === BOOKING_STATUS.ACCEPTED);
  if (accepted.length === 0) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 space-y-3"
      >
        {accepted.map((b) => (
          <div
            key={b._id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-info/30 bg-info/10 px-5 py-4"
          >
            <Bell className="h-5 w-5 text-info shrink-0 animate-bounce" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-info text-sm">
                Your interview booking has been accepted!
              </p>
              <p className="text-xs text-info/80 mt-0.5">
                <strong>{b.role}</strong> — Please proceed with payment to confirm your session.
              </p>
            </div>
            <Link
              href={`/live-interview/checkout/${b._id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-info px-4 py-2 text-sm font-semibold text-white hover:bg-info transition-colors shrink-0"
            >
              <CreditCard className="h-4 w-4" />
              Proceed to Payment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Add to Google Calendar button ─────────────────────────────────────────────

function AddToCalendarButton({ booking }: { booking: LiveBooking }) {
  const iv     = booking.interviewerId as any;
  const ivName = iv && typeof iv === "object" ? (iv.userId?.name || "Interviewer") : "Interviewer";

  const meetingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/live-interview/room/${booking.meetingRoomId}`
      : `/live-interview/room/${booking.meetingRoomId}`;

  const eventParams = {
    title:           `Interview: ${booking.role} — Intervexa`,
    startTime:       booking.scheduledTime,
    durationMinutes: booking.durationMinutes,
    location:        "Online",
    meetingUrl,
    description:
      `Live interview with ${ivName} for the role of ${booking.role} (${booking.domain}).\n` +
      `Skills: ${booking.skills?.join(", ") || "N/A"}\n\n` +
      `Scheduled via Intervexa.`,
  };

  return (
    <button
      onClick={() => window.open(buildGoogleCalendarUrl(eventParams), "_blank", "noopener")}
      className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20 hover:border-success/60 hover:-translate-y-0.5 transition-all duration-200"
      title="Opens Google Calendar with the event pre-filled — just click Save"
    >
      <CalendarPlus className="h-4 w-4" />
      Add to Google Calendar
    </button>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────
// ── Date-relative label helper ───────────────────────────────────────────────

function getDateLabel(scheduledTime: string): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  const now     = new Date();
  const session = new Date(scheduledTime);

  // Normalise to midnight for day comparisons
  const todayMidnight    = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
  const sessionMidnight  = new Date(session.getFullYear(), session.getMonth(), session.getDate());
  const diffDays = Math.round((sessionMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  // Past the 2-hour window → missed
  const missedCutoff = session.getTime() + 2 * 60 * 60 * 1000;
  if (now.getTime() > missedCutoff) {
    return { label: "⚠ Missed",      color: "rgb(251,113,133)",   bg: "rgba(244,63,94,0.15)",   border: "rgba(244,63,94,0.4)"  };
  }
  if (diffDays === 0)  return { label: "📅 Today",     color: "rgb(52,211,153)",    bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)" };
  if (diffDays === 1)  return { label: "🌅 Tomorrow",  color: "rgb(251,191,36)",   bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)" };
  if (diffDays <= 7)   return { label: `In ${diffDays} days`, color: "rgb(129,140,248)", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.4)" };
  return { label: session.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
           color: "rgb(148,163,184)",  bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" };
}

function BookingCard({ booking, onRefresh }: { booking: LiveBooking; onRefresh: () => void }) {
  const when = new Date(booking.scheduledTime);

  // Derive the interviewer's display name if populated
  const iv = booking.interviewerId as any;
  const ivName = iv && typeof iv === "object"
    ? (iv.userId?.name || "Interviewer")
    : null;

  const showPayment  = [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.PAYMENT_PENDING].includes(booking.status as any);
  // Join Meeting: show 15 min before until meeting duration expires after scheduled start time;
  // always show if the meeting is actively started (in case it ran long)
  const now          = new Date();
  const scheduledMs  = new Date(booking.scheduledTime).getTime();
  const durationMs   = (booking.durationMinutes || 30) * 60 * 1000;            // default 30 min duration
  const withinWindow = now.getTime() >= scheduledMs - 15 * 60 * 1000;       // opens 15 min before
  const notExpired   = now.getTime() <= scheduledMs + durationMs;            // closes when duration ends
  const showJoin     =
    booking.status === BOOKING_STATUS.MEETING_STARTED ||
    (booking.status === BOOKING_STATUS.MEETING_SCHEDULED && withinWindow && notExpired);
  // Calendar button: show only after payment is confirmed
  const showCalendar = [
    BOOKING_STATUS.PAYMENT_COMPLETED,
    BOOKING_STATUS.MEETING_SCHEDULED,
    BOOKING_STATUS.MEETING_STARTED,
  ].includes(booking.status as any);
  const showResults  = booking.status === BOOKING_STATUS.RESULTS_READY;
  const isRejected   = booking.status === BOOKING_STATUS.REJECTED;
  const isNoShow     = [BOOKING_STATUS.FAILED_NO_SHOW, BOOKING_STATUS.REFUNDED].includes(booking.status as any);
  const isPending    = booking.status === BOOKING_STATUS.PENDING_APPROVAL;
  // Overdue: scheduled time window expired but meeting never started
  // Covers any active status — accepted, payment pending/completed, or meeting scheduled
  const isOverdue    =
    !notExpired &&
    now.getTime() > scheduledMs &&
    [
      BOOKING_STATUS.ACCEPTED,
      BOOKING_STATUS.PAYMENT_PENDING,
      BOOKING_STATUS.PAYMENT_COMPLETED,
      BOOKING_STATUS.MEETING_SCHEDULED,
    ].includes(booking.status as any);

  // Date label (only for active/upcoming statuses)
  const isActiveStatus = [
    BOOKING_STATUS.PENDING_APPROVAL, BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.PAYMENT_PENDING,  BOOKING_STATUS.PAYMENT_COMPLETED,
    BOOKING_STATUS.MEETING_SCHEDULED, BOOKING_STATUS.MEETING_STARTED,
  ].includes(booking.status as any);
  const dateLabel = isActiveStatus ? getDateLabel(booking.scheduledTime) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 transition-colors ${
        isOverdue
          ? "border-destructive/50 hover:border-destructive/70"
          : "border-border/50 bg-card hover:border-border"
      }`}
      style={isOverdue ? { backgroundColor: "rgba(244,63,94,0.08)" } : undefined}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isOverdue && (
            <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: "rgb(244,63,94)" }} />
          )}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-card-foreground truncate">{booking.role}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground capitalize">{booking.domain}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date-relative label badge */}
          {dateLabel && (
            <span
              style={{ backgroundColor: dateLabel.bg, borderColor: dateLabel.border, color: dateLabel.color }}
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
            >
              {dateLabel.label}
            </span>
          )}
          <BookingStatusBadge status={booking.status} showIcon />
        </div>
      </div>

      {/* Interviewer */}
      {ivName && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>{ivName}</span>
        </div>
      )}

      {/* Meta */}
      <div className="mt-3 grid gap-y-1.5 grid-cols-2 sm:flex sm:flex-wrap sm:gap-x-5">
        <span className="flex items-center gap-1.5 text-xs" style={dateLabel ? { color: dateLabel.color } : { color: "rgb(100,116,139)" }}>
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {when.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          {dateLabel && <span className="ml-1 font-medium">({dateLabel.label.replace(/[⚠📅🌅]/g, "").trim()})</span>}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {booking.durationMinutes} min
        </span>
        {booking.skills?.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2 sm:col-span-1">
            <Tag className="h-3.5 w-3.5 shrink-0" />
            {booking.skills.slice(0, 3).join(", ")}{booking.skills.length > 3 ? "…" : ""}
          </span>
        )}
      </div>

      {/* Rejection note */}
      {isRejected && (booking as any).interviewerNote && (
        <div className="mt-3 rounded-xl bg-destructive/5 border border-destructive/15 px-3 py-2 text-xs text-destructive">
          <strong>Reason:</strong> {(booking as any).interviewerNote}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {isPending && (
          <span className="inline-flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/20 px-4 py-2 text-sm text-warning">
            <Clock className="h-4 w-4" />
            Waiting for interviewer approval…
          </span>
        )}
        {showPayment && (
          <Link
            href={`/live-interview/checkout/${booking._id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-info/80 px-4 py-2 text-sm font-medium text-white hover:bg-info transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            {booking.status === BOOKING_STATUS.ACCEPTED ? "Proceed to Payment" : "Complete Payment"}
          </Link>
        )}
        {showJoin && (
          <Link
            href={`/live-interview/room/${booking.meetingRoomId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <Video className="h-4 w-4" />
            {booking.status === BOOKING_STATUS.MEETING_STARTED ? "Rejoin Meeting" : "Join Meeting"}
          </Link>
        )}
        {showCalendar && (
          <AddToCalendarButton booking={booking} />
        )}
        {(booking.status === BOOKING_STATUS.MEETING_COMPLETED ||
          booking.status === BOOKING_STATUS.EVALUATING_AI) && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            <span className="inline-flex items-center gap-2 rounded-xl bg-info/10 border border-info/20 px-4 py-2 text-sm text-info">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI is analyzing your interview… results ready in ~10 min
            </span>
            <Link
              href={`/live-interview/results/${booking._id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-transparent px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Track Status
            </Link>
          </div>
        )}
        {booking.status === BOOKING_STATUS.RESULTS_READY && (
          <Link
            href={`/live-interview/results/${booking._id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            View Full Report
          </Link>
        )}
        {isRejected && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            <span className="inline-flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" />
              Request Declined
            </span>
            <Link
              href="/live-interview/book"
              className="inline-flex items-center gap-2 rounded-xl bg-secondary/60 border border-border/40 px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary transition-colors"
            >
              <Plus className="h-4 w-4" />
              Book Another
            </Link>
          </div>
        )}
        {isNoShow && (
          <span className="inline-flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Refund Issued
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Section group ─────────────────────────────────────────────────────────────

function SectionGroup({ title, count, dotColor, children }: {
  title: string;
  count: number;
  dotColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {dotColor && <span className={`h-2 w-2 rounded-full ${dotColor}`} />}
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
      </div>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyBookingsPage() {
  const [bookings, setBookings]       = useState<LiveBooking[] | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [refreshing, setRefreshing]   = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await liveInterviewApi.myBookings("applicant");
      setBookings(res.data ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load bookings");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live updates — re-fetch whenever the interviewer responds, payment lands,
  // results are ready, etc. No manual refresh needed.
  useBookingRealtime(load);

  // ── Sort helpers ─────────────────────────────────────────────────────────
  const byDate = (a: LiveBooking, b: LiveBooking) =>
    new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
  const byDateDesc = (a: LiveBooking, b: LiveBooking) =>
    new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime();

  // Status groupings — each sorted by scheduled date
  const pendingApproval = (bookings?.filter((b) => b.status === BOOKING_STATUS.PENDING_APPROVAL) ?? []).sort(byDate);
  const accepted        = (bookings?.filter((b) => [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.PAYMENT_PENDING].includes(b.status as any)) ?? []).sort(byDate);
  const scheduled       = (bookings?.filter((b) => [BOOKING_STATUS.PAYMENT_COMPLETED, BOOKING_STATUS.MEETING_SCHEDULED, BOOKING_STATUS.MEETING_STARTED].includes(b.status as any)) ?? []).sort(byDate);
  const completed       = (bookings?.filter((b) => [BOOKING_STATUS.MEETING_COMPLETED, BOOKING_STATUS.EVALUATING_AI, BOOKING_STATUS.RESULTS_READY].includes(b.status as any)) ?? []).sort(byDateDesc);
  const rejected        = (bookings?.filter((b) => [BOOKING_STATUS.REJECTED, BOOKING_STATUS.FAILED_NO_SHOW, BOOKING_STATUS.REFUNDED].includes(b.status as any)) ?? []).sort(byDateDesc);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Live Interviews</h1>
          <p className="mt-1 text-muted-foreground">Track your bookings from request to completion.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/live-interview/book"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Book New Session
          </Link>
        </div>
      </div>

      {/* Loading */}
      {!bookings && !error && (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading your bookings…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={load} className="mt-2 bg-transparent gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {bookings?.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card p-12 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="font-medium text-card-foreground">No live interviews yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse interviewers and book your first session.
            </p>
          </div>
          <Link
            href="/live-interview/book"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Browse Interviewers
          </Link>
        </div>
      )}

      {/* Accepted notification banners */}
      {bookings && <AcceptedBanner bookings={bookings} />}

      {/* Sections */}
      {bookings && bookings.length > 0 && (
        <div className="space-y-8">
          {pendingApproval.length > 0 && (
            <SectionGroup title="Pending Approval" count={pendingApproval.length} dotColor="bg-warning">
              <div className="space-y-4">
                {pendingApproval.map((b) => <BookingCard key={b._id} booking={b} onRefresh={load} />)}
              </div>
            </SectionGroup>
          )}
          {accepted.length > 0 && (
            <SectionGroup title="Accepted — Payment Required" count={accepted.length} dotColor="bg-info">
              <div className="space-y-4">
                {accepted.map((b) => <BookingCard key={b._id} booking={b} onRefresh={load} />)}
              </div>
            </SectionGroup>
          )}
          {scheduled.length > 0 && (
            <SectionGroup title="Scheduled / Active" count={scheduled.length} dotColor="bg-info">
              <div className="space-y-4">
                {scheduled.map((b) => <BookingCard key={b._id} booking={b} onRefresh={load} />)}
              </div>
            </SectionGroup>
          )}
          {completed.length > 0 && (
            <SectionGroup title="Completed" count={completed.length} dotColor="bg-success">
              <div className="space-y-4">
                {completed.map((b) => <BookingCard key={b._id} booking={b} onRefresh={load} />)}
              </div>
            </SectionGroup>
          )}
          {rejected.length > 0 && (
            <SectionGroup title="Declined / Cancelled" count={rejected.length} dotColor="bg-destructive">
              <div className="space-y-4">
                {rejected.map((b) => <BookingCard key={b._id} booking={b} onRefresh={load} />)}
              </div>
            </SectionGroup>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
