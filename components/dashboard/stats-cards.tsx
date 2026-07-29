"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Flame, Clock, Target } from "lucide-react"

interface StatsCardsProps {
  totalInterviews: number
  averageScore: number
  confidenceImprovement: number
  currentStreak: number
}

export function StatsCards({ totalInterviews, averageScore, confidenceImprovement, currentStreak }: StatsCardsProps) {
  const stats = [
    {
      label: "Total interviews",
      value: totalInterviews.toString(),
      icon: Clock,
      description: "Practice sessions completed",
      tint: "bg-accent/10 text-accent",
      valueClass: "text-card-foreground",
      href: "/dashboard/analytics#breakdown",
    },
    {
      label: "Average score",
      value: `${averageScore}%`,
      icon: Target,
      description: "Across all sessions",
      tint: "bg-accent/10 text-accent",
      valueClass: "text-card-foreground",
      href: "/dashboard/analytics#performance",
    },
    {
      // Colour follows the actual value: positive growth is green, a drop is
      // red, and no change stays neutral — instead of always showing green.
      label: "Confidence growth",
      value: `${confidenceImprovement > 0 ? "+" : ""}${confidenceImprovement}%`,
      icon: confidenceImprovement < 0 ? TrendingDown : TrendingUp,
      description: "Since last month",
      tint:
        confidenceImprovement > 0
          ? "bg-success/15 text-success"
          : confidenceImprovement < 0
          ? "bg-destructive/15 text-destructive"
          : "bg-accent/10 text-accent",
      valueClass:
        confidenceImprovement > 0
          ? "text-success"
          : confidenceImprovement < 0
          ? "text-destructive"
          : "text-card-foreground",
      href: "/dashboard/analytics#trend",
    },
    {
      label: "Current streak",
      value: currentStreak.toString(),
      unit: currentStreak === 1 ? "day" : "days",
      icon: Flame,
      description: currentStreak > 0 ? "Keep it up!" : "Practice today to start a streak",
      tint: "bg-warning/15 text-warning",
      valueClass: "text-card-foreground",
      href: "/dashboard/analytics#streak",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.08 }}
        >
          <Link
            href={stat.href}
            className="block h-full rounded-[17px] border border-border bg-card p-5 transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between">
              <span className="text-[13px] text-muted-foreground">{stat.label}</span>
              <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] ${stat.tint}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className={`mt-3.5 mb-1 font-display text-[32px] font-bold leading-none ${stat.valueClass}`}>
              {stat.value}
              {stat.unit && <span className="ml-1.5 text-lg font-semibold text-faint">{stat.unit}</span>}
            </div>
            <div className="text-xs text-faint">{stat.description}</div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
