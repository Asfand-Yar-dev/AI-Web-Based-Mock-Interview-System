"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Check, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const FREE_INCLUDES = [
  "10 AI interview sessions per month",
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
    <section id="pricing" className="relative py-24">
      {/* Soft background accent */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-[140px]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
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
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start free. Go Premium when you're ready.
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            One plan to practice on your own with AI. One to also book real, vetted interviewers and get a combined report.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="flex flex-col rounded-2xl border border-border/70 bg-card p-8"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Free</h3>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display text-5xl font-bold tracking-tight text-card-foreground">Rs 0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Practice on your own with AI. Free forever, no card required.
            </p>

            <div className="my-7 h-px bg-border" />

            <ul className="space-y-3.5 flex-1">
              {FREE_INCLUDES.map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-card-foreground/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/70">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
              {FREE_LOCKED.map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-muted-foreground/55">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-3 w-3" />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Link href="/signup" className="mt-8 block">
              <Button
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              >
                Get started
              </Button>
            </Link>
            {/* Invisible spacer to align this button with Premium's (which has a footnote below it) */}
            <p aria-hidden className="mt-3 text-center text-xs text-muted-foreground invisible">
              Sign up free first — upgrade anytime from your dashboard.
            </p>
          </motion.div>

          {/* Premium — highlighted plan */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="relative flex flex-col rounded-2xl border border-accent/60 bg-gradient-to-b from-accent/[0.06] to-card p-8 shadow-[0_20px_50px_-24px_var(--glow)] ring-1 ring-accent/15"
          >
            {/* Most-popular marker */}
            <div className="absolute -top-3 left-8">
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground shadow-sm">
                Most popular
              </span>
            </div>

            <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Premium</h3>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display text-5xl font-bold tracking-tight text-foreground">Rs 2,500</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Everything in Free, plus real human interviewers. Billed monthly, cancel anytime.
            </p>

            <div className="my-7 h-px bg-accent/20" />

            <ul className="space-y-3.5 flex-1">
              {PREMIUM_INCLUDES.map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-foreground/90">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Link href="/signup" className="mt-8 block">
              <Button
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              >
                Upgrade to Premium
              </Button>
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">
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
