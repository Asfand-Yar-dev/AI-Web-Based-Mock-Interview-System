"use client"

/**
 * Interviewer Dashboard — redesigned to match User & Admin dashboards.
 * Uses the same design system: dark theme, sidebar layout, framer-motion
 * tab transitions, and component patterns from components/admin/ and
 * components/dashboard/.
 *
 * Role guard: redirects non-interviewer users to /dashboard.
 * API:        liveInterviewApi (no backend changes).
 */

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  XCircle,
  Video,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { useRequireAuth, useAuth } from "@/contexts/auth-context"
import { liveInterviewApi, type LiveBooking, type InterviewerProfile } from "@/lib/liveInterviewApi"
import { useBookingRealtime } from "@/hooks/use-booking-realtime"
import { Button } from "@/components/ui/button"

import { InterviewerLayout, type InterviewerTab } from "@/components/interviewer/interviewer-layout"
import { InterviewerStatsCards } from "@/components/interviewer/interviewer-stats-cards"
import { InterviewerBookingsList } from "@/components/interviewer/interviewer-bookings-list"
import { InterviewerProfileForm } from "@/components/interviewer/interviewer-profile-form"
import { InterviewerSettings } from "@/components/interviewer/interviewer-settings"

// ── Tab meta ──────────────────────────────────────────────────────────────────

const TAB_TITLES: Record<InterviewerTab, { title: string; subtitle: string }> = {
  overview: { title: "Dashboard",   subtitle: "Your assignments and performance at a glance" },
  bookings: { title: "My Bookings", subtitle: "All interview sessions assigned to you" },
  profile:  { title: "My Profile",  subtitle: "Edit your public interviewer profile" },
  history:  { title: "History",     subtitle: "Past completed interview sessions" },
  settings: { title: "Settings",    subtitle: "Manage your account preferences and settings" },
}

// ── Computed stats ────────────────────────────────────────────────────────────

