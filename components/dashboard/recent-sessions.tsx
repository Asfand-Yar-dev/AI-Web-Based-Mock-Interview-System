"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Calendar, CheckCircle, Clock, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DisplaySession {
  id: string
  userId: string
  jobTitle: string
  sessionType?: string
  skills: string[]
  status: "pending" | "in-progress" | "completed" | "ongoing" | "cancelled"
  score?: number
  createdAt: string
  completedAt?: string
}

interface RecentSessionsProps {
  sessions: DisplaySession[]
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-success" />
    case "in-progress":
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
    case "in-progress":
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

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success border-success/20"
    case "in-progress":
    case "ongoing":
      return "bg-warning/10 text-warning border-warning/20"
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20"
    default:
      return "bg-muted text-muted-foreground border-border"
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

export function RecentSessions({ sessions }: RecentSessionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-[17px] border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-card-foreground">Recent sessions</h2>
          <p className="text-sm text-muted-foreground">Your latest practice interviews</p>
        </div>
        <Link href="/dashboard/history">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            View all
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="divide-y divide-border/50">
        {sessions.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.5 + index * 0.07 }}
            className="flex items-center justify-between p-5 sm:p-6 transition-colors hover:bg-secondary/30 group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 group-hover:bg-accent/15 transition-colors">
                {getStatusIcon(session.status)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-card-foreground truncate">
                  {session.jobTitle || "Interview Session"}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 flex-wrap">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>
                    {new Date(session.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {session.sessionType && (
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
                <Link href={`/interview/results/${session.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-border/50 hover:border-accent/50 hover:text-accent transition-colors"
                  >
                    View Details
                  </Button>
                </Link>
              ) : session.status === "in-progress" || session.status === "ongoing" ? (
                <Link href={`/interview/session/${session.id}`}>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Continue
                  </Button>
                </Link>
              ) : null}
            </div>
          </motion.div>
        ))}

        {sessions.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No interviews yet. Start your first practice session!</p>
            <Link href="/interview/setup">
              <Button className="mt-4 bg-accent text-accent-foreground">
                Start First Interview
              </Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}
