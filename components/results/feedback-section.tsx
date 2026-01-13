"use client"

import { motion } from "framer-motion"
import { CheckCircle, AlertTriangle, ArrowUp } from "lucide-react"

interface FeedbackSectionProps {
  strengths: string[]
  improvements: string[]
  detailedFeedback: string
}

export function FeedbackSection({ strengths, improvements, detailedFeedback }: FeedbackSectionProps) {
  return (
    <div className="space-y-6">
      {/* Strengths */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="rounded-2xl border border-border/50 bg-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-success/10 p-2">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground">Strengths</h3>
        </div>
        <ul className="space-y-3">
          {strengths.map((strength, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
              {strength}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Areas for Improvement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="rounded-2xl border border-border/50 bg-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-warning/10 p-2">
            <ArrowUp className="h-5 w-5 text-warning" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground">Areas for Improvement</h3>
        </div>
        <ul className="space-y-3">
          {improvements.map((improvement, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              {improvement}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Detailed Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1 }}
        className="rounded-2xl border border-border/50 bg-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-accent/10 p-2">
            <svg
              className="h-5 w-5 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-card-foreground">Detailed Analysis</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{detailedFeedback}</p>
      </motion.div>
    </div>
  )
}
