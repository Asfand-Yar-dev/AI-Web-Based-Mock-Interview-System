"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export function CTASection() {
  return (
    <section className="mx-auto max-w-[1200px] px-7 pt-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-[26px] border border-border bg-gradient-to-br from-accent/[0.16] to-card px-10 py-16 text-center"
      >
        <div className="pointer-events-none absolute left-1/2 top-[-40%] h-[320px] w-[520px] -translate-x-1/2 bg-[radial-gradient(circle,var(--glow),transparent_70%)]" />
        <h2 className="relative mb-3.5 font-display text-4xl font-bold tracking-[-0.02em] text-balance">
          Your next interview starts here.
        </h2>
        <p className="relative mb-7 text-[17px] text-muted-foreground">
          Free to start. No credit card. Just better interviews.
        </p>
        <Link
          href="/signup"
          className="group relative inline-flex items-center gap-2.5 rounded-[13px] bg-accent px-7 py-3.5 text-base font-semibold text-accent-foreground shadow-[0_14px_34px_-12px_var(--glow)] transition-transform hover:-translate-y-0.5"
        >
          Get started free
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </section>
  )
}
