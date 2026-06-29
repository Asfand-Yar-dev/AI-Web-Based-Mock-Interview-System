"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PerformancePanel } from "@/components/dashboard/performance-panel";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw, Play } from "lucide-react";
import { useAuth, useRequireAuth } from "@/contexts/auth-context";
import { interviewApi, authApi, type InterviewSession } from "@/lib/api";
import { Button } from "@/components/ui/button";

// Map backend session to frontend format
interface DisplaySession {
  id: string;
  userId: string;
  jobTitle: string;
  sessionType?: string;
  interviewKind?: "ai" | "live";
  skills: string[];
  status: "pending" | "in-progress" | "completed";
  score?: number;
  createdAt: string;
  completedAt?: string;
}

function mapSessionToDisplay(session: InterviewSession): DisplaySession {
  return {
    id: session._id,
    userId: session.user_id,
    jobTitle: session.session_type || "Interview Session",
    skills: [],
    status: session.status === "ongoing" ? "in-progress" : session.status as DisplaySession["status"],
    score: session.overall_score,
    createdAt: session.createdAt,
    completedAt: session.end_time,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const { user } = useAuth();
  
  // Guard role: redirect interviewer accounts to /interviewer-dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const role = String(
        (user as any).user_role ?? (user as any).role ?? ""
      ).trim().toLowerCase();
      if (role === "interviewer") {
        router.replace("/interviewer-dashboard");
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    confidenceImprovement: 0,
    currentStreak: 0,
    recentSessions: [] as DisplaySession[],
  });

  const loadDashboardData = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;

    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const statsResponse = await authApi.getStats();

      if (statsResponse.success && statsResponse.data) {
        const { totalInterviews, averageScore, confidenceImprovement, currentStreak, recentSessions } = statsResponse.data;

        const mappedSessions: DisplaySession[] = recentSessions.map(session => ({
          id: session.id,
          userId: '',
          jobTitle: session.jobTitle || 'Interview Session',
          sessionType: session.sessionType,
          interviewKind: (session as any).interviewKind,
          skills: [],
          status: session.status === 'ongoing' ? 'in-progress' : session.status as DisplaySession['status'],
          score: session.score,
          createdAt: session.date,
          completedAt: undefined,
        }));

        setStats({
          totalInterviews,
          averageScore,
          confidenceImprovement,
          currentStreak,
          recentSessions: mappedSessions,
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        setStats({ totalInterviews: 0, averageScore: 0, confidenceImprovement: 0, currentStreak: 0, recentSessions: [] });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      loadDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, loadDashboardData]);

  // Silently refetch when user switches back to this tab (e.g. after booking)
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadDashboardData(true);
    };
    // Also listen for booking_updated_at written by the booking success page
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "booking_updated_at") loadDashboardData(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isAuthenticated, loadDashboardData]);

  // Silent poll every 30 s while tab is active
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadDashboardData(true);
    }, 30000);
    return () => clearInterval(id);
  }, [isAuthenticated, loadDashboardData]);

  // Show loading while checking auth or loading data
  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Don't render if not authenticated (redirect is happening)
  if (!isAuthenticated) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Failed to Load Dashboard</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={loadDashboardData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const userName = user?.name || "";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              {userName ? `Welcome back, ${userName}` : "Welcome back"}
            </h1>
            <p className="text-muted-foreground mt-1.5">
              Ready to practice? Your interview skills are improving every day.
            </p>
          </div>
          <Link
            href="/interview/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4.5 py-3 text-sm font-semibold text-accent-foreground shadow-[0_10px_26px_-12px_var(--glow)] transition-transform hover:-translate-y-0.5"
          >
            <Play className="h-[15px] w-[15px] fill-current" />
            New interview
          </Link>
        </motion.div>

        {/* Stats Cards */}
        <StatsCards
          totalInterviews={stats.totalInterviews}
          averageScore={stats.averageScore}
          confidenceImprovement={stats.confidenceImprovement}
          currentStreak={stats.currentStreak}
        />

        {/* Performance trend + Skill breakdown */}
        <PerformancePanel
          latestCompletedId={stats.recentSessions.find((s) => s.status === "completed")?.id}
        />

        {/* Recent Sessions */}
        <RecentSessions sessions={stats.recentSessions} />
      </div>
    </DashboardLayout>
  );
}
