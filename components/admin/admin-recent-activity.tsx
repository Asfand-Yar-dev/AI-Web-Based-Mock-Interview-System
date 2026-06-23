"use client"

import { Activity, AlertCircle, CheckCircle2, Clock3 } from "lucide-react"

interface AdminActivity {
  id: string
  title: string
  detail: string
  time: string
  type: "success" | "warning" | "neutral"
}

interface AdminRecentActivityProps {
  items: AdminActivity[]
}

export function AdminRecentActivity({ items }: AdminRecentActivityProps) {
  const formatTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
  }

  return (
    <section className="rounded-[17px] border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-2">
        <Activity className="h-5 w-5 text-accent" />
        <h2 className="font-display text-lg font-semibold text-card-foreground">Recent Activity</h2>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-secondary/20 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {item.type === "success" && <CheckCircle2 className="h-4 w-4 text-success" />}
                {item.type === "warning" && <AlertCircle className="h-4 w-4 text-warning" />}
                {item.type === "neutral" && <Clock3 className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
            <p className="whitespace-nowrap text-xs text-muted-foreground">{formatTime(item.time)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
