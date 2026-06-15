"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { motion } from "framer-motion"
import { Loader2, TrendingUp, TrendingDown, Minus, ArrowLeft, Flame } from "lucide-react"
import Link from "next/link"
import { authApi, interviewApi, type InterviewSession } from "@/lib/api"
import { useRequireAuth } from "@/contexts/auth-context"
import { useTheme } from "next-themes"
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts"

// ── Semantic palette (score quality — do NOT theme these) ─────────────────────
const C = {
  emerald: "#10b981",
  amber:   "#f59e0b",
  red:     "#ef4444",
  blue:    "#3b82f6",
}

// ── Shared tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-lg text-xs">
      {label && <p className="mb-1 font-semibold text-card-foreground">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color ?? p.fill }} className="font-medium">
          {p.value}{typeof p.value === "number" && p.dataKey === "score" ? "%" : ""}
        </p>
      ))}
    </div>
  )
}

// ── Performance ring ──────────────────────────────────────────────────────────
function PerformanceRing({ score }: { score: number }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const arc = circumference * (score / 100)
  const color = score >= 75 ? C.emerald : score >= 50 ? C.amber : C.red
  const label = score >= 75 ? "Great" : score >= 50 ? "Average" : "Needs Work"

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          {/* Progress */}
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-card-foreground">{score}%</span>
          <span className="text-xs text-muted-foreground">avg score</span>
        </div>
      </div>
      <span
        className="rounded-full px-3 py-0.5 text-xs font-semibold"
        style={{ background: `${color}18`, color }}
      >
        {label}
      </span>
    </div>
  )
}

// ── Trend indicator ───────────────────────────────────────────────────────────
function TrendBadge({ sessions }: { sessions: { score: number }[] }) {
  if (sessions.length < 2) return null
  const delta = sessions[sessions.length - 1].score - sessions[0].score
  if (Math.abs(delta) < 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> Steady
      </span>
    )
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "#ecfdf5", color: C.emerald }}>
        <TrendingUp className="h-3 w-3" /> +{delta.toFixed(0)} pts
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "#fef2f2", color: C.red }}>
      <TrendingDown className="h-3 w-3" /> {delta.toFixed(0)} pts
    </span>
  )
}

