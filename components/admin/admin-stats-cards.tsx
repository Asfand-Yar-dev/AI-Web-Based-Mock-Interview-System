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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.07 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-card-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground truncate">{stat.description}</p>
            </div>
            <div className="rounded-xl p-3 bg-accent/10 shrink-0">
              <stat.icon className="h-5 w-5 text-accent" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
