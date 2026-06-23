"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  CalendarDays,
  Clock,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Video,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  User,
  Bell,
  CalendarPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LiveBooking } from "@/lib/liveInterviewApi"
import { liveInterviewApi, BOOKING_STATUS } from "@/lib/liveInterviewApi"
import { BookingStatusBadge } from "@/components/live-interview/booking-status-badge"
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar"

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive"
  return (
    <span className={`text-lg font-bold tabular-nums ${color}`}>
      {score}<span className="text-xs font-normal text-muted-foreground">/100</span>
    </span>
  )
}

// ── Add to Google Calendar button ─────────────────────────────────────────────

/**
 * Downloads an .ics calendar file with 1-day + 1-hour reminders (display + email).
 * Tied to booking status so it never disappears on re-render.
 */
function AddToCalendarButton({ booking }: { booking: LiveBooking }) {
  const app     = booking.applicantId as any
  const appName = app && typeof app === "object" ? (app.name || "Applicant") : "Applicant"

  const meetingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/live-interview/room/${booking.meetingRoomId}`
      : `/live-interview/room/${booking.meetingRoomId}`

  const eventParams = {
    title:           `Interview: ${booking.role} — Intervexa`,
    startTime:       booking.scheduledTime,
    durationMinutes: booking.durationMinutes,
    location:        "Online",
    meetingUrl,
    description:
      `Interview with ${appName} for the role of ${booking.role} (${booking.domain}).\n` +
      `Skills: ${booking.skills?.join(", ") || "N/A"}\n\n` +
      `Scheduled via Intervexa.`,
  }

  return (
    <button
      onClick={() => window.open(buildGoogleCalendarUrl(eventParams), "_blank", "noopener")}
      className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20 hover:border-success/60 hover:-translate-y-0.5 transition-all duration-200"
      title="Opens Google Calendar with the event pre-filled — just click Save"
    >
      <CalendarPlus className="h-4 w-4" />
      Add to Google Calendar
    </button>
  )
}

// ── Accept/Reject panel ───────────────────────────────────────────────────────

function ApprovalPanel({
  bookingId,
  onSuccess,
}: {
  bookingId: string
  onSuccess: () => void
}) {
  const [action, setAction] = useState<"accept" | "reject" | null>(null)
  const [note, setNote]     = useState("")
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [done, setDone]     = useState(false)

  async function respond(a: "accept" | "reject") {
    setBusy(true)
    setError(null)
    try {
      await liveInterviewApi.respondToBooking(bookingId, a, note || undefined)
      setDone(true)
      setTimeout(onSuccess, 800)
    } catch (err: any) {
      setError(err?.message || "Failed to respond. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Response sent!
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 space-y-3 overflow-hidden border-t border-border/40 pt-4"
    >
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Bell className="h-3.5 w-3.5 text-warning" />
        New booking request — please accept or decline
      </p>

      {/* Optional rejection note */}
      {action === "reject" && (
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Reason for declining (optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Unavailable at that time, please try a different slot…"
            className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none transition-all"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {action !== "reject" && (
          <Button
            size="sm"
            onClick={() => respond("accept")}
            disabled={busy}
            className="gap-2 bg-success text-white hover:bg-success"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Accept
          </Button>
        )}
        {action === "reject" ? (
          <>
            <Button
              size="sm"
              onClick={() => respond("reject")}
              disabled={busy}
              className="gap-2 bg-destructive text-white hover:bg-destructive"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Confirm Decline
            </Button>
            <button
              onClick={() => setAction(null)}
              className="text-xs text-muted-foreground hover:text-card-foreground transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setAction("reject")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Decline
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Feedback form ─────────────────────────────────────────────────────────────

function FeedbackForm({
  bookingId,
  onSuccess,
}: {
  bookingId: string
  onSuccess: () => void
}) {
  const [score, setScore]       = useState("")
  const [text, setText]         = useState("")
  const [transcript, setTranscript] = useState("")
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function submit() {
    const s = Number(score)
    if (!Number.isFinite(s) || s < 0 || s > 100) { setError("Score must be between 0 and 100"); return }
    if (!text || text.trim().length < 10)           { setError("Feedback must be at least 10 characters"); return }
    setBusy(true)
    setError(null)
    try {
      await liveInterviewApi.submitInterviewerFeedback(
        bookingId,
        s,
        text.trim(),
        transcript.trim() || undefined
      )
      setSubmitted(true)
      onSuccess()
    } catch (err: any) {
      setError(err?.message || "Submission failed. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Feedback submitted successfully!
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3 overflow-hidden"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
        <MessageSquare className="h-4 w-4 text-accent" />
        Submit Your Feedback
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Score (0–100)</label>
        <input
          type="number" min={0} max={100}
          placeholder="e.g. 78"
          className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          value={score}
          onChange={(e) => { setScore(e.target.value); setError(null) }}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">
          Interview Q&amp;A Notes / Transcript <span className="text-accent">(recommended — enables AI analysis)</span>
        </label>
        <textarea
          rows={5}
          placeholder={
            "Format recommendation:\n" +
            "Q: What is the difference between REST and GraphQL?\n" +
            "A: Candidate gave a decent comparison but missed subscriptions...\n\n" +
            "Q: How would you design a rate limiter?\n" +
            "A: Used token bucket algorithm, explained well..."
          }
          className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none transition-all"
          value={transcript}
          onChange={(e) => { setTranscript(e.target.value); setError(null) }}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          If provided, our AI will evaluate the candidate's performance across dimensions and generate an automated report.
        </p>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Detailed Feedback (min. 10 chars)</label>
        <textarea
          rows={4}
          placeholder="Share your observations on the candidate's performance, communication, and technical skills…"
          className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none transition-all"
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null) }}
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
      <Button onClick={submit} disabled={busy} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
        <Send className="h-3.5 w-3.5" />
        {busy ? "Submitting…" : "Submit Feedback"}
      </Button>
    </motion.div>
  )
}

// ── Date-relative label helper (shared logic, same as applicant side) ─────────

function getDateLabel(scheduledTime: string): {
  label: string; color: string; bg: string; border: string;
} {
  const now     = new Date()
  const session = new Date(scheduledTime)
  const todayMidnight   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sessionMidnight = new Date(session.getFullYear(), session.getMonth(), session.getDate())
  const diffDays = Math.round((sessionMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
  const missedCutoff = session.getTime() + 2 * 60 * 60 * 1000
  if (now.getTime() > missedCutoff)
    return { label: "⚠ Missed",    color: "rgb(251,113,133)", bg: "rgba(244,63,94,0.15)",  border: "rgba(244,63,94,0.4)"  }
  if (diffDays === 0) return { label: "📅 Today",   color: "rgb(52,211,153)",   bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)" }
  if (diffDays === 1) return { label: "🌅 Tomorrow",color: "rgb(251,191,36)",  bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)" }
  if (diffDays <= 7)  return { label: `In ${diffDays} days`, color: "rgb(129,140,248)", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.4)" }
  return { label: session.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
           color: "rgb(148,163,184)", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" }
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onRefresh,
}: {
  booking: LiveBooking
  onRefresh: () => void
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const when = new Date(booking.scheduledTime)

  // Derive applicant display name if populated
  const app = booking.applicantId as any
  const appName = app && typeof app === "object" ? (app.name || "Applicant") : null

  const isPendingApproval  = booking.status === BOOKING_STATUS.PENDING_APPROVAL
  // Join Meeting: show 15 min before until meeting duration expires after scheduled start time;
  // always show if the meeting is actively started (in case it ran long)
  const now                = new Date()
  const scheduledMs        = new Date(booking.scheduledTime).getTime()
  const durationMs         = (booking.durationMinutes || 30) * 60 * 1000            // default 30 min duration
  const withinWindow       = now.getTime() >= scheduledMs - 15 * 60 * 1000          // opens 15 min before
  const notExpired         = now.getTime() <= scheduledMs + durationMs             // closes when duration ends
  const showJoin           =
    booking.status === BOOKING_STATUS.MEETING_STARTED ||
    (booking.status === BOOKING_STATUS.MEETING_SCHEDULED && withinWindow && notExpired)
  // Overdue: scheduled time window expired but meeting never started
  // Covers any active status — accepted, payment pending/completed, or meeting scheduled
  const isOverdue          =
    !notExpired &&
    now.getTime() > scheduledMs &&
    [
      BOOKING_STATUS.ACCEPTED,
      BOOKING_STATUS.PAYMENT_PENDING,
      BOOKING_STATUS.PAYMENT_COMPLETED,
      BOOKING_STATUS.MEETING_SCHEDULED,
    ].includes(booking.status as any)
  const showFeedbackBtn    = (
    [BOOKING_STATUS.MEETING_COMPLETED, BOOKING_STATUS.EVALUATING_AI, BOOKING_STATUS.RESULTS_READY].includes(booking.status as any) &&
    !booking.humanFeedback
  )
  const showResultsLink    = [BOOKING_STATUS.EVALUATING_AI, BOOKING_STATUS.RESULTS_READY].includes(booking.status as any)
  const feedbackDone       = !!booking.humanFeedback

  // Date-relative label for active/upcoming bookings
  const isActiveStatus = [
    BOOKING_STATUS.PENDING_APPROVAL, BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.PAYMENT_PENDING,  BOOKING_STATUS.PAYMENT_COMPLETED,
    BOOKING_STATUS.MEETING_SCHEDULED, BOOKING_STATUS.MEETING_STARTED,
  ].includes(booking.status as any)
  const dateLabel = isActiveStatus ? getDateLabel(booking.scheduledTime) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[17px] border p-5 transition-colors hover:border-border ${
        isOverdue
          ? "border-destructive/50 hover:border-destructive/70"
          : isPendingApproval
          ? "border-warning/40 bg-warning/5"
          : "border-border/50 bg-card"
      }`}
      style={isOverdue ? { backgroundColor: "rgba(244,63,94,0.08)" } : undefined}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isOverdue && (
            <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: "rgb(244,63,94)" }} />
          )}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-card-foreground truncate">{booking.role}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {booking.domain}
              {booking.skills?.length > 0 && (
                <> · {booking.skills.slice(0, 3).join(", ")}{booking.skills.length > 3 ? "…" : ""}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
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

      {/* Applicant */}
      {appName && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>{appName}</span>
        </div>
      )}

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        <span className="flex items-center gap-1.5 text-xs" style={dateLabel ? { color: dateLabel.color } : { color: "rgb(100,116,139)" }}>
          <CalendarDays className="h-3.5 w-3.5" />
          {when.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          {dateLabel && <span className="ml-1 font-medium">({dateLabel.label.replace(/[⚠📅🌅]/g, "").trim()})</span>}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {booking.durationMinutes} min
        </span>
      </div>

      {/* Approval panel for pending_approval bookings */}
      {isPendingApproval && (
        <ApprovalPanel bookingId={booking._id} onSuccess={onRefresh} />
      )}

      {/* Action row */}
      {!isPendingApproval && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Google Calendar button — always visible once booking is accepted/scheduled */}
          {[BOOKING_STATUS.MEETING_SCHEDULED, BOOKING_STATUS.MEETING_STARTED,
            BOOKING_STATUS.PAYMENT_COMPLETED, BOOKING_STATUS.ACCEPTED].includes(booking.status as any) && (
            <AddToCalendarButton booking={booking} />
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

          {showResultsLink && (
            <Link
              href={`/live-interview/results/${booking._id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-transparent px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View Results
            </Link>
          )}

          {feedbackDone && (
            <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm text-success font-medium">Feedback submitted</span>
              {booking.humanScore !== undefined && <ScoreBadge score={booking.humanScore} />}
            </div>
          )}

          {showFeedbackBtn && !feedbackOpen && (
            <button
              onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Submit Feedback
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}

          {showFeedbackBtn && feedbackOpen && (
            <button
              onClick={() => setFeedbackOpen(false)}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-card-foreground transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Collapse
            </button>
          )}
        </div>
      )}

      {/* Feedback form */}
      {showFeedbackBtn && feedbackOpen && (
        <div className="mt-5 border-t border-border/40 pt-4">
          <FeedbackForm
            bookingId={booking._id}
            onSuccess={() => { setFeedbackOpen(false); onRefresh() }}
          />
        </div>
      )}
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface InterviewerBookingsListProps {
  bookings: LiveBooking[]
  onRefresh: () => void
  filterStatus?: string[]
  emptyMessage?: string
}

export function InterviewerBookingsList({
  bookings,
  onRefresh,
  filterStatus,
  emptyMessage = "No bookings to show.",
}: InterviewerBookingsListProps) {
  const filtered = (
    filterStatus
      ? bookings.filter((b) => filterStatus.includes(b.status))
      : bookings
  ).slice().sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  )

  if (filtered.length === 0) {
    return (
      <div className="rounded-[17px] border border-border bg-card p-10 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filtered.map((b) => (
        <BookingCard key={b._id} booking={b} onRefresh={onRefresh} />
      ))}
    </div>
  )
}
