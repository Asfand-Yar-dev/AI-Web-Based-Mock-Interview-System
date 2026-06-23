"use client"

import Link from "next/link"
import { ArrowRight, Play, Star, TrendingUp, Target } from "lucide-react"
import { motion } from "framer-motion"

const EQ_HEIGHTS = [40, 75, 55, 95, 50, 80, 35, 70, 45, 85, 60]
const ROLES = [
  "Software Engineer",
  "Product Manager",
  "Data Scientist",
  "UX Designer",
  "Consultant",
  "Sales",
  "Finance",
  "Marketing",
  "DevOps Engineer",
  "Business Analyst",
  "Project Manager",
  "Cybersecurity",
  "Cloud Architect",
  "Mobile Developer",
]

export function HeroSection() {
  return (
    <section className="relative pb-24">
      {/* Hero copy */}
      <div className="relative mx-auto max-w-[1080px] px-7 pt-20 text-center">

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mx-auto mb-5 max-w-[860px] font-display text-5xl font-bold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl lg:text-[66px]"
        >
          Walk into any interview <span className="text-accent">already ready.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mx-auto mb-8 max-w-[600px] text-lg leading-relaxed text-muted-foreground text-pretty"
        >
          Intervexa runs realistic mock interviews, then breaks down your voice, body language, and
          answers in real time — so nothing catches you off guard.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mb-9 flex flex-wrap justify-center gap-3.5"
        >
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2.5 rounded-[13px] bg-accent px-6 py-3.5 text-[15px] font-semibold text-accent-foreground shadow-[0_12px_30px_-10px_var(--glow)] transition-transform hover:-translate-y-0.5"
          >
            Start free practice
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2.5 rounded-[13px] border border-border bg-card px-5 py-3.5 text-[15px] font-medium text-foreground transition-colors hover:border-accent/40"
          >
            <Play className="h-4 w-4 fill-current" />
            Watch demo
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.26 }}
          className="flex flex-wrap items-center justify-center gap-3.5"
        >
          <div className="flex items-center">
            {["AR", "JM", "SK", "+"].map((initials, i) => (
              <span
                key={initials}
                style={{ marginLeft: i === 0 ? 0 : -9 }}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-accent/15 text-[11px] font-semibold text-accent"
              >
                {initials}
              </span>
            ))}
          </div>
          <div className="text-left">
            <div className="flex gap-0.5 text-accent">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <div className="mt-0.5 text-[12.5px] text-faint">
              <span className="font-semibold text-foreground">4.8/5</span> · rated by 2,000+ candidates
            </div>
          </div>
        </motion.div>
      </div>

      {/* Product console */}
      <div className="relative mx-auto mt-14 max-w-[1160px] px-7">
        <div className="pointer-events-none absolute left-1/2 top-[-24px] h-[380px] w-[760px] max-w-full -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,var(--glow),transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="animate-float relative overflow-hidden rounded-[22px] border border-border bg-gradient-to-br from-card to-popover shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]"
        >
          {/* Console title bar */}
          <div className="flex items-center gap-3 border-b border-border px-[18px] py-3.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
            </div>
            <span className="font-mono text-xs text-faint">Intervexa · Live session</span>
            <span className="ml-auto flex items-center gap-2 font-mono text-xs text-destructive">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]" />
              REC 06:42
            </span>
          </div>

          {/* Console body */}
          <div className="grid gap-4 p-[18px] md:grid-cols-[1.55fr_1fr]">
            {/* Camera tile */}
            <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[14px] border border-border bg-[radial-gradient(circle_at_50%_38%,color-mix(in_oklab,var(--accent)_12%,var(--popover)),var(--background))]">
              <span className="absolute left-3 top-3 rounded-[9px] border border-border bg-background/55 px-2.5 py-1 text-xs backdrop-blur-sm">
                You
              </span>
              <div className="relative flex h-26 w-26 items-center justify-center rounded-full border border-border bg-card">
                <div className="animate-pulse-ring absolute -inset-2.5 rounded-full border-2 border-accent opacity-40" />
                <span className="font-display text-3xl font-bold text-accent">AR</span>
              </div>
              <div className="absolute inset-x-3.5 bottom-3.5 flex h-[26px] items-end gap-[3px]">
                {EQ_HEIGHTS.map((h, i) => (
                  <span
                    key={i}
                    className="animate-eq-bar flex-1 rounded-[2px] bg-accent"
                    style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Side panel */}
            <div className="flex min-w-0 flex-col gap-3">
              <div className="rounded-[13px] border border-border bg-background/60 px-[15px] py-3.5">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.07em] text-accent">
                  Question 3 of 5
                </div>
                <p className="text-[13.5px] leading-relaxed">
                  &ldquo;Tell me about a challenging project and how you overcame the obstacles.&rdquo;
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3.5 rounded-[13px] border border-border bg-background/60 px-[15px] py-3.5">
                {[
                  { label: "Eye contact", value: "88%", w: 88 },
                  { label: "Confidence", value: "81%", w: 81 },
                  { label: "Pace", value: "Good", w: 72 },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-mono text-accent">{m.value}</span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${m.w}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="animate-float absolute left-1.5 top-[30%] hidden items-center gap-3 rounded-[15px] border border-border bg-card px-3.5 py-3 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] sm:flex"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            <TrendingUp className="h-[17px] w-[17px]" />
          </div>
          <div>
            <div className="font-display text-[19px] font-bold leading-none">+14%</div>
            <div className="text-[11px] text-faint">Confidence growth</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="animate-float absolute bottom-[18%] right-1.5 hidden items-center gap-3 rounded-[15px] border border-border bg-card px-3.5 py-3 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] sm:flex"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            <Target className="h-[17px] w-[17px]" />
          </div>
          <div>
            <div className="font-display text-[19px] font-bold leading-none">92%</div>
            <div className="text-[11px] text-faint">Session score</div>
          </div>
        </motion.div>
      </div>

      {/* Roles strip — infinite horizontal marquee */}
      <div className="mt-16 text-center">
        <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.1em] text-faint">
          Practice for 40+ roles
        </div>
        <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          {/* Track: two identical copies so the -50% shift loops seamlessly */}
          <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 gap-2.5 pr-2.5" aria-hidden={copy === 1}>
                {ROLES.map((role) => (
                  <li
                    key={role}
                    className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-[13.5px] text-muted-foreground"
                  >
                    {role}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
