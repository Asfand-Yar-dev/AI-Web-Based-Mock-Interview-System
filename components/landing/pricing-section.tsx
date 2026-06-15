"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Check, Lock, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

const FREE_INCLUDES = [
  "3 AI interview sessions per month",
  "Easy & Medium difficulty",
  "Voice, content & body-language analysis",
  "Score breakdown per question",
  "Question bank access",
]

const FREE_LOCKED = [
  "Live human interviewer sessions",
  "Hard difficulty",
]

const PREMIUM_INCLUDES = [
  "Unlimited AI interview sessions",
  "All difficulty levels (incl. Hard)",
  "Live human interviewer bookings",
  "Combined AI + Human score report",
  "Priority AI processing",
  "Advanced analytics & insights",
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative scroll-mt-20 py-24">
      {/* Soft background accent */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent/10 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <Sparkles className="h-3 w-3" />
            Pricing
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start free. Go Premium when you're ready.
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            One plan to practice on your own with AI. One to also book real, vetted interviewers and get a combined report.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="relative flex flex-col rounded-2xl border border-border/60 bg-card p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-card-foreground">Free</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get a feel for AI-led practice.
                </p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-bold text-card-foreground">$0</span>
                <span className="ml-1 text-sm text-muted-foreground">/mo</span>
              </div>
            </div>

            <ul className="mt-7 space-y-3 flex-1">
              {FREE_INCLUDES.map((line) => (
                <li key={line} className="flex gap-3 text-sm text-card-foreground/85">
                  <Check className="h-4 w-4 mt-0.5 text-chart-2 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
              {FREE_LOCKED.map((line) => (
                <li key={line} className="flex gap-3 text-sm text-muted-foreground/60">
                  <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Link href="/signup" className="mt-8 block">
              <Button
                variant="outline"
                size="lg"
                className="w-full bg-transparent border-border/60 hover:bg-secondary"
              >
                Get started — it's free
              </Button>
            </Link>
          </motion.div>

          {/* Premium */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="relative flex flex-col overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-8 shadow-xl shadow-accent/5"
          >
            {/* Decorative shape */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />

            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">Premium</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  For when you're serious about landing the role.
                </p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-bold text-foreground">$9</span>
                <span className="ml-1 text-sm text-muted-foreground">/mo</span>
              </div>
            </div>

            <ul className="relative mt-7 space-y-3 flex-1">
              {PREMIUM_INCLUDES.map((line) => (
                <li key={line} className="flex gap-3 text-sm text-foreground/90">
                  <Check className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Link href="/signup" className="relative mt-8 block">
              <Button
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              >
                <Zap className="h-4 w-4 mr-2" />
                Start with Premium
              </Button>
            </Link>
            <p className="relative mt-3 text-center text-xs text-muted-foreground">
              Sign up free first — upgrade anytime from your dashboard.
            </p>
          </motion.div>
        </div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 text-center text-xs text-muted-foreground"
        >
          No card required to start. Cancel anytime.
        </motion.p>
      </div>
    </section>
  )
}
