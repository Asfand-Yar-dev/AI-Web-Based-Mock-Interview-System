"use client"

import type React from "react"
import { Suspense, useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Play, FileText, Settings, LogOut, Menu, X, Users, ShieldCheck, BarChart3, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { liveInterviewApi } from "@/lib/liveInterviewApi"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Interview", href: "/interview/new", icon: Play },
  { name: "My Bookings", href: "/live-interview/my-bookings", icon: CalendarDays },
  { name: "View Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "History", href: "/dashboard/history", icon: FileText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

// Route the brand logo to whichever dashboard matches the user's role,
// so clicking it from any inner page lands them on their own home.
function roleHome(role?: string | null): string {
  const r = String(role || "").trim().toLowerCase()
  if (r === "interviewer") return "/interviewer-dashboard"
  if (r === "admin") return "/admin-dashboard"
  return "/dashboard"
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense fallback={null}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  )
}

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const homeHref = roleHome(user?.user_role)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href={homeHref} className="flex items-center gap-1.5">
          <Image
            src="/Logo_with_no_background.png"
            alt="Intervexa"
            width={64}
            height={64}
            className="object-contain"
          />
          <span className="font-display text-[22px] font-bold leading-none text-foreground">Intervexa</span>
        </Link>
      </header>

      {/* Mobile Sidebar Overlay */}
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
              <SidebarContent pathname={pathname} onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border/50 bg-sidebar lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72">
        <div className="min-h-screen p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}

function SidebarContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const { user, logout } = useAuth()
  const [pendingCount, setPendingCount] = useState<number>(0)

  const getInitials = (name?: string, email?: string) => {
    const cleanedName = name?.trim() || ""
    if (cleanedName) {
      const parts = cleanedName.split(/\s+/)
      return parts
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join("")
    }
    const cleanedEmail = email?.trim() || ""
    if (cleanedEmail) {
      return cleanedEmail[0]?.toUpperCase() || "U"
    }
    return "U"
  }

  const handleLogout = () => {
    if (onClose) onClose()
    logout()
  }

  const initials = getInitials(user?.name, user?.email)
  const displayName = user?.name || user?.email || "Applicant"
  const userEmail = user?.email || ""

  const userRole = String(user?.user_role || (user as any)?.role || "").trim().toLowerCase()
  const isInterviewer = userRole === "interviewer"
  const isAdmin = userRole === "admin"

  useEffect(() => {
    if (isInterviewer) {
      liveInterviewApi.myBookings("interviewer")
        .then((res) => {
          const count = (res.data ?? []).filter((b) => b.status === "pending_approval").length
          setPendingCount(count)
        })
        .catch((err) => console.error("Failed to fetch pending bookings count:", err))
    }
  }, [isInterviewer])

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-6">
        <Link href={roleHome(userRole)} className="flex items-center gap-1.5">
          <Image
            src="/Logo_with_no_background.png"
            alt="Intervexa"
            width={64}
            height={64}
            className="object-contain"
          />
          <span className="font-display text-[22px] font-bold leading-none text-sidebar-foreground">Intervexa</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        {(isInterviewer || isAdmin) && (
          <div className="mt-6 border-t border-sidebar-border pt-4 space-y-1">
            <p className="px-4 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">Switch Panel</p>
            {isInterviewer && (
              <Link
                href="/interviewer-dashboard"
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  pathname === "/interviewer-dashboard"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-accent" />
                  <span>Interviewer Panel</span>
                </div>
                {pendingCount > 0 && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin-dashboard"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  pathname === "/admin-dashboard"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <ShieldCheck className="h-5 w-5 text-accent" />
                Admin Panel
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3">
          <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
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
          className="w-full mt-3 justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
