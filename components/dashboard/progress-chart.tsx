"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react"
import { interviewApi } from "@/lib/api"

interface SessionPoint {
  session: number
  label: string
  score: number
  type: string
  difficulty: string
  date: string
}

function TrendBadge({ sessions }: { sessions: SessionPoint[] }) {
  if (sessions.length < 2) return null
  const first = sessions[0].score
  const last = sessions[sessions.length - 1].score
  const delta = last - first
  if (Math.abs(delta) < 2) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> Steady
      </span>
    )
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
        <TrendingUp className="h-3 w-3" /> +{delta} pts
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium">
      <TrendingDown className="h-3 w-3" /> {delta} pts
    </span>
  )
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as SessionPoint
  return (
    <div className="rounded-xl border border-border/50 bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-card-foreground mb-1 truncate max-w-[160px]">{d.label}</p>
      <p className="text-accent font-bold text-sm">{d.score}%</p>
      <p className="text-muted-foreground capitalize">{d.type} · {d.difficulty}</p>
      {d.date && (
        <p className="text-muted-foreground/60 mt-1">
          {new Date(d.date).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

export function ProgressChart() {
  const [sessions, setSessions] = useState<SessionPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    interviewApi.getProgress(20)
      .then((res) => {
        if (res.success) setSessions(res.data.sessions)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 flex items-center justify-center h-48">
        <p className="text-sm text-muted-foreground">
          Complete at least one interview to see your progress chart.
        </p>
      </div>
    )
  }

  const avg = Math.round(sessions.reduce((s, p) => s + p.score, 0) / sessions.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border/50 bg-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-card-foreground">Score Progress</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-2xl font-bold text-accent">{avg}%</p>
          <TrendBadge sessions={sessions} />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={sessions} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
          <XAxis
            dataKey="session"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            label={{ value: "Session", position: "insideBottom", offset: -2, fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avg}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            opacity={0.5}
            label={{ value: `Avg ${avg}%`, fill: "var(--muted-foreground)", fontSize: 10, position: "right" }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "var(--accent)", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "var(--accent)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
