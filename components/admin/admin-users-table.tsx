"use client"

import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  status: "active" | "inactive"
  interviews: number
  joined: string
}

interface AdminUsersTableProps {
  users: AdminUser[]
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  if (users.length === 0) {
    return (
      <section className="rounded-[17px] border border-border bg-card">
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Users className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-[17px] border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/20">
              <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">User</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Role</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Interviews</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-secondary/20">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                      {initials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-card-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "font-medium",
                      user.role.toLowerCase() === "interviewer"
                        ? "text-accent"
                        : "text-muted-foreground",
                    )}
                  >
                    {capitalize(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-card-foreground tabular-nums">{user.interviews}</td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      user.status === "active"
                        ? "bg-success/15 text-success"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {capitalize(user.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  )
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
