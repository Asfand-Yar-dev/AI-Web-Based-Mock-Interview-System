"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Play, BookOpen, BarChart3, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-border/50 bg-card p-6"
    >
      <h2 className="text-lg font-semibold text-card-foreground mb-4">Quick Actions</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/interview/setup">
          <Button className="w-full h-auto p-4 flex flex-col items-start gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              <span className="font-semibold">Start Interview</span>
            </div>
          </Button>
        </Link>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-start gap-2 bg-transparent border-border/50 hover:bg-secondary"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-card-foreground">Study Tips</span>
          </div>
        </Button>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-start gap-2 bg-transparent border-border/50 hover:bg-secondary"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-card-foreground">View Analytics</span>
          </div>
        </Button>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-start gap-2 bg-transparent border-border/50 hover:bg-secondary"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-card-foreground">Daily Tip</span>
          </div>
        </Button>
      </div>
    </motion.div>
  )
}
