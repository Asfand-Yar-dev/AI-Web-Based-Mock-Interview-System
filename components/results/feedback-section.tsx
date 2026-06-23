"use client"

import { motion } from "framer-motion"
import { CheckCircle, AlertTriangle, ArrowUp, FileText } from "lucide-react"

interface FeedbackSectionProps {
  strengths: string[]
  improvements: string[]
  detailedFeedback: string
}

export function FeedbackSection({ strengths, improvements, detailedFeedback }: FeedbackSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="rounded-[17px] border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-success/15 text-success">
              <CheckCircle className="h-[18px] w-[18px]" />
            </div>
            <h3 className="font-display text-base font-semibold text-card-foreground">Strengths</h3>
          </div>
          <ul className="space-y-3">
            {strengths.map((strength, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                {strength}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Areas for Improvement */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="rounded-[17px] border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-warning/15 text-warning">
              <ArrowUp className="h-[18px] w-[18px]" />
            </div>
            <h3 className="font-display text-base font-semibold text-card-foreground">Areas to improve</h3>
          </div>
          <ul className="space-y-3">
            {improvements.map((improvement, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                {improvement}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Detailed Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1 }}
        className="rounded-[17px] border border-border bg-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            <FileText className="h-[18px] w-[18px]" />
          </div>
          <h3 className="font-display text-base font-semibold text-card-foreground">Detailed analysis</h3>
        </div>
        <p className="text-[14.5px] leading-relaxed text-muted-foreground text-pretty">{detailedFeedback}</p>
      </motion.div>
    </div>
  )
}
