"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles, KeyRound, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { authApi } from "@/lib/api"
import { useAuth, useRequireAuth } from "@/contexts/auth-context"

export default function SetPasswordPage() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  useRequireAuth()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  const trimmed = password.trim()
  const isStrongEnough = trimmed.length >= 6
  const matches = trimmed.length > 0 && trimmed === confirm.trim()
  const canSubmit = isStrongEnough && matches && !saving

  const destinationForRole = () =>
    user?.user_role === "interviewer" ? "/interviewer-dashboard" : "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    try {
      await authApi.setPassword(trimmed)
      await refreshUser()
      toast.success("Password set", {
        description: "You can now log in with email and password as well.",
      })
      router.push(destinationForRole())
    } catch (err) {
      toast.error("Couldn't set password", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  const firstName = (user?.name || "").split(" ")[0]

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative side panel — visual on the left */}
      <aside className="absolute inset-y-0 left-0 hidden w-[42%] lg:block">
        <div className="relative h-full w-full bg-sidebar">
          {/* Geometric accent shapes */}
          <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-12 left-12 h-56 w-56 rounded-full bg-chart-2/15 blur-3xl" />
          <div className="pointer-events-none absolute right-12 top-1/3 h-40 w-40 rotate-12 rounded-3xl border border-accent/30" />

          <div className="relative flex h-full flex-col justify-between p-12">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <Sparkles className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground">Intervexa</span>
            </Link>

            <div className="space-y-6 max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                <ShieldCheck className="h-3.5 w-3.5" />
                One more step
              </div>
              <h2 className="text-4xl font-semibold leading-tight text-sidebar-foreground">
                Add a password so you can always get back in.
              </h2>
              <p className="text-sidebar-foreground/70 leading-relaxed">
                You signed in with Google — that's it for today. But adding a password gives you a
                second way to sign in if you ever lose access to your Google account.
              </p>

              <ul className="space-y-3 pt-2">
                {[
                  "Sign in with email + password or Google — your choice",
                  "Recover your account without a Google login",
                  "Required if you want to use Forgot password",
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-sm text-sidebar-foreground/80">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-sidebar-foreground/40">
              You can skip this and set a password later from <span className="text-sidebar-foreground/60">Settings → Security</span>.
            </p>
          </div>
        </div>
      </aside>

      {/* Right side — form */}
      <main className="relative ml-0 flex min-h-screen items-center justify-center px-6 py-12 lg:ml-[42%] lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile-only brand */}
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-semibold text-foreground">Intervexa</span>
          </Link>

          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/40">
              <KeyRound className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {firstName ? `Welcome, ${firstName}` : "Welcome"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Set a password to also sign in with your email.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="pr-10 bg-secondary/40 border-border/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className={`text-xs ${trimmed.length === 0 ? "text-muted-foreground/60" : isStrongEnough ? "text-success" : "text-muted-foreground"}`}>
                {trimmed.length === 0
                  ? "Pick something only you know."
                  : isStrongEnough
                  ? "Looks good."
                  : `${6 - trimmed.length} more character${6 - trimmed.length === 1 ? "" : "s"} to go.`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                autoComplete="new-password"
                className="bg-secondary/40 border-border/60"
              />
              {confirm.length > 0 && !matches && (
                <p className="text-xs text-destructive">Passwords don't match yet.</p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push(destinationForRole())}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Skip for now
              </button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-accent text-accent-foreground hover:bg-accent/90 sm:min-w-[160px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Set password
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
