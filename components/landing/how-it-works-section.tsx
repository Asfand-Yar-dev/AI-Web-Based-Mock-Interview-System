"use client"

import { motion } from "framer-motion"

const steps = [
  {
    n: "1",
    title: "Set your target role",
    body: "Pick a role, seniority, and focus skills. Intervexa builds a tailored question set.",
  },
  {
    n: "2",
    title: "Run a live mock",
    body: "Answer on camera. The AI listens, watches, and follows up like a real panel.",
  },
  {
    n: "3",
    title: "Get a coached report",
    body: "A full breakdown of voice, presence, and content — with the next thing to practice.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1160px] px-7 pt-28">
      <div className="mb-11 text-center">
        <div className="mb-3.5 font-mono text-xs uppercase tracking-[0.1em] text-accent">How it works</div>
        <h2 className="font-display text-4xl font-bold tracking-[-0.02em] text-balance">
          Three steps to interview-ready
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-0">
        {steps.map((step, i) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative px-5 text-center"
          >
            {/* Connector line (not on the last step) */}
            {i < steps.length - 1 && (
              <div className="absolute left-1/2 top-6 hidden h-0.5 w-full bg-gradient-to-r from-accent to-border md:block" />
            )}
            <div className="relative mx-auto mb-5 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-accent-foreground shadow-[0_0_0_6px_var(--accent-soft)]">
              {step.n}
            </div>
            <h3 className="mb-2 font-display text-lg font-semibold">{step.title}</h3>
            <p className="mx-auto max-w-[260px] text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
