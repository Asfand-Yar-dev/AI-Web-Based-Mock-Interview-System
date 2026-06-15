"use client"

import { motion } from "framer-motion"
import { CalendarDays, CheckCircle2, Clock, Star } from "lucide-react"

interface InterviewerStatsCardsProps {
  totalBookings: number
  completedSessions: number
  pendingFeedback: number
  averageScore: number | null
}

export function InterviewerStatsCards({
  totalBookings,
  completedSessions,
  pendingFeedback,
  averageScore,
}: InterviewerStatsCardsProps) {
  const cards = [
    {
      label: "Total Bookings",
      value: totalBookings.toString(),
      description: "Assignments from the platform",
      icon: CalendarDays,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      label: "Completed Sessions",
      value: completedSessions.toString(),
      description: "Successfully finished interviews",
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Pending Feedback",
      value: pendingFeedback.toString(),
      description: "Awaiting your written review",
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Avg. Score Given",
      value: averageScore !== null ? `${averageScore}/100` : "—",
      description: "Your average human score",
      icon: Star,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.07 }}
          className="rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-card-foreground">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground truncate">{card.description}</p>
            </div>
            <div className={`rounded-xl p-3 shrink-0 ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
