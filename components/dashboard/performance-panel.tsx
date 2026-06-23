"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp } from "lucide-react"
import { interviewApi } from "@/lib/api"

interface TrendPoint {
  label: string
  score: number
}

interface SkillRow {
  label: string
  value: number
}

interface PerformancePanelProps {
  /** Id of the most recent completed session, used to pull dimension scores. */
  latestCompletedId?: string
}

/**
 * Dashboard "Performance trend" + "Skill breakdown" panels, matching the
 * redesign prototype. Both pull real data: the trend from getProgress() and
 * the skill bars from the latest completed session's dimension scores.
 */
export function PerformancePanel({ latestCompletedId }: PerformancePanelProps) {
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [skills, setSkills] = useState<SkillRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const prog = await interviewApi.getProgress(8)
        if (!cancelled && prog.success) {
          setTrend(prog.data.sessions.map((s) => ({ label: s.label, score: s.score })))
        }
      } catch {
        /* trend stays empty → graceful empty state */
      }
      try {
        if (latestCompletedId) {
          const res = await interviewApi.getResults(latestCompletedId)
          if (!cancelled && res.success && res.data?.scores) {
            const sc = res.data.scores
            setSkills([
              { label: "Communication", value: sc.clarity ?? 0 },
              { label: "Confidence", value: sc.confidence ?? 0 },
              { label: "Content depth", value: sc.technical ?? 0 },
              { label: "Body language", value: sc.bodyLanguage ?? 0 },
            ])
          }
        }
      } catch {
        /* skills stays null → panel hidden */
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [latestCompletedId])

  // First/last delta for the trend pill
  const delta =
    trend.length >= 2 ? Math.round(trend[trend.length - 1].score - trend[0].score) : null

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Performance trend */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-[17px] border border-border bg-card p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-card-foreground">Performance trend</h2>
            <p className="mt-1 text-[13px] text-faint">Average score, last {trend.length || 8} sessions</p>
          </div>
          {delta !== null && (
            <span
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${
                delta >= 0 ? "bg-accent/10 text-accent" : "bg-warning/15 text-warning"
              }`}
            >
              {delta >= 0 ? "+" : ""}{delta} pts {delta >= 0 ? "▲" : "▼"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-[180px] animate-pulse rounded-xl bg-secondary/40" />
        ) : trend.length >= 2 ? (
          <TrendChart points={trend} />
        ) : (
          <div className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center">
            <TrendingUp className="h-6 w-6 text-faint" />
            <p className="text-sm text-muted-foreground">Complete a few sessions to see your trend.</p>
          </div>
        )}
      </motion.div>

      {/* Skill breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-[17px] border border-border bg-card p-5"
      >
        <h2 className="mb-4 font-display text-base font-semibold text-card-foreground">Skill breakdown</h2>
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-secondary/40" />
            ))}
          </div>
        ) : skills ? (
          <div className="flex flex-col gap-4">
            {skills.map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-mono text-card-foreground">{s.value}</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className={`h-full rounded-full ${s.value < 60 ? "bg-warning" : "bg-accent"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.value}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Finish a session with spoken answers to see your skill breakdown.
          </p>
        )}
      </motion.div>
    </div>
  )
}

/** Animated area + line chart from real score points. */
function TrendChart({ points }: { points: TrendPoint[] }) {
  const W = 560
  const H = 180
  const padY = 24
  const n = points.length
  const stepX = n > 1 ? W / (n - 1) : W
  const toY = (score: number) => padY + (1 - score / 100) * (H - padY * 2)
  const coords = points.map((p, i) => ({ x: i * stepX, y: toY(p.score) }))
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ")
  const area = `${line} L ${W} ${H} L 0 ${H} Z`
  const last = coords[coords.length - 1]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" style={{ height: "auto" }}>
        <defs>
          <linearGradient id="dashTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" y1={H * g} x2={W} y2={H * g} stroke="var(--border)" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#dashTrend)" />
        <motion.path
          d={line}
          fill="none"
          style={{ stroke: "var(--accent)" }}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: "easeOut" }}
        />
        <circle cx={last.x} cy={last.y} r="4.5" style={{ fill: "var(--accent)" }} />
      </svg>
      <div className="mt-2.5 flex justify-between font-mono text-[10.5px] text-faint">
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </div>
  )
}
