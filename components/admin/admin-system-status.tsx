"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Server, Database, Brain, Mic, Camera, Cpu,
  RefreshCw, CheckCircle2, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { API_BASE_URL } from "@/lib/api-config"

interface ServiceStatus {
  id: string
  name: string
  status: "healthy" | "degraded" | "running" | "connected"
  latency: string
  metrics?: Record<string, string>
  models?: Record<string, boolean>
}

interface AdminSystemStatusProps {
  services: ServiceStatus[]
}

// ── Static maps ───────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Backend API": Server,
  "MongoDB":     Database,
  "AI Gateway":  Brain,
}

const SERVICE_COLORS: Record<string, { icon: string; glow: string; ring: string }> = {
  "Backend API": { icon: "text-info",    glow: "bg-info/10",    ring: "border-info/20"    },
  "MongoDB":     { icon: "text-success", glow: "bg-success/10", ring: "border-success/20" },
  "AI Gateway":  { icon: "text-accent",  glow: "bg-accent/10",  ring: "border-accent/20"  },
}

// Labels shown for metrics keys
const METRIC_LABELS: Record<string, string> = {
  uptime: "Uptime",
  heap:   "Heap",
  rss:    "RSS",
  node:   "Node",
  ping:   "Ping",
  state:  "State",
  pool:   "Pool",
}

const MODEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  answer_generation: Cpu,
  nlp_evaluation:    Brain,
  speech_to_text:    Mic,
  vocal_analysis:    Mic,
  facial_analysis:   Camera,
  fusion_engine:     Cpu,
}

const MODEL_LABELS: Record<string, string> = {
  answer_generation: "Answer Generation",
  nlp_evaluation:    "NLP Evaluation",
  speech_to_text:    "Speech to Text",
  vocal_analysis:    "Vocal Analysis",
  facial_analysis:   "Facial Analysis",
  fusion_engine:     "Fusion Engine",
}

// ── Polling hook ──────────────────────────────────────────────────────────────

function usePolledServices(initialServices: ServiceStatus[]) {
  const [services, setServices]         = useState<ServiceStatus[]>(initialServices)
  const [lastChecked, setLastChecked]   = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`${API_BASE_URL}/health`)
      setServices(prev =>
        prev.map(s =>
          s.id === "backend" ? { ...s, status: res.ok ? "running" : "degraded" } : s,
        ),
      )
      setLastChecked(new Date())
    } catch {
      setServices(prev =>
        prev.map(s => s.id === "backend" ? { ...s, status: "degraded" } : s),
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => { if (initialServices.length > 0) setServices(initialServices) }, [initialServices])
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { services, lastChecked, isRefreshing, refresh }
}

// ── Pulse dot ─────────────────────────────────────────────────────────────────

function PulseDot({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", ok ? "bg-success" : "bg-warning")} />
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; ok: boolean }> = {
  healthy:   { label: "Healthy",   ok: true  },
  running:   { label: "Running",   ok: true  },
  connected: { label: "Connected", ok: true  },
  degraded:  { label: "Degraded",  ok: false },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, ok: false }
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <PulseDot ok={meta.ok} />
      <span className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        meta.ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
      )}>
        {meta.label}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminSystemStatus({ services: initialServices }: AdminSystemStatusProps) {
  const { services, lastChecked, isRefreshing, refresh } = usePolledServices(initialServices)

  const aiGateway = services.find(s => s.id === "ai-gateway")
  const allOk     = services.every(s => STATUS_META[s.status]?.ok !== false)
  const okCount   = services.filter(s => STATUS_META[s.status]?.ok !== false).length

  return (
    <section className="rounded-[17px] border border-border bg-card overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">System Status</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Live health of core services</p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Checking…" : "Refresh"}
        </button>
      </div>

      {/* ── Overall banner ── */}
      <div className={cn(
        "mx-5 mb-4 flex items-center gap-3 rounded-xl border px-4 py-3",
        allOk ? "border-success/20 bg-success/5" : "border-warning/20 bg-warning/5",
      )}>
        <PulseDot ok={allOk} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold", allOk ? "text-success" : "text-warning")}>
            {allOk ? "All Systems Operational" : "Some Services Degraded"}
          </p>
          <p className="text-xs text-muted-foreground">{okCount} / {services.length} services nominal</p>
        </div>
        {allOk
          ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          : <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />}
      </div>

      {/* ── Service cards ── */}
      <div className="flex flex-col gap-2.5 px-5 pb-5">
        {services.map((service, i) => {
          const Icon    = SERVICE_ICONS[service.name] ?? Server
          const colors  = SERVICE_COLORS[service.name] ?? SERVICE_COLORS["Backend API"]
          const isOk    = STATUS_META[service.status]?.ok !== false
          const metrics = service.metrics ? Object.entries(service.metrics) : []
          const loadedModels = service.models
            ? Object.entries(service.models).filter(([, v]) => v === true)
            : []

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
              className={cn(
                "rounded-xl border bg-background/50 overflow-hidden",
                isOk ? colors.ring : "border-warning/20",
              )}
            >
              {/* ── Top row: icon + name + status ── */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", colors.glow)}>
                  <Icon className={cn("h-4 w-4", isOk ? colors.icon : "text-warning")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{service.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{service.latency}</p>
                </div>
                <StatusBadge status={service.status} />
              </div>

              {/* ── Metrics grid (Backend API & MongoDB) ── */}
              {metrics.length > 0 && (
                <div className="border-t border-border/30 grid grid-cols-2 gap-px bg-border/20 px-0">
                  {metrics.map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5 bg-background/60 px-4 py-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {METRIC_LABELS[key] ?? key}
                      </span>
                      <span className="text-xs font-medium text-card-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── AI model chips (AI Gateway only) ── */}
              <AnimatePresence>
                {loadedModels.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-border/30 px-4 pb-3 pt-2.5"
                  >
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Active Models
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {loadedModels.map(([key]) => {
                        const ModelIcon = MODEL_ICONS[key] ?? Cpu
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/5 px-2.5 py-1 text-xs font-medium text-success"
                          >
                            <ModelIcon className="h-3 w-3 shrink-0" />
                            {MODEL_LABELS[key] ?? key}
                          </span>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border/30 px-5 py-2.5">
        <p className="text-[11px] text-muted-foreground/60">
          Last checked · {lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

    </section>
  )
}
