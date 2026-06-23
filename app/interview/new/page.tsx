"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Bot, Users, Sparkles, Lock, ArrowRight, Zap,
  Clock, Gauge, ShieldCheck, BadgeCheck, CalendarDays,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { useRequireAuth } from "@/contexts/auth-context"
import { usePlan } from "@/hooks/use-plan"

export default function NewInterviewPage() {
  useRequireAuth()
  const { isPro } = usePlan()
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground">Start a new interview</h1>
          <p className="text-muted-foreground mt-1">
            Choose how you want to practice — with our AI, or with a real human interviewer.
          </p>
        </motion.div>

        {/* Two-card chooser */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── AI Interview (always available) ───────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Link
              href="/interview/setup"
              className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-border bg-card p-7 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5"
            >
              {/* Decorative shape */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl transition-opacity group-hover:opacity-80" />

              <div className="relative flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
                  <Bot className="h-6 w-6 text-accent" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  Instant
                </span>
              </div>

              <div className="relative mt-5 space-y-1.5">
                <h2 className="font-display text-xl font-semibold text-card-foreground">AI Interview</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Practice with our AI interviewer. Pick your role, difficulty, and skills — start in under a minute.
                </p>
              </div>

              <ul className="relative mt-6 space-y-2.5 text-sm">
                {[
                  { Icon: Clock, text: "Available right now, on your schedule" },
                  { Icon: Gauge, text: "Detailed score breakdown per question" },
                  { Icon: BadgeCheck, text: "Voice, content & body-language analysis" },
                ].map(({ Icon, text }) => (
                  <li key={text} className="flex gap-2.5 text-muted-foreground">
                    <Icon className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <div className="relative mt-7 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {isPro ? "Included with Premium" : "Free • up to 10 / month"}
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent group-hover:gap-3 transition-all">
                  Start AI Interview
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </motion.div>

          {/* ── AI + Human Interview (Premium) ────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {isPro ? (
              <Link
                href="/live-interview/book"
                className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-7 transition-all hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10"
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent/20 blur-3xl transition-opacity group-hover:opacity-90" />

                <div className="relative flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                    <Sparkles className="h-3 w-3" />
                    Premium
                  </span>
                </div>

                <div className="relative mt-5 space-y-1.5">
                  <h2 className="font-display text-xl font-semibold text-foreground">AI + Human Interview</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Book a live session with a vetted human interviewer. Get a 360° report that combines AI metrics with human judgment.
                  </p>
                </div>

                <ul className="relative mt-6 space-y-2.5 text-sm">
                  {[
                    { Icon: Users, text: "Real interviewer, live over WebRTC" },
                    { Icon: ShieldCheck, text: "AI + human combined score report" },
                    { Icon: CalendarDays, text: "Pick the domain, role, and time slot" },
                  ].map(({ Icon, text }) => (
                    <li key={text} className="flex gap-2.5 text-foreground/85">
                      <Icon className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative mt-7 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Included with Premium</span>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent group-hover:gap-3 transition-all">
                    Book a Live Session
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/upgrade?next=/live-interview/book")}
                className="group relative flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-border bg-card/60 p-7 text-left transition-all hover:border-accent/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Subtle locked accent glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent/8 blur-3xl" />

                <div className="relative flex items-start justify-between">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
                    <Users className="h-6 w-6 text-muted-foreground/70" />
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-accent shadow-md">
                      <Lock className="h-2.5 w-2.5 text-accent-foreground" />
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                    <Sparkles className="h-3 w-3" />
                    Premium
                  </span>
                </div>

                <div className="relative mt-5 space-y-1.5">
                  <h2 className="font-display text-xl font-semibold text-foreground">AI + Human Interview</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Practice with a real, vetted interviewer over a live video call — with a combined AI + human report at the end.
                  </p>
                </div>

                <ul className="relative mt-6 space-y-2.5 text-sm">
                  {[
                    { Icon: Users, text: "Real interviewer, live over WebRTC" },
                    { Icon: ShieldCheck, text: "AI + human combined score report" },
                    { Icon: CalendarDays, text: "Pick the domain, role, and time slot" },
                  ].map(({ Icon, text }) => (
                    <li key={text} className="flex gap-2.5 text-muted-foreground/75">
                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground/40 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative mt-7 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                    <Lock className="h-3 w-3" />
                    Premium plan required
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground group-hover:gap-3 transition-all">
                    Upgrade to Premium
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            )}
          </motion.div>
        </div>

        {/* Small comparison footer link */}
        {!isPro && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-xs text-muted-foreground"
          >
            Not sure which to pick?{" "}
            <Link href="/upgrade" className="font-medium text-accent hover:underline">
              Compare plans →
            </Link>
          </motion.p>
        )}
      </div>
    </DashboardLayout>
  )
}
