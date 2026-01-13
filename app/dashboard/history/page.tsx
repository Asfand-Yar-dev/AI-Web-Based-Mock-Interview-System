"use client"

import { Suspense } from "react"
import { HistoryContent } from "@/components/dashboard/history-content"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Loader2 } from "lucide-react"

export default function HistoryPage() {
  return (
    <DashboardLayout>
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
