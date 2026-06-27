"use client"

import type React from "react"
import { Suspense, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  LayoutDashboard,
  CalendarDays,
  UserCircle,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { liveInterviewApi } from "@/lib/liveInterviewApi"
import { useBookingRealtime } from "@/hooks/use-booking-realtime"

export type InterviewerTab = "overview" | "bookings" | "profile" | "history" | "settings"

const NAV_ITEMS: Array<{
  id: InterviewerTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  { id: "overview",  label: "Dashboard",   icon: LayoutDashboard, description: "Stats and upcoming sessions" },
  { id: "bookings",  label: "My Bookings", icon: CalendarDays,    description: "Assigned interview bookings" },
  { id: "profile",   label: "My Profile",  icon: UserCircle,      description: "Edit your interviewer profile" },
  { id: "history",   label: "History",     icon: History,         description: "Completed sessions" },
  { id: "settings",  label: "Settings",    icon: Settings,        description: "Account preferences" },
]

interface InterviewerLayoutProps {
  children: React.ReactNode
  activeTab: InterviewerTab
  onTabChange: (tab: InterviewerTab) => void
  title: string
  subtitle: string
}

export function InterviewerLayout(props: InterviewerLayoutProps) {
  return (
    <Suspense fallback={null}>
      <InterviewerLayoutInner {...props} />
    </Suspense>
  )
}

function InterviewerLayoutInner({
  children,
  activeTab,
  onTabChange,
  title,
  subtitle,
}: InterviewerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* ── Mobile Header ── */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/interviewer-dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-accent-strong shadow-[0_0_18px_var(--glow)]">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground">Intervexa</span>
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border/50 bg-sidebar lg:hidden"
            >
              <SidebarContent
                activeTab={activeTab}
                onTabChange={(tab) => { onTabChange(tab); setSidebarOpen(false) }}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-border/50 bg-sidebar lg:flex">
        <SidebarContent activeTab={activeTab} onTabChange={onTabChange} />
      </aside>

      {/* ── Main Content ── */}
      <div className="flex min-h-screen flex-col lg:pl-[260px]">
        {/* Top header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl lg:px-8">
          <div>
            <h1 className="font-display text-lg font-semibold text-foreground">{title}</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function SidebarContent({
  activeTab,
  onTabChange,
  onClose,
}: {
  activeTab: InterviewerTab
  onTabChange: (tab: InterviewerTab) => void
  onClose?: () => void
}) {
  const { user, logout } = useAuth()
  const [pendingCount, setPendingCount] = useState<number>(0)

  const getInitials = (name?: string, email?: string) => {
    const n = name?.trim() || ""
    if (n) return n.split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join("")
    return email?.[0]?.toUpperCase() || "I"
  }

  const handleLogout = () => {
    if (onClose) onClose()
    logout()
  }

  const initials   = getInitials(user?.name, user?.email)
  const displayName = user?.name || user?.email || "Interviewer"
  const userEmail  = user?.email || ""

  const refreshPendingCount = useCallback(() => {
    liveInterviewApi.myBookings("interviewer")
      .then((res) => {
        const count = (res.data ?? []).filter((b) => b.status === "pending_approval").length
        setPendingCount(count)
      })
      .catch((err) => console.error("Failed to fetch pending bookings count:", err))
  }, [])

  useEffect(() => { refreshPendingCount() }, [refreshPendingCount])

  // Keep the "pending approval" badge live as new requests arrive / are answered.
  useBookingRealtime(refreshPendingCount)

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
        <Link href="/interviewer-dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-accent-strong shadow-[0_0_18px_var(--glow)]">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          <span className="font-display font-semibold text-sidebar-foreground">Intervexa</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role badge */}
      <div className="px-5 pt-4 pb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Interviewer Panel
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left group",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </div>
              {item.id === "bookings" && pendingCount > 0 ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              ) : isActive ? (
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              ) : null}
            </button>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3">
          <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden shrink-0">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={displayName}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-sm font-medium text-accent">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
