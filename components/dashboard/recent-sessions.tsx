"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Calendar, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InterviewSession } from "@/lib/mock-api"

interface RecentSessionsProps {
  sessions: InterviewSession[]
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-2xl border border-border/50 bg-card"
    >
      <div className="flex items-center justify-between border-b border-border/50 p-6">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Recent Sessions</h2>
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            className="flex items-center justify-between p-6 transition-colors hover:bg-secondary/30"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-card-foreground">{session.jobTitle}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{session.skills.slice(0, 2).join(", ")}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-card-foreground">{session.score}%</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
          </motion.div>
        ))}

        {sessions.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No interviews yet. Start your first practice session!</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
