"use client"

/**
 * PremiumLayout — shared shell for all premium live-interview pages.
 * Minimal top nav + centered content. No sidebar (action-focused pages).
 */

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, ArrowLeft, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"

// Route the brand logo to whichever dashboard matches the user's role.
function roleHome(role?: string | null): string {
  const r = String(role || "").trim().toLowerCase()
  if (r === "interviewer") return "/interviewer-dashboard"
  if (r === "admin") return "/admin-dashboard"
  return "/dashboard"
}

interface PremiumLayoutProps {
  children: React.ReactNode
  /** Show a back arrow link in the header */
  backHref?: string
  backLabel?: string
  /** Whether to show the "My Bookings" nav link */
  showMyBookings?: boolean
}

export function PremiumLayout({
  children,
  backHref,
  backLabel = "Back",
  showMyBookings = true,
}: PremiumLayoutProps) {
  const { user } = useAuth()
  const homeHref = roleHome(user?.user_role)

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl lg:px-10">
        {/* Left: logo or back */}
        <div className="flex items-center gap-4">
          {backHref ? (
            <Link
              href={backHref}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          ) : (
            <Link href={homeHref} className="flex items-center gap-1.5">
              <Image
                src="/Logo_with_no_background.png"
                alt="Intervexa"
                width={64}
                height={64}
                className="object-contain"
              />
              <span className="font-display text-[22px] font-bold leading-none text-foreground">Intervexa</span>
            </Link>
          )}
        </div>

        {/* Right: nav + theme */}
        <div className="flex items-center gap-3">
          {showMyBookings && (
            <Link
              href="/live-interview/my-bookings"
              className="hidden sm:flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/40 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
              My Bookings
            </Link>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* ── Content ── */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-3xl px-4 py-12 lg:px-6"
      >
        {children}
      </motion.main>
    </div>
  )
}

/** Premium badge pill — used on booking pages */
export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/30 px-3 py-1 text-xs font-semibold text-accent">
      <Sparkles className="h-3 w-3" />
      Premium
    </span>
  )
}
