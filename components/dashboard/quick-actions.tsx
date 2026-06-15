"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Play, BookOpen, BarChart3, Lightbulb, Sparkles, Users, CalendarDays, Lock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePlan } from "@/hooks/use-plan"

export function QuickActions() {
  const { isPro, isFree } = usePlan()
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="space-y-4"
    >
      {/* ── Upgrade CTA (free users only) ── */}
      {isFree && (
        <Link href="/upgrade" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-transparent p-5 transition-all hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-yellow-500/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 px-2.5 py-0.5 text-xs font-semibold text-yellow-400">
                      <Zap className="h-3 w-3" />
                      Free Plan
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Upgrade to Premium</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Unlimited sessions, all difficulties, live interviews & more.
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 group-hover:bg-yellow-500/25 transition-colors">
                  <Zap className="h-5 w-5 text-yellow-400" />
                </div>
              </div>
              <div className="mt-3 text-xs font-medium text-yellow-400 group-hover:underline">
                View plans →
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ── Premium Live Interview CTA ── */}
      {isPro ? (
        <Link href="/live-interview/book" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/20 via-accent/10 to-transparent p-5 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 border border-accent/30 px-2.5 py-0.5 text-xs font-semibold text-accent">
                      <Sparkles className="h-3 w-3" />
                      Premium
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Book a Live Interview</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Practice with a real vetted human interviewer + 360° AI report.
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 group-hover:bg-accent/25 transition-colors">
                  <Users className="h-5 w-5 text-accent" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />Auto-matched</span>
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />AI + Human score</span>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <button onClick={() => router.push('/upgrade')} className="block w-full group text-left">
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-5 opacity-70 transition-all hover:opacity-90 cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-border/40 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Premium Only
                  </span>
                </div>
                <h3 className="font-semibold text-muted-foreground text-sm">Book a Live Interview</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Upgrade to Premium to access live human interviewers.</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-border/20">
                <Lock className="h-5 w-5 text-muted-foreground/50" />
              </div>
            </div>
          </div>
        </button>
      )}

      {/* ── Standard quick actions ── */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/interview/setup">
            <Button className="w-full h-auto p-4 flex flex-col items-start gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                <span className="font-semibold">Start AI Interview</span>
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
      </div>
    </motion.div>
  )
}
