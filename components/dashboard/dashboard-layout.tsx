"use client"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sparkles, LayoutDashboard, Play, FileText, Settings, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Interview", href: "/interview/setup", icon: Play },
  { name: "History", href: "/dashboard/history", icon: FileText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

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
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          <span className="font-semibold text-foreground">AI Interview Master</span>
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
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const storedName = localStorage.getItem("aiInterviewUserName") || ""
    const storedEmail = localStorage.getItem("aiInterviewUserEmail") || ""
    setUserName(storedName)
    setUserEmail(storedEmail)
  }, [])

  const getInitials = (name: string, email: string) => {
    const cleanedName = name.trim()
    if (cleanedName) {
      const parts = cleanedName.split(/\s+/)
      return parts
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join("")
    }
    const cleanedEmail = email.trim()
    if (cleanedEmail) {
      return cleanedEmail[0]?.toUpperCase() || "U"
    }
    return "U"
  }

  const initials = getInitials(userName, userEmail)
  const displayName = userName || userEmail || ""

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">AI Interview Master</span>
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
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3">
          <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-sm font-medium text-accent">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full mt-3 justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          asChild
        >
          <Link href="/login">
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </Link>
        </Button>
      </div>
    </div>
  )
}
