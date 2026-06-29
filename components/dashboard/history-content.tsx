"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Calendar, CheckCircle, Search, Loader2, AlertCircle, RefreshCw, Clock, Users, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import Link from "next/link"
import { interviewApi, liveApi, type InterviewSession } from "@/lib/api"

interface DisplaySession {
  id: string
  sessionType: string
  jobTitle: string
  interviewKind: "ai" | "live"
  status: string
  score?: number
  date: string
}

function mapSessionToDisplay(session: InterviewSession): DisplaySession {
  return {
    id: session._id,
    sessionType: session.session_type || "mixed",
    jobTitle: session.jobTitle || "",
    interviewKind: "ai",
    status: session.status,
    score: session.overall_score,
    date: session.createdAt,
  }
}

const LIVE_COMPLETED_STATUS = "results_ready"
const LIVE_ONGOING_STATUSES = ["meeting_started", "meeting_scheduled", "evaluating_ai", "meeting_completed"]
const LIVE_CANCELLED_STATUSES = ["rejected", "failed_no_show", "refunded"]

function mapLiveStatus(status: string): string {
  if (status === LIVE_COMPLETED_STATUS) return "completed"
  if (LIVE_ONGOING_STATUSES.includes(status)) return "ongoing"
  if (LIVE_CANCELLED_STATUSES.includes(status)) return "cancelled"
  return "pending"
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-success" />
    case "ongoing":
      return <Clock className="h-5 w-5 text-warning" />
    case "cancelled":
      return <XCircle className="h-5 w-5 text-destructive" />
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Completed"
    case "ongoing":
      return "In Progress"
    case "cancelled":
      return "Cancelled"
    case "pending":
      return "Pending"
    default:
      return status
  }
}

function getScoreColor(score: number) {
  if (score >= 66) return { stroke: "var(--success)", text: "text-success" }
  if (score >= 41) return { stroke: "var(--warning)", text: "text-warning" }
  return { stroke: "var(--destructive)", text: "text-destructive" }
}

function ScoreRing({ score }: { score: number }) {
  const size = 54
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const { stroke, text } = getScoreColor(score)

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ overflow: "visible" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          style={{ stroke }}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
        />
      </svg>
      <span className={`absolute text-[11px] font-bold tabular-nums leading-none ${text}`}>
        {score}%
      </span>
    </div>
  )
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success border-success/20"
    case "ongoing":
      return "bg-warning/10 text-warning border-warning/20"
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20"
    default:
      return "bg-muted text-muted-foreground border-border/50"
  }
}

const ITEMS_PER_PAGE = 8

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages]
  }
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }
  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages]
}