// ── Session breakdown bar ─────────────────────────────────────────────────────
function SessionBar({
  label, value, total, color,
}: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold" style={{ color }}>{value} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
interface SessionPoint {
  label: string
  score: number
  type: string
  difficulty: string
  date: string
}

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth()
  const { resolvedTheme } = useTheme()
  // Accent color for recharts SVG attributes (CSS vars don't work there)
  const accentColor = resolvedTheme === "dark"
    ? "oklch(88.421% 0.20618 154.236)"
    : "oklch(59.98% 0.207 263.1)"
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalInterviews: 0,
    completedInterviews: 0,
    averageScore: 0,
    confidenceImprovement: 0,
    inProgressCount: 0,
    cancelledCount: 0,
  })
  const [sessions, setSessions] = useState<SessionPoint[]>([])
  const [allSessions, setAllSessions] = useState<InterviewSession[]>([])

  useEffect(() => {
    if (!isAuthenticated) return
    Promise.all([
      authApi.getStats(),
      interviewApi.getProgress(12),
      interviewApi.getMySessions({ limit: 100 }),
    ])
      .then(([statsRes, progressRes, mineRes]) => {
        if (statsRes.success) {
          setStats({
            totalInterviews:     statsRes.data.totalInterviews,
            completedInterviews: statsRes.data.completedInterviews,
            averageScore:        statsRes.data.averageScore,
            confidenceImprovement: statsRes.data.confidenceImprovement,
            inProgressCount:     statsRes.data.inProgressCount ?? 0,
            cancelledCount:      statsRes.data.cancelledCount  ?? 0,
          })
        }
        if (progressRes.success) setSessions(progressRes.data.sessions)
        if (mineRes.success) setAllSessions(mineRes.data.sessions)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [isAuthenticated])

  // ── Aggregations ─────────────────────────────────────────────────────────────
  const completedScored = useMemo(
    () => allSessions.filter(
      (s) => s.status === "completed" && typeof s.overall_score === "number",
    ),
    [allSessions],
  )

  const byType = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const s of completedScored) {
      const key = (s.session_type || "other").toLowerCase()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(s.overall_score as number)
    }
    return Array.from(groups.entries()).map(([key, scores]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
  }, [completedScored])

  const byDifficulty = useMemo(() => {
    const ORDER = ["easy", "medium", "hard"]
    const groups = new Map<string, number[]>()
    for (const s of completedScored) {
      const key = (s.difficulty || "unknown").toLowerCase()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(s.overall_score as number)
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b))
      .map(([key, scores]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        count: scores.length,
      }))
  }, [completedScored])

  const heatmap = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of allSessions) {
      const d = new Date(s.createdAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const days: { date: Date; count: number }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      days.push({ date: d, count: counts.get(key) ?? 0 })
    }
    const peak = days.reduce((m, d) => Math.max(m, d.count), 0)
    const active = days.filter((d) => d.count > 0).length
    const total = days.reduce((s, d) => s + d.count, 0)
    return { days, peak, active, total }
  }, [allSessions])

  const monthly = useMemo(() => {
    const groups = new Map<string, { label: string; ts: number; scores: number[]; total: number; completed: number }>()
    for (const s of allSessions) {
      const d = new Date(s.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (!groups.has(key)) {
        groups.set(key, {
          label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
          scores: [],
          total: 0,
          completed: 0,
        })
      }
      const g = groups.get(key)!
      g.total += 1
      if (s.status === "completed") {
        g.completed += 1
        if (typeof s.overall_score === "number") g.scores.push(s.overall_score)
      }
    }
    return Array.from(groups.values())
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 6)
      .map((g) => ({
        label: g.label,
        total: g.total,
        completed: g.completed,
        avg: g.scores.length ? Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length) : null,
        best: g.scores.length ? Math.max(...g.scores) : null,
        completionRate: g.total ? Math.round((g.completed / g.total) * 100) : 0,
      }))
  }, [allSessions])

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated) return null

  const hasData = sessions.length > 0

  // Best / worst score
  const best  = hasData ? Math.max(...sessions.map(s => s.score)) : 0
  const worst = hasData ? Math.min(...sessions.map(s => s.score)) : 0

  const kpis = [
    { label: "Total Sessions",  value: stats.totalInterviews,                    color: "var(--chart-1)" },
    { label: "Completed",       value: stats.completedInterviews,                color: "var(--chart-2)" },
    { label: "Personal Best",   value: `${best}%`,                               color: "var(--chart-3)" },
    { label: "Confidence Gain", value: `+${stats.confidenceImprovement}%`,       color: "var(--chart-4)" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Link */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground">My Analytics</h1>
          <p className="text-muted-foreground mt-1">Your personal interview performance at a glance.</p>
        </motion.div>

        {/* KPI row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-border/50 bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-3xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <div className="mt-2 h-1 w-10 rounded-full" style={{ background: k.color, opacity: 0.4 }} />
            </div>
          ))}
        </motion.div>

        {/* Performance ring + session breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          {/* Ring */}
          <div id="performance" className="scroll-mt-24 rounded-2xl border border-border/50 bg-card p-6 flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-base font-semibold text-card-foreground">Overall Performance</p>
              <p className="text-xs text-muted-foreground mt-0.5">Based on all completed sessions</p>
            </div>
            <PerformanceRing score={stats.averageScore} />
            <div className="flex gap-4 text-center text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-card-foreground">{best}%</p>
                <p>Best</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="font-semibold text-card-foreground">{worst}%</p>
                <p>Lowest</p>
              </div>
            </div>
          </div>

          {/* Session breakdown */}
          <div id="breakdown" className="lg:col-span-2 scroll-mt-24 rounded-2xl border border-border/50 bg-card p-6">
            <p className="text-base font-semibold text-card-foreground">Session Breakdown</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-6">How your sessions are distributed</p>
            <div className="space-y-4">
              <SessionBar
                label="Completed"
                value={stats.completedInterviews}
                total={stats.totalInterviews}
                color={C.emerald}
              />
              <SessionBar
                label="In Progress"
                value={stats.inProgressCount}
                total={stats.totalInterviews}
                color={C.blue}
              />
              <SessionBar
                label="Cancelled"
                value={stats.cancelledCount}
                total={stats.totalInterviews}
                color={C.red}
              />
            </div>

            {/* Pending = total - others */}
            <div className="mt-6 flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">Completion rate</span>
              <span className="text-lg font-bold" style={{ color: C.emerald }}>
                {stats.totalInterviews > 0
                  ? `${Math.round((stats.completedInterviews / stats.totalInterviews) * 100)}%`
                  : "—"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Score trend — area chart */}
        <motion.div
          id="trend"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="scroll-mt-24 rounded-2xl border border-border/50 bg-card p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-card-foreground">Score Trend</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your last {sessions.length} completed sessions</p>
            </div>
            {hasData && <TrendBadge sessions={sessions} />}
          </div>

          {!hasData ? (
            <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-border/60 bg-secondary/10">
              <p className="text-sm text-muted-foreground">Complete at least one interview to see your trend.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={sessions} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={accentColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.6} />
                <XAxis
                  dataKey="label"
                  tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  width={28}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ChartTip />} cursor={{ stroke: accentColor, strokeWidth: 1.5, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={accentColor}
                  strokeWidth={2.5}
                  fill="url(#scoreGrad)"
                  dot={{ fill: accentColor, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: accentColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Score distribution across sessions */}
        {hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border/50 bg-card p-6"
          >
            <p className="text-base font-semibold text-card-foreground mb-1">Score per Session</p>
            <p className="text-xs text-muted-foreground mb-6">Individual scores — hover for details</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sessions} barCategoryGap="30%" margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.6} />
                <XAxis
                  dataKey="label"
                  tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  width={28}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<ChartTip />} cursor={{ fill: "#f1f5f9", opacity: 0.6 }} />
                <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                  {sessions.map((s) => {
                    const col = s.score >= 75 ? C.emerald : s.score >= 50 ? C.amber : C.red
                    return <Cell key={s.label} fill={col} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: C.emerald }} /> ≥ 75% Great</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: C.amber }} /> 50–74% Average</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: C.red }} /> &lt; 50% Needs Work</span>
            </div>
          </motion.div>
        )}

        {/* ── Performance Breakdown — Type + Difficulty ───────────────────── */}
        {completedScored.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <p className="text-base font-semibold text-card-foreground">By Session Type</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-6">
                Average score where you've practiced most
              </p>
              {byType.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-4">
                  {byType.map((row, i) => {
                    const col = `var(--chart-${(i % 5) + 1})`
                    return (
                      <div key={row.key}>
                        <div className="mb-1.5 flex items-baseline justify-between text-xs">
                          <span className="font-medium text-card-foreground">{row.label}</span>
                          <span className="text-muted-foreground">
                            <span className="font-semibold" style={{ color: col }}>{row.avg}%</span>
                            <span className="ml-2">{row.count} session{row.count === 1 ? "" : "s"}</span>
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${row.avg}%`, background: col }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <p className="text-base font-semibold text-card-foreground">By Difficulty</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-6">
                How you hold up as questions get harder
              </p>
              {byDifficulty.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-4">
                  {byDifficulty.map((row) => {
                    const col =
                      row.key === "easy" ? C.emerald :
                      row.key === "medium" ? C.amber :
                      row.key === "hard" ? C.red :
                      C.blue
                    return (
                      <div key={row.key}>
                        <div className="mb-1.5 flex items-baseline justify-between text-xs">
                          <span className="font-medium text-card-foreground">{row.label}</span>
                          <span className="text-muted-foreground">
                            <span className="font-semibold" style={{ color: col }}>{row.avg}%</span>
                            <span className="ml-2">{row.count} session{row.count === 1 ? "" : "s"}</span>
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${row.avg}%`, background: col }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Activity Heatmap — last 12 weeks ────────────────────────────── */}
        <motion.div
          id="streak"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="scroll-mt-24 rounded-2xl border border-border/50 bg-card p-6"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-card-foreground flex items-center gap-2">
                <Flame className="h-4 w-4 text-accent" />
                Practice Activity
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Sessions per day over the last 12 weeks</p>
            </div>
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-card-foreground">{heatmap.total}</span> session{heatmap.total === 1 ? "" : "s"}
              </span>
              <span>
                <span className="font-semibold text-card-foreground">{heatmap.active}</span> active day{heatmap.active === 1 ? "" : "s"}
              </span>
              <span>
                Peak <span className="font-semibold text-card-foreground">{heatmap.peak}</span>/day
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            {/* Day-of-week labels */}
            <div className="hidden flex-col justify-between py-0.5 text-[10px] text-muted-foreground sm:flex">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
              <span>Sun</span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <div className="grid grid-flow-col grid-rows-7 gap-1">
                {heatmap.days.map(({ date, count }) => {
                  const intensity =
                    count === 0 ? "bg-secondary/50 border border-border/30" :
                    count === 1 ? "bg-accent/30" :
                    count === 2 ? "bg-accent/55" :
                    count === 3 ? "bg-accent/75" :
                    "bg-accent"
                  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  return (
                    <div
                      key={date.getTime()}
                      title={`${dateLabel} — ${count} session${count === 1 ? "" : "s"}`}
                      className={`h-3 w-3 rounded-[3px] ${intensity}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Less</span>
            <span className="h-3 w-3 rounded-[3px] bg-secondary/50 border border-border/30" />
            <span className="h-3 w-3 rounded-[3px] bg-accent/30" />
            <span className="h-3 w-3 rounded-[3px] bg-accent/55" />
            <span className="h-3 w-3 rounded-[3px] bg-accent/75" />
            <span className="h-3 w-3 rounded-[3px] bg-accent" />
            <span>More</span>
          </div>
        </motion.div>

        {/* ── Monthly Performance Table ───────────────────────────────────── */}
        {monthly.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-border/50 bg-card p-6"
          >
            <div className="mb-5">
              <p className="text-base font-semibold text-card-foreground">Monthly Performance</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aggregated stats for the last {monthly.length} month{monthly.length === 1 ? "" : "s"}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Month</th>
                    <th className="pb-3 pr-4 text-right">Sessions</th>
                    <th className="pb-3 pr-4 text-right">Completed</th>
                    <th className="pb-3 pr-4 text-right">Avg Score</th>
                    <th className="pb-3 pr-4 text-right">Best</th>
                    <th className="pb-3 text-right">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => {
                    const avgCol =
                      m.avg === null ? "text-muted-foreground" :
                      m.avg >= 75 ? "text-success" :
                      m.avg >= 50 ? "text-warning" :
                      "text-destructive"
                    return (
                      <tr key={m.label} className="border-b border-border/30 last:border-0">
                        <td className="py-3.5 pr-4 font-medium text-card-foreground">{m.label}</td>
                        <td className="py-3.5 pr-4 text-right tabular-nums text-card-foreground">{m.total}</td>
                        <td className="py-3.5 pr-4 text-right tabular-nums text-muted-foreground">{m.completed}</td>
                        <td className={`py-3.5 pr-4 text-right tabular-nums font-semibold ${avgCol}`}>
                          {m.avg === null ? "—" : `${m.avg}%`}
                        </td>
                        <td className="py-3.5 pr-4 text-right tabular-nums text-card-foreground">
                          {m.best === null ? "—" : `${m.best}%`}
                        </td>
                        <td className="py-3.5 text-right tabular-nums">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary/50">
                              <span
                                className="block h-full rounded-full bg-accent"
                                style={{ width: `${m.completionRate}%` }}
                              />
                            </span>
                            <span className="text-xs text-muted-foreground">{m.completionRate}%</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
