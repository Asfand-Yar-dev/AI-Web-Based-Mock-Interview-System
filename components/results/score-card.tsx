"use client"

import { motion } from "framer-motion"

interface ScoreCardProps {
  label: string
  score: number
  color: string
  delay?: number
}

export function ScoreCard({ label, score, color, delay = 0 }: ScoreCardProps) {
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col items-center"
    >
      <div className="relative h-24 w-24 mb-4">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-2xl font-bold text-card-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.5 }}
          >
            {score}%
          </motion.span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center">{label}</p>
    </motion.div>
  )
}