export function HistoryContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sessions, setSessions] = useState<DisplaySession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    if (!silent) setError(null)

    try {
      const [aiRes, liveRes] = await Promise.allSettled([
        interviewApi.getMySessions({ limit: 100 }),
        liveApi.getMyBookings(),
      ])

      const aiSessions: DisplaySession[] =
        aiRes.status === "fulfilled" && aiRes.value.success
          ? aiRes.value.data.sessions.map(mapSessionToDisplay)
          : []

      const liveSessions: DisplaySession[] =
        liveRes.status === "fulfilled" && liveRes.value.success
          ? (liveRes.value.data || []).map((b) => ({
              id: b._id,
              sessionType: "live_interview",
              jobTitle: b.role || "",
              interviewKind: "live" as const,
              status: mapLiveStatus(b.status),
              score: b.combinedScore ?? b.aiReport?.overall_score ?? b.humanScore,
              date: b.createdAt,
            }))
          : []

      const merged = [...aiSessions, ...liveSessions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      setSessions(merged)
    } catch (err) {
      console.error("Failed to load history:", err)
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load interview history")
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Silently refetch when user switches back to this tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadHistory(true)
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [loadHistory])

  // Silent poll every 30 s while the tab is active
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadHistory(true)
    }, 30000)
    return () => clearInterval(id)
  }, [loadHistory])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const filteredHistory = sessions.filter((session) => {
    const q = searchQuery.toLowerCase()
    const kindLabel = session.interviewKind === "live" ? "live ai human" : "ai interview"
    return (
      session.jobTitle.toLowerCase().includes(q) ||
      session.sessionType.toLowerCase().includes(q) ||
      session.status.toLowerCase().includes(q) ||
      kindLabel.includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages)

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          <p className="text-muted-foreground">Loading your interview history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Failed to Load History</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={loadHistory} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl font-bold text-foreground">Interview history</h1>
        <p className="text-muted-foreground mt-1">Review your past practice sessions and track your progress</p>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by session type or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-secondary/50 border-border/50"
          />
        </div>
        <Button variant="outline" className="bg-transparent border-border/50" onClick={loadHistory}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </motion.div>

      {/* History List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-[17px] border border-border bg-card overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`page-${safeCurrentPage}-${searchQuery}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="divide-y divide-border/50"
          >
            {paginatedHistory.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="flex items-center justify-between p-5 sm:p-6 transition-colors hover:bg-secondary/30 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 group-hover:bg-accent/15 transition-colors">
                    {getStatusIcon(session.status)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-card-foreground truncate">
                        {session.jobTitle || `${session.sessionType.replace(/_/g, " ")} Interview`}
                      </p>
                      {session.interviewKind === "live" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                          <Users className="h-3 w-3" />
                          Live · AI + Human
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0">
                          <Bot className="h-3 w-3" />
                          AI Interview
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 flex-wrap">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{new Date(session.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                      {session.sessionType !== "live_interview" && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{session.sessionType.replace(/_/g, " ")}</span>
                        </>
                      )}
                      <span className="hidden sm:inline">•</span>
                      <span
                        className={`hidden sm:inline px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(session.status)}`}
                      >
                        {getStatusLabel(session.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-5 shrink-0 ml-4">
                  {session.score !== undefined && session.score > 0 && (
                    <div className="hidden sm:flex flex-col items-center gap-1">
                      <ScoreRing score={session.score} />
                      <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Score</span>
                    </div>
                  )}
                  {session.status === "completed" ? (
                    <Link href={
                      session.interviewKind === "live"
                        ? `/live-interview/results/${session.id}`
                        : `/interview/results/${session.id}`
                    }>
                      <Button variant="outline" size="sm" className="bg-transparent border-border/50 hover:border-accent/50 hover:text-accent transition-colors">
                        View Details
                      </Button>
                    </Link>
                  ) : session.status === "ongoing" && session.interviewKind !== "live" ? (
                    <Link href={`/interview/session/${session.id}`}>
                      <Button variant="default" size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                        Continue
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </motion.div>
            ))}

            {filteredHistory.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">
                  {sessions.length === 0
                    ? "No interview sessions yet. Start your first practice session!"
                    : "No sessions found matching your search."}
                </p>
                {sessions.length === 0 && (
                  <Link href="/interview/setup">
                    <Button className="mt-4 bg-accent text-accent-foreground">
                      Start First Interview
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex justify-center pt-2"
        >
          <Pagination>
            <PaginationContent className="gap-1">
              {/* Previous */}
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-disabled={safeCurrentPage === 1}
                  className={
                    safeCurrentPage === 1
                      ? "pointer-events-none opacity-40"
                      : "cursor-pointer hover:bg-accent/10 hover:text-accent transition-colors"
                  }
                />
              </PaginationItem>

              {/* Page numbers */}
              {pageNumbers.map((page, i) =>
                page === "ellipsis-start" || page === "ellipsis-end" ? (
                  <PaginationItem key={`${page}-${i}`}>
                    <PaginationEllipsis className="text-muted-foreground" />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page as number)}
                      isActive={safeCurrentPage === page}
                      className={
                        safeCurrentPage === page
                          ? "cursor-default bg-accent text-accent-foreground border-accent font-semibold"
                          : "cursor-pointer hover:bg-accent/10 hover:text-accent transition-colors"
                      }
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              {/* Next */}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-disabled={safeCurrentPage === totalPages}
                  className={
                    safeCurrentPage === totalPages
                      ? "pointer-events-none opacity-40"
                      : "cursor-pointer hover:bg-accent/10 hover:text-accent transition-colors"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </motion.div>
      )}
    </div>
  )
}
