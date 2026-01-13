"use client"

import { motion } from "framer-motion"
import { TrendingUp, Award, Clock, Target } from "lucide-react"

interface StatsCardsProps {
  totalInterviews: number
  averageScore: number
  confidenceImprovement: number
}

export function StatsCards({ totalInterviews, averageScore, confidenceImprovement }: StatsCardsProps) {
  const stats = [
    {
      label: "Total Interviews",
      value: totalInterviews.toString(),
      icon: Clock,
      description: "Practice sessions completed",
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      label: "Average Score",
      value: `${averageScore}%`,
      icon: Target,
      description: "Across all sessions",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      label: "Confidence Growth",
      value: `+${confidenceImprovement}%`,
      icon: TrendingUp,
      description: "Since last month",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Current Streak",
      value: "5 days",
      icon: Award,
      description: "Keep it up!",
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-bold text-card-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
            <div className={cn("rounded-xl p-3", stat.bgColor)}>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