function computeStats(bookings: LiveBooking[]) {
  const total     = bookings.length
  const completed = bookings.filter((b) =>
    ["meeting_completed", "evaluating_ai", "results_ready"].includes(b.status)
  ).length
  const pending   = bookings.filter((b) =>
    ["meeting_completed", "evaluating_ai", "results_ready"].includes(b.status) && !b.humanFeedback
  ).length
  const awaitingApproval = bookings.filter((b) => b.status === "pending_approval").length

  const scored = bookings.filter(
    (b) => b.humanScore !== undefined && b.humanScore !== null
  )
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, b) => s + (b.humanScore ?? 0), 0) / scored.length)
      : null

  return { total, completed, pending, avgScore, awaitingApproval }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InterviewerDashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useRequireAuth()
  const { user: authUser } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<InterviewerTab>("overview")
  const [bookings, setBookings]   = useState<LiveBooking[] | null>(null)
  const [profile, setProfile]     = useState<InterviewerProfile | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // Role check — only interviewers may access this page
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const role = String(
        (user as any).user_role ?? (user as any).role ?? ""
      ).trim().toLowerCase()
      if (role !== "interviewer") {
        router.replace("/dashboard")
      }
    }
  }, [authLoading, isAuthenticated, user, router])

  // `silent` skips the full-page loading state so real-time refreshes update
  // the lists in place instead of flashing the loader on every server push.
  const loadBookings = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const res = await liveInterviewApi.myBookings("interviewer")
      setBookings(res.data ?? [])

      try {
        const pRes = await liveInterviewApi.getMyInterviewerProfile()
        setProfile(pRes.data || null)
      } catch (err) {
        console.error("Failed to load profile in dashboard:", err)
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load bookings")
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthenticated) loadBookings()
  }, [authLoading, isAuthenticated, loadBookings])

  // Live updates — when an applicant sends a new request (or any booking
  // changes), refresh the lists silently so it appears without a manual refresh.
  useBookingRealtime(useCallback(() => { loadBookings({ silent: true }) }, [loadBookings]))

  // ── Loading state ──
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  // ── Error state ──
  if (error || !bookings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h2 className="mt-3 text-xl font-semibold text-card-foreground">Could not load dashboard</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "Unknown error"}</p>
          <Button onClick={() => loadBookings()} variant="outline" className="mt-5 bg-transparent gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const { title, subtitle } = TAB_TITLES[activeTab]
  const stats = computeStats(bookings)

  return (
    <InterviewerLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={title}
      subtitle={subtitle}
    >
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "overview" && (
          <OverviewTab
            bookings={bookings}
            stats={stats}
            profile={profile}
            onRefresh={loadBookings}
            onNavigate={setActiveTab}
            userName={authUser?.name}
          />
        )}
        {activeTab === "bookings" && (
          <BookingsTab bookings={bookings} profile={profile} onRefresh={loadBookings} onNavigate={setActiveTab} />
        )}
        {activeTab === "profile" && <ProfileTab profile={profile} onNavigate={setActiveTab} onRefresh={loadBookings} />}
        {activeTab === "history" && (
          <HistoryTab bookings={bookings} profile={profile} onRefresh={loadBookings} onNavigate={setActiveTab} />
        )}
        {activeTab === "settings" && <SettingsTab onNavigate={setActiveTab} />}
      </motion.div>
    </InterviewerLayout>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  bookings,
  stats,
  profile,
  onRefresh,
  onNavigate,
  userName,
}: {
  bookings: LiveBooking[]
  stats: ReturnType<typeof computeStats>
  profile: InterviewerProfile | null
  onRefresh: () => void
  onNavigate: (tab: InterviewerTab) => void
  userName?: string
}) {
  const upcoming = bookings
    .filter((b) => ["meeting_scheduled", "meeting_started", "accepted", "payment_completed"].includes(b.status))
    .slice(0, 3)

  const pendingApproval = bookings
    .filter((b) => b.status === "pending_approval")
    .slice(0, 3)

  const pendingFeedback = bookings
    .filter(
      (b) =>
        ["meeting_completed", "evaluating_ai", "results_ready"].includes(b.status) &&
        !b.humanFeedback
    )
    .slice(0, 3)

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-foreground">
          {userName ? `Welcome back, ${userName} 👋` : "Welcome back 👋"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening with your interview assignments today.
        </p>
      </motion.div>

      {/* Incomplete Profile or Vetting warning banners */}
      {profile && (!profile.isAcceptingBookings || !profile.domains?.length || !profile.skills?.length || !profile.roles?.length || !profile.hourlyRate) ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-destructive">Profile Incomplete</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your profile is not active. Applicants cannot find you in search results or book mock interviews with you.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigate("profile")}
            className="bg-destructive text-white hover:bg-destructive/90 shrink-0 self-start sm:self-center"
          >
            Complete Profile
          </Button>
        </motion.div>
      ) : (
        /* [VETTING QUARANTINED] vetting banner disabled for testing — remove `&& false` to restore */
        profile && !profile.isVerified && false && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-accent/30 bg-accent/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-accent">AI Certification Vetting Required</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You must pass our automated AI Vetting chat before you can receive mock interview bookings or join meeting rooms.
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0 self-start sm:self-center"
            >
              <Link href="/live-interview/become-interviewer/vetting">Start AI Vetting</Link>
            </Button>
          </motion.div>
        )
      )}

      {/* Stats */}
      <InterviewerStatsCards
        totalBookings={stats.total}
        completedSessions={stats.completed}
        pendingFeedback={stats.pending}
        averageScore={stats.avgScore}
      />

      {/* Two-column grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Pending approval */}
        {pendingApproval.length > 0 && (
          <section className="rounded-2xl border border-warning/30 bg-warning/5 p-6 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-warning" />
                <h3 className="font-semibold text-card-foreground">Pending Approval ({pendingApproval.length})</h3>
                <span className="animate-pulse h-2 w-2 rounded-full bg-warning" />
              </div>
            </div>
            <p className="text-xs text-warning/80 mb-3">These applicants are waiting for your response. Please accept or decline.</p>
            <div className="space-y-3">
              {pendingApproval.map((b) => (
                <MiniBookingRow key={b._id} booking={b} onRefresh={onRefresh} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming sessions */}
        <section className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-accent" />
              <h3 className="font-semibold text-card-foreground">Upcoming Sessions</h3>
            </div>
          </div>

          {upcoming.length === 0 ? (
            <EmptyCard
              icon={CalendarDays}
              message="No upcoming sessions. New bookings will appear here."
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <MiniBookingRow key={b._id} booking={b} />
              ))}
            </div>
          )}
        </section>

        {/* Pending feedback */}
        <section className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <h3 className="font-semibold text-card-foreground">Awaiting Your Feedback</h3>
            </div>
          </div>

          {pendingFeedback.length === 0 ? (
            <EmptyCard
              icon={CheckCircle2}
              message="All caught up — no pending feedback."
              success
            />
          ) : (
            <div className="space-y-3">
              {pendingFeedback.map((b) => (
                <MiniBookingRow key={b._id} booking={b} showFeedbackBadge />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Bookings tab ──────────────────────────────────────────────────────────────

function BookingsTab({
  bookings,
  profile,
  onRefresh,
  onNavigate,
}: {
  bookings: LiveBooking[]
  profile: InterviewerProfile | null
  onRefresh: () => void
  onNavigate: (tab: InterviewerTab) => void
}) {
  // [VETTING QUARANTINED] forced true for testing — restore the line below on request
  // const isVerified = profile?.isVerified ?? false
  const isVerified = true

  if (!isVerified) {
    return (
      <div className="space-y-6">
        <div className="flex justify-start">
          <button
            onClick={() => onNavigate("overview")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 bg-secondary/20 rounded-lg px-2.5 py-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center space-y-4 max-w-xl mx-auto">
          <Sparkles className="mx-auto h-12 w-12 text-accent animate-pulse" />
          <h3 className="text-lg font-bold text-card-foreground">AI Certification Required</h3>
          <p className="text-sm text-muted-foreground">
            You must pass our automated AI Vetting chat before you can view your assigned bookings or join interview rooms.
          </p>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-6 py-5 rounded-xl font-semibold">
            <Link href="/live-interview/become-interviewer/vetting">Start AI Vetting</Link>
          </Button>
        </div>
      </div>
    )
  }

  const pendingApproval = bookings.filter((b) => b.status === "pending_approval")
  const active    = bookings.filter((b) => ["accepted", "payment_pending", "payment_completed", "meeting_scheduled", "meeting_started"].includes(b.status))
  const pending   = bookings.filter((b) =>
    ["meeting_completed", "evaluating_ai", "results_ready"].includes(b.status) && !b.humanFeedback
  )
  const other     = bookings.filter(
    (b) =>
      !["pending_approval", "accepted", "payment_pending", "payment_completed", "meeting_scheduled", "meeting_started"].includes(b.status) &&
      !(["meeting_completed", "evaluating_ai", "results_ready"].includes(b.status) && !b.humanFeedback)
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <button
          onClick={() => onNavigate("overview")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 bg-secondary/20 rounded-lg px-2.5 py-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="space-y-8">
        {pendingApproval.length > 0 && (
          <SectionGroup title="Pending Approval" count={pendingApproval.length} color="text-warning">
            <InterviewerBookingsList bookings={pendingApproval} onRefresh={onRefresh} />
          </SectionGroup>
        )}

        {active.length > 0 && (
          <SectionGroup title="Active / Upcoming" count={active.length} color="text-info">
            <InterviewerBookingsList bookings={active} onRefresh={onRefresh} />
          </SectionGroup>
        )}

        {pending.length > 0 && (
          <SectionGroup title="Awaiting Feedback" count={pending.length} color="text-warning">
            <InterviewerBookingsList bookings={pending} onRefresh={onRefresh} />
          </SectionGroup>
        )}

        {other.length > 0 && (
          <SectionGroup title="Other Bookings" count={other.length} color="text-muted-foreground">
            <InterviewerBookingsList bookings={other} onRefresh={onRefresh} />
          </SectionGroup>
        )}

        {bookings.length === 0 && (
          <InterviewerBookingsList
            bookings={[]}
            onRefresh={onRefresh}
            emptyMessage="No bookings yet. They'll show up here once applicants send you requests."
          />
        )}
      </div>
    </div>
  )
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab({
  profile,
  onNavigate,
  onRefresh,
}: {
  profile: InterviewerProfile | null
  onNavigate: (tab: InterviewerTab) => void
  onRefresh: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <button
          onClick={() => onNavigate("overview")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 bg-secondary/20 rounded-lg px-2.5 py-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </button>
      </div>
      <InterviewerProfileForm
        initialProfile={profile}
        onSaved={() => {
          toast.success("Profile saved")
          onRefresh()          // refresh profile/bookings so the overview reflects the new profile
          onNavigate("overview")  // send the interviewer back to their dashboard
        }}
      />
    </div>
  )
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab({ onNavigate }: { onNavigate: (tab: InterviewerTab) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <button
          onClick={() => onNavigate("overview")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 bg-secondary/20 rounded-lg px-2.5 py-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </button>
      </div>
      <InterviewerSettings />
    </div>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({
  bookings,
  profile,
  onRefresh,
  onNavigate,
}: {
  bookings: LiveBooking[]
  profile: InterviewerProfile | null
  onRefresh: () => void
  onNavigate: (tab: InterviewerTab) => void
}) {
  // [VETTING QUARANTINED] forced true for testing — restore the line below on request
  // const isVerified = profile?.isVerified ?? false
  const isVerified = true

  if (!isVerified) {
    return (
      <div className="space-y-6">
        <div className="flex justify-start">
          <button
            onClick={() => onNavigate("overview")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 bg-secondary/20 rounded-lg px-2.5 py-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center space-y-4 max-w-xl mx-auto">
          <Sparkles className="mx-auto h-12 w-12 text-accent animate-pulse" />
          <h3 className="text-lg font-bold text-card-foreground">AI Certification Required</h3>
          <p className="text-sm text-muted-foreground">
            You must pass our automated AI Vetting chat before you can view your interview history.
          </p>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-6 py-5 rounded-xl font-semibold">
            <Link href="/live-interview/become-interviewer/vetting">Start AI Vetting</Link>
          </Button>
        </div>
      </div>
    )
  }

  const done = bookings.filter((b) =>
    ["meeting_completed", "evaluating_ai", "results_ready", "failed_no_show", "refunded", "rejected"].includes(b.status)
  )
  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <button
          onClick={() => onNavigate("overview")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 bg-secondary/20 rounded-lg px-2.5 py-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </button>
      </div>
      <InterviewerBookingsList
        bookings={done}
        onRefresh={onRefresh}
        emptyMessage="No completed sessions yet."
      />
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionGroup({
  title,
  count,
  color,
  children,
}: {
  title: string
  count: number
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className={`text-sm font-semibold ${color}`}>{title}</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

function MiniBookingRow({
  booking,
  showFeedbackBadge,
  onRefresh,
}: {
  booking: LiveBooking
  showFeedbackBadge?: boolean
  onRefresh?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [busy, setBusy] = useState(false)
  const when = new Date(booking.scheduledTime)
  const isPending = booking.status === "pending_approval"

  const now = new Date()
  const scheduledMs = new Date(booking.scheduledTime).getTime()
  const durationMs = (booking.durationMinutes || 30) * 60 * 1000            // default 30 min duration
  const withinWindow = now.getTime() >= scheduledMs - 15 * 60 * 1000          // opens 15 min before
  const notExpired = now.getTime() <= scheduledMs + durationMs             // closes when duration ends
  const showJoin =
    booking.status === "meeting_started" ||
    (booking.status === "meeting_scheduled" && withinWindow && notExpired)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-4 py-3 gap-3 transition-all hover:bg-secondary/30 min-h-[66px]"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-card-foreground truncate">{booking.role}</p>
        <p className="text-xs text-muted-foreground">
          {when.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ·{" "}
          {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
          {booking.domain}
        </p>
      </div>
      {isPending && hovered ? (
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await liveInterviewApi.respondToBooking(booking._id, "accept")
                toast.success("Booking request accepted")
                onRefresh?.()
              } catch (err: any) {
                toast.error(err?.message || "Failed to accept booking")
              } finally {
                setBusy(false)
              }
            }}
            className="h-8 bg-success hover:bg-success/90 text-success-foreground font-medium text-xs px-3 rounded-lg flex items-center gap-1"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Accept
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await liveInterviewApi.respondToBooking(booking._id, "reject")
                toast.success("Booking request declined")
                onRefresh?.()
              } catch (err: any) {
                toast.error(err?.message || "Failed to decline booking")
              } finally {
                setBusy(false)
              }
            }}
            className="h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium text-xs px-3 rounded-lg flex items-center gap-1"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Decline
          </Button>
        </div>
      ) : showJoin ? (
        <Link
          href={`/live-interview/room/${booking.meetingRoomId}`}
          className="shrink-0 h-8 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Video className="h-3.5 w-3.5" />
          {booking.status === "meeting_started" ? "Rejoin" : "Join Meeting"}
        </Link>
      ) : showFeedbackBadge ? (
        <span className="shrink-0 rounded-full bg-warning/15 border border-warning/30 px-2.5 py-0.5 text-xs font-medium text-warning">
          Pending
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-info/15 border border-info/30 px-2.5 py-0.5 text-xs font-medium text-info capitalize">
          {booking.status.replace(/_/g, " ")}
        </span>
      )}
    </div>
  )
}

function EmptyCard({
  icon: Icon,
  message,
  success,
}: {
  icon: React.ComponentType<{ className?: string }>
  message: string
  success?: boolean
}) {
  return (
    <div className={`rounded-xl p-6 text-center ${success ? "bg-success/5 border border-success/10" : "bg-secondary/20 border border-border/30"}`}>
      <Icon className={`mx-auto h-8 w-8 ${success ? "text-success/40" : "text-muted-foreground/30"}`} />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
