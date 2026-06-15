"use client"

import { Suspense } from "react"
import { HistoryContent } from "@/components/dashboard/history-content"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Loader2, ArrowLeft } from "lucide-react"
import { useRequireAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { motion } from "framer-motion"

export default function HistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth()

  // Show loading while checking auth
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </motion.div>
      <Suspense
        fallback={
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        }
      >
        <HistoryContent />
      </Suspense>
    </DashboardLayout>
  )
}
