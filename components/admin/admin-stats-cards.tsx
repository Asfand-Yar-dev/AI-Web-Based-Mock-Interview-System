"use client"

import { motion } from "framer-motion"
import { Users, MessageSquare, TrendingUp, UserCheck, FileText, UserPlus, Clock, XCircle } from "lucide-react"

interface AdminStatsCardsProps {
  totalUsers: number
  totalInterviews: number
  completionRate: number
  activeUsers: number
  totalAnswers?: number
  newUsersLast30Days?: number
  ongoingInterviews?: number
  cancelledInterviews?: number
}

const stats = (p: AdminStatsCardsProps) => [
  {
    label:       "Total Users",
    value:       p.totalUsers.toLocaleString(),
    description: `${p.newUsersLast30Days ?? 0} new this month`,
    icon:        Users,
  },
  {
    label:       "Total Interviews",
    value:       p.totalInterviews.toLocaleString(),
    description: `${p.ongoingInterviews ?? 0} ongoing now`,
    icon:        MessageSquare,
  },
  {
    label:       "Completion Rate",
    value:       `${p.completionRate}%`,
    description: `${p.cancelledInterviews ?? 0} cancelled`,
    icon:        TrendingUp,
  },
  {
    label:       "Active Users",
    value:       p.activeUsers.toLocaleString(),
    description: "Logged in last 7 days",
    icon:        UserCheck,
  },
  {
    label:       "Total Answers",
    value:       (p.totalAnswers ?? 0).toLocaleString(),
    description: "Across all sessions",
    icon:        FileText,
  },
]

export function AdminStatsCards({
  totalUsers,
  totalInterviews,
  completionRate,
  activeUsers,
  totalAnswers,
  newUsersLast30Days,
  ongoingInterviews,
  cancelledInterviews,
}: AdminStatsCardsProps) {
  const cards = stats({ totalUsers, totalInterviews, completionRate, activeUsers, totalAnswers, newUsersLast30Days, ongoingInterviews, cancelledInterviews })

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.07 }}
          className="rounded-[16px] border border-border bg-card p-5 transition-colors hover:border-accent/40"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="text-[13px] text-muted-foreground">{stat.label}</span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-accent/10 text-accent">
              <stat.icon className="h-[15px] w-[15px]" />
            </div>
          </div>
          <div className="mt-3 font-display text-[30px] font-bold leading-none text-card-foreground">{stat.value}</div>
          <div className="mt-2 text-xs text-faint truncate">{stat.description}</div>
        </motion.div>
      ))}
    </div>
  )
}
