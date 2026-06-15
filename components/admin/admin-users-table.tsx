"use client"

import { useState } from "react"
import { Search, Shield, UserRound, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
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
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase()),
      )
    : users

  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">User Accounts</h2>
          <p className="text-xs text-muted-foreground">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-border/50 bg-secondary/40 pl-9 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-secondary/10 py-12">
          <Users className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {query ? "No users match your search." : "No users found."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">User</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Sessions</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-secondary/20">
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
                        <UserRound className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-card-foreground">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
                      <Shield className="h-3 w-3" />
                      {capitalize(user.role)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        user.status === "active"
                          ? "bg-success/10 text-success"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {capitalize(user.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-card-foreground">{user.interviews}</td>
                  <td className="px-3 py-3.5 text-muted-foreground">{formatDate(user.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
