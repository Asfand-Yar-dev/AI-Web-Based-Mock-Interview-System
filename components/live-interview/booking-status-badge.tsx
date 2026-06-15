"use client"

/** Reusable status badge for all 8 live booking statuses */

import { Clock, CheckCircle2, XCircle, CreditCard, CalendarCheck, Video, CheckSquare, Zap } from "lucide-react"

const STATUS_META: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  // ── New 7-stage lifecycle ────────────────────────────────────────────────────
  pending_approval:  {
    label: "Pending Approval",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: XCircle,
  },
  payment_pending: {
    label: "Payment Pending",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    icon: CreditCard,
  },
  payment_completed: {
    label: "Payment Completed",
    className: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    icon: CheckCircle2,
  },
  meeting_scheduled: {
    label: "Meeting Scheduled",
    className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    icon: CalendarCheck,
  },
  meeting_started: {
    label: "🔴 Live",
    className: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    icon: Video,
  },
  meeting_completed: {
    label: "Meeting Completed",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: CheckSquare,
  },
  // ── Legacy / AI pipeline states ──────────────────────────────────────────────
  confirmed:      { label: "Confirmed",    className: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: CheckCircle2 },
  in_progress:    { label: "In Progress",  className: "bg-violet-500/15 text-violet-400 border-violet-500/30", icon: Zap },
  completed:      { label: "Completed",    className: "bg-slate-500/15 text-slate-400 border-slate-500/30", icon: CheckSquare },
  evaluating_ai:  { label: "AI Evaluating", className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30", icon: Zap },
  results_ready:  { label: "Results Ready", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  failed_no_show: { label: "No Show",      className: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
  refunded:       { label: "Refunded",     className: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
}

interface BookingStatusBadgeProps {
  status: string
  className?: string
  showIcon?: boolean
}

export function BookingStatusBadge({ status, className = "", showIcon = false }: BookingStatusBadgeProps) {
  const meta = STATUS_META[status] ?? {
    label: status.replace(/_/g, " "),
    className: "bg-secondary text-muted-foreground border-border",
    icon: Clock,
  }
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${meta.className} ${className}`}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" />}
      {meta.label}
    </span>
  )
}
