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
      label: "Total bookings",
      value: totalBookings.toString(),
      description: "Assignments from the platform",
      icon: CalendarDays,
      tint: "bg-accent/10 text-accent",
      valueClass: "text-card-foreground",
    },
    {
      label: "Completed",
      value: completedSessions.toString(),
      description: "Successfully finished interviews",
      icon: CheckCircle2,
      tint: "bg-success/15 text-success",
      valueClass: "text-card-foreground",
    },
    {
      label: "Pending feedback",
      value: pendingFeedback.toString(),
      description: "Awaiting your written review",
      icon: Clock,
      tint: "bg-warning/15 text-warning",
      valueClass: "text-warning",
    },
    {
      label: "Avg. score given",
      value: averageScore !== null ? `${averageScore}%` : "—",
      description: "Your average human score",
      icon: Star,
      tint: "bg-accent/10 text-accent",
      valueClass: "text-card-foreground",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.07 }}
          className="rounded-[16px] border border-border bg-card p-5 transition-colors hover:border-accent/40"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="text-[13px] text-muted-foreground">{card.label}</span>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${card.tint}`}>
              <card.icon className="h-[15px] w-[15px]" />
            </div>
          </div>
          <div className={`mt-3 font-display text-[30px] font-bold leading-none ${card.valueClass}`}>{card.value}</div>
          <div className="mt-2 text-xs text-faint truncate">{card.description}</div>
        </motion.div>
      ))}
    </div>
  )
}
