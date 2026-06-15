"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Zap,
  Check,
  Lock,
  Sparkles,
  Users,
  Infinity,
  BarChart3,
  ShieldCheck,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { usePlan } from "@/hooks/use-plan"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

const FREE_FEATURES = [
  { icon: Sparkles,  text: "3 AI interview sessions per month" },
  { icon: BarChart3, text: "Easy & Medium difficulty" },
  { icon: Check,     text: "Basic score breakdown" },
  { icon: Check,     text: "Question bank access" },
]

const PRO_FEATURES = [
  { icon: Infinity,   text: "Unlimited AI interview sessions" },
  { icon: BarChart3,  text: "All difficulty levels (incl. Hard)" },
  { icon: Users,      text: "Live human interviewer bookings" },
  { icon: Sparkles,   text: "360° AI + Human score report" },
  { icon: ShieldCheck,text: "Priority AI processing" },
  { icon: Check,      text: "Advanced analytics & insights" },
]

// Only allow internal absolute paths so ?next=... can't be used as an open redirect.
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard"
  return value
}

export default function UpgradePage() {
  const { isPro, isFree } = usePlan()
  const { upgradePlan, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNext(searchParams.get("next"))

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await upgradePlan("pro")
      setSuccess(true)
      setTimeout(() => router.push(nextPath), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          {isPro && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 border border-accent/30 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles className="h-3 w-3" /> Premium Active
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 px-3 py-1 text-xs font-semibold text-yellow-400 mb-4">
            <Zap className="h-3.5 w-3.5" /> Upgrade your practice
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Choose your plan
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Start for free, unlock everything with Premium — no commitment required.
          </p>
        </motion.div>

        {/* Plan Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`rounded-2xl border p-8 flex flex-col ${
              isFree
                ? "border-border bg-card"
                : "border-border/40 bg-card/40 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Free</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Great to get started</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-foreground">$0</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  {text}
                </li>
              ))}
              <li className="flex items-center gap-3 text-sm text-muted-foreground opacity-50">
                <Lock className="h-4 w-4 shrink-0" />
                Live human interviews (Premium)
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground opacity-50">
                <Lock className="h-4 w-4 shrink-0" />
                Hard difficulty (Premium)
              </li>
            </ul>

            <Button
              variant="outline"
              disabled
              className="w-full bg-transparent border-border/50"
            >
              {isFree ? "Current Plan" : "Downgraded"}
            </Button>
          </motion.div>

          {/* Premium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="relative rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-8 flex flex-col shadow-xl shadow-accent/5"
          >
            {/* Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-lg">
                <Sparkles className="h-3 w-3" /> Most Popular
              </span>
            </div>

            <div className="flex items-center justify-between mb-6 mt-2">
              <div>
                <h2 className="text-xl font-bold text-foreground">Premium</h2>
                <p className="text-sm text-muted-foreground mt-0.5">For serious candidates</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-foreground">$9</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-foreground">
                  <Icon className="h-4 w-4 text-accent shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            {/* Success state */}
            {success ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-3 text-sm font-semibold text-emerald-400">
                <Check className="h-4 w-4" />
                Upgraded! Redirecting…
              </div>
            ) : isPro ? (
              <Button disabled className="w-full bg-accent/20 text-accent border border-accent/30">
                <Sparkles className="h-4 w-4 mr-2" />
                Current Plan
              </Button>
            ) : (
              <>
                {error && (
                  <p className="text-xs text-destructive mb-3 text-center">{error}</p>
                )}
                <Button
                  id="upgrade-to-pro-btn"
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Upgrading…
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade to Premium
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Demo: upgrade is instant, no payment required.
                </p>
              </>
            )}
          </motion.div>
        </div>

        {/* Feature comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-16 rounded-2xl border border-border/50 bg-card overflow-hidden"
        >
          <div className="px-8 py-5 border-b border-border/50">
            <h2 className="text-lg font-semibold text-card-foreground">Full comparison</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-8 py-4 text-sm text-muted-foreground font-medium w-1/2">Feature</th>
                <th className="text-center px-6 py-4 text-sm text-muted-foreground font-medium w-1/4">Free</th>
                <th className="text-center px-6 py-4 text-sm text-accent font-semibold w-1/4">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {[
                ["AI interview sessions",       "3 / month",   "Unlimited"],
                ["Session difficulty",          "Easy, Medium","Easy, Medium, Hard"],
                ["Score breakdown",             "Basic",       "Full 360°"],
                ["Live human interviews",       "❌",           "✅"],
                ["AI + Human feedback report",  "❌",           "✅"],
                ["Priority AI processing",      "❌",           "✅"],
                ["Advanced analytics",          "❌",           "✅"],
              ].map(([feature, free, pro]) => (
                <tr key={feature} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-8 py-3.5 text-sm text-card-foreground">{feature}</td>
                  <td className="px-6 py-3.5 text-center text-sm text-muted-foreground">{free}</td>
                  <td className="px-6 py-3.5 text-center text-sm text-accent font-medium">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </main>
    </div>
  )
}
