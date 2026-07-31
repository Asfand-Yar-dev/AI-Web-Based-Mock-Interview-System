"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  MessageSquare,
  ShieldCheck,
  Activity,
  LogOut,
} from "lucide-react"
import { useAuth, useRequireAuth } from "@/contexts/auth-context"
import { AdminUsersTable } from "@/components/admin/admin-users-table"
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity"
import { AdminSystemStatus } from "@/components/admin/admin-system-status"
import { AdminStatsCards } from "@/components/admin/admin-stats-cards"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { useCallback, useEffect, useState } from "react"
import { adminApi, type AdminDashboardResponse } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  XAxis, YAxis, Tooltip, Legend,
  LabelList,
} from "recharts"

type AdminDashboardData = AdminDashboardResponse["data"]
type AdminTab = "overview" | "users" | "analytics" | "feedback" | "security" | "settings"

const ADMIN_TABS: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings },
]

const TAB_TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Platform-wide usage and activity at a glance" },
  users: { title: "Users", subtitle: "Monitor registered accounts and their activity" },
  analytics: { title: "Analytics", subtitle: "Distribution breakdowns across users and sessions" },
  feedback: { title: "Feedback", subtitle: "Track feedback quality and flagged sessions" },
  security: { title: "Security", subtitle: "Role-based access overview and policy status" },
  settings: { title: "Settings", subtitle: "Platform configuration and feature toggles" },
}

const defaultAdminData: AdminDashboardData = {
  stats: {
    totalUsers: 0,
    freeUsers: 0,
    premiumUsers: 0,
    totalInterviews: 0,
    completionRate: 0,
    activeUsers: 0,
    ongoingInterviews: 0,
    cancelledInterviews: 0,
    pendingInterviews: 0,
    totalAnswers: 0,
    newUsersLast30Days: 0,
  },
  interviewee: {
    users: 0,
    usersInInterview: 0,
    totalInterviews: 0,
    premiumInterviews: { withBot: 0 },
  },
  analytics: {
    roleDistribution: {},
    statusDistribution: {},
    difficultyDistribution: {},
    sessionTypeDistribution: {},
  },
  adminSettings: {
    environment: 'development',
    port: '5000',
    aiEnabled: false,
    whisperModel: 'base',
    jwtExpiry: '24h',
    jwtRefreshExpiry: '7d',
    rateLimit: 100,
    rateLimitWindowMinutes: 15,
    authRateLimit: 10,
    corsOrigin: '',
    bcryptRounds: 12,
    logLevel: 'info',
    maxFileSizeMb: 10,
    bodySizeLimitMb: 500,
    aiServiceUrl: 'http://localhost:8000',
    aiTimeoutSeconds: 30,
    aiMaxRetries: 2,
    useNlpAi: false,
    useVocalAi: false,
    useFacialAi: false,
    useSttAi: false,
    groqConfigured: false,
    googleConfigured: false,
    mongoHost: '—',
    notifyOnCriticalDegradation: false,
  },
  feedbackMonitoring: {
    averageFeedbackScore: 0,
    lowFeedbackAlerts: 0,
    positiveFeedbackRate: 0,
    recentFlaggedSessions: [],
  },
  securityAccessControl: {
    adminUsers: 0,
    activeSessions: 0,
    blockedUsers: 0,
    accessPolicies: [],
  },
  users: [],
  recentActivity: [],
  services: [],
}

function normalizeAdminData(payload: Partial<AdminDashboardData> | null | undefined): AdminDashboardData {
  return {
    ...defaultAdminData,
    ...payload,
    stats: { ...defaultAdminData.stats, ...(payload?.stats ?? {}) },
    interviewee: {
      ...defaultAdminData.interviewee,
      ...(payload?.interviewee ?? {}),
      premiumInterviews: {
        ...defaultAdminData.interviewee.premiumInterviews,
        ...(payload?.interviewee?.premiumInterviews ?? {}),
      },
    },
    analytics: { ...defaultAdminData.analytics, ...(payload?.analytics ?? {}) },
    adminSettings: { ...defaultAdminData.adminSettings, ...(payload?.adminSettings ?? {}) },
    feedbackMonitoring: {
      ...defaultAdminData.feedbackMonitoring,
      ...(payload?.feedbackMonitoring ?? {}),
      recentFlaggedSessions: payload?.feedbackMonitoring?.recentFlaggedSessions ?? [],
    },
    securityAccessControl: {
      ...defaultAdminData.securityAccessControl,
      ...(payload?.securityAccessControl ?? {}),
      accessPolicies: payload?.securityAccessControl?.accessPolicies ?? [],
    },
    users: payload?.users ?? [],
    recentActivity: payload?.recentActivity ?? [],
    services: payload?.services ?? [],
  }
}

export default function AdminPage() {
  const { isAuthenticated, isLoading, user } = useRequireAuth()
  const { logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  const normalizedRole = String(
    user?.user_role ?? (user as { role?: string } | null)?.role ?? "",
  ).trim().toLowerCase()
  const isAdmin = normalizedRole === "admin"

  const adminInitials = (user?.name || user?.email || "A")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) router.replace("/dashboard")
  }, [isLoading, isAuthenticated, isAdmin, router])

  const loadDashboard = useCallback(async () => {
    setIsDashboardLoading(true)
    setDashboardError(null)
    try {
      const response = await adminApi.getDashboard()
      if (response.success && response.data) {
        setData(normalizeAdminData(response.data))
      } else {
        setDashboardError("Failed to load admin dashboard data.")
      }
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Failed to load admin dashboard data.")
    } finally {
      setIsDashboardLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && isAuthenticated && isAdmin) loadDashboard()
  }, [isLoading, isAuthenticated, isAdmin, loadDashboard])

  if (isLoading || (isAuthenticated && isAdmin && isDashboardLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading admin panel…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) return null

  if (dashboardError || !data) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-8">
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-border/50 bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h2 className="mt-3 text-xl font-semibold text-card-foreground">Could not load admin dashboard</h2>
          <p className="mt-2 text-sm text-muted-foreground">{dashboardError ?? "Unknown error"}</p>
          <Button onClick={loadDashboard} variant="outline" className="mt-5 bg-transparent">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const { title, subtitle } = TAB_TITLES[activeTab]

  return (
    <div className="min-h-screen bg-background">
      <div className="min-h-screen">

        {/* ── Sidebar ── */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-border/50 bg-sidebar lg:flex">
          {/* Brand */}
          <div className="flex h-20 items-center gap-1.5 border-b border-sidebar-border px-5">
            <Image
              src="/Logo_with_no_background.png"
              alt="Intervexa"
              width={64}
              height={64}
              className="object-contain"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-[22px] font-bold leading-none text-sidebar-foreground">Intervexa</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent">Admin</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 p-3">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-accent/10 text-accent"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3">
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-sidebar-accent/40 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/20">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user?.name || "Admin"}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xs font-semibold text-accent">{adminInitials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-sidebar-foreground">{user?.name || "Admin"}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex min-h-screen flex-col lg:pl-[260px]">
          {/* Top header */}
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl lg:px-8">
            <div>
              <h1 className="font-display text-lg font-semibold text-foreground">{title}</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={loadDashboard} className="gap-2 bg-transparent">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-6 lg:p-8">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview" && <OverviewTab data={data} />}
              {activeTab === "users" && <UsersTab data={data} />}
              {activeTab === "analytics" && <AnalyticsTab data={data} />}
              {activeTab === "feedback" && <FeedbackTab data={data} />}
              {activeTab === "security" && <SecurityTab data={data} />}
              {activeTab === "settings" && <SettingsTab data={data} />}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-6">
      <AdminStatsCards
        totalUsers={data.stats.totalUsers}
        totalInterviews={data.stats.totalInterviews}
        completionRate={data.stats.completionRate}
        activeUsers={data.stats.activeUsers}
        totalAnswers={data.stats.totalAnswers}
        newUsersLast30Days={data.stats.newUsersLast30Days}
        ongoingInterviews={data.stats.ongoingInterviews}
        cancelledInterviews={data.stats.cancelledInterviews}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminRecentActivity
            items={data.recentActivity.map((item: any) => ({
              id: item.id,
              title: item.title || 'Unknown Activity',
              detail: item.detail || 'No details provided',
              time: item.time || new Date().toISOString(),
              type: (item.type as "success" | "warning" | "neutral") || "neutral",
            }))}
          />
        </div>
        <div>
          <AdminSystemStatus
            services={data.services.map((s, idx) => ({
              id: s.name.toLowerCase().replace(/\s+/g, "-") || `service-${idx}`,
              name: s.name,
              status: s.status as any,
              latency: s.latency !== undefined ? String(s.latency) : "N/A",
            }))}
          />
        </div>
      </div>
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────

function UsersTab({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor registered accounts and their activity.
        </p>
      </div>
      <AdminUsersTable
        users={data.users
          .filter((u) => u.role !== "admin")
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status as any,
            interviews: u.interviewCount,
            joined: u.createdAt,
          }))}
      />
    </div>
  )
}

// ── Analytics ─────────────────────────────────────────────────────────────────

// Brand-aligned chart palette (concrete hex — recharts/SVG can't read CSS vars).
// Mirrors the emerald token set in globals.css for a cohesive look.
const V = {
  accent: "#2fe39e",
  success: "#34d399",
  warning: "#f5c451",
  danger: "#ff6b6b",
  info: "#56b6ff",
  lime: "#a3e635",
  teal: "#2dd4bf",
}
// Recharts neutral tokens (grid / ticks / labels)
const GRID = "rgba(120,210,170,0.14)"
const TICK = "#7c9488"
const TRACK = "rgba(120,210,170,0.10)"

const ROLE_COLORS: Record<string, string> = {
  User: V.accent,
  Admin: V.info,
  Unknown: V.teal,
}

const STATUS_COLORS: Record<string, string> = {
  Completed: V.success,
  Ongoing: V.info,
  Pending: V.warning,
  Cancelled: V.danger,
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: V.success,
  Medium: V.warning,
  Hard: V.danger,
}

const TYPE_COLORS = [V.accent, V.info, V.success, V.lime, V.teal, V.warning]

// Shared tooltip style — white bg, no black
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-lg text-xs">
      {label && <p className="mb-1 font-semibold text-card-foreground">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill ?? p.color }} className="font-medium">
          {p.name !== "value" ? `${p.name}: ` : ""}{p.value}
        </p>
      ))}
    </div>
  )
}

// Shared legend
function ColorLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  )
}

// Vertical bar chart with value labels and individual bar colors
function ProBarChart({
  data, colorMap, palette,
}: {
  data: { name: string; value: number }[]
  colorMap?: Record<string, string>
  palette?: string[]
}) {
  const cfg: ChartConfig = {}
  return (
    <ChartContainer config={cfg} className="h-[240px] w-full">
      <BarChart data={data} barCategoryGap="35%" margin={{ top: 18, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" opacity={0.6} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: TICK }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: TICK }}
          width={28}
        />
        <Tooltip content={<ChartTip />} cursor={{ fill: TRACK, opacity: 0.6 }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          <LabelList
            dataKey="value"
            position="top"
            style={{ fontSize: 11, fontWeight: 600, fill: TICK }}
          />
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={colorMap?.[entry.name] ?? palette?.[i % palette.length] ?? TYPE_COLORS[i % TYPE_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// Horizontal bar chart
function HorizontalBarChart({
  data, colorMap, palette,
}: {
  data: { name: string; value: number }[]
  colorMap?: Record<string, string>
  palette?: string[]
}) {
  const cfg: ChartConfig = {}
  return (
    <ChartContainer config={cfg} className="h-[240px] w-full">
      <BarChart
        data={data}
        layout="vertical"
        barCategoryGap="30%"
        margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" opacity={0.6} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: TICK }}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: TICK }}
          width={72}
        />
        <Tooltip content={<ChartTip />} cursor={{ fill: TRACK, opacity: 0.6 }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          <LabelList
            dataKey="value"
            position="right"
            style={{ fontSize: 11, fontWeight: 600, fill: TICK }}
          />
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={colorMap?.[entry.name] ?? palette?.[i % palette.length] ?? TYPE_COLORS[i % TYPE_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// Donut chart with center total + legend
function DonutChart({
  data, colorMap, palette,
}: {
  data: { name: string; value: number }[]
  colorMap?: Record<string, string>
  palette?: string[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const cfg: ChartConfig = {}
  const legendItems = data.map((d, i) => ({
    name: d.name,
    color: colorMap?.[d.name] ?? palette?.[i % (palette?.length ?? 1)] ?? TYPE_COLORS[i % TYPE_COLORS.length],
  }))

  return (
    <div>
      <ChartContainer config={cfg} className="h-[200px] w-full">
        <PieChart>
          <Tooltip content={<ChartTip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={88}
            innerRadius={54}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={colorMap?.[entry.name] ?? palette?.[i % (palette?.length ?? 1)] ?? TYPE_COLORS[i % TYPE_COLORS.length]}
              />
            ))}
          </Pie>
          {/* Center label rendered via foreignObject workaround — use absolute overlay instead */}
        </PieChart>
      </ChartContainer>
      {/* Center total overlay */}
      <div className="-mt-[132px] flex flex-col items-center justify-center pb-[68px] pointer-events-none">
        <span className="font-display text-2xl font-bold text-card-foreground">{total}</span>
        <span className="text-xs text-muted-foreground">Total</span>
      </div>
      <ColorLegend items={legendItems} />
    </div>
  )
}

function AnalyticsTab({ data }: { data: AdminDashboardData }) {
  const toChartData = (obj: Record<string, number>) =>
    Object.entries(obj)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: capitalize(name), value }))

  const { stats, feedbackMonitoring: fb, analytics } = data

  // Exclude 'Ongoing' — those haven't finished yet, not an outcome
  const statusData = toChartData(analytics.statusDistribution).filter(d => d.name !== 'Ongoing')
  const typeData = toChartData(analytics.sessionTypeDistribution)
  const difficultyData = toChartData(analytics.difficultyDistribution)

  // Platform KPI cards — use CSS chart variables so they follow the theme
  // (blue shades in light, green shades in dark)
  const kpis = [
    {
      label: "Avg Platform Score",
      value: `${fb.averageFeedbackScore}%`,
      sub: "Across all completed sessions",
      color: "var(--accent)",
    },
    {
      label: "Positive Session Rate",
      value: `${fb.positiveFeedbackRate}%`,
      sub: "Sessions scored ≥ 80%",
      color: "var(--success)",
    },
    {
      label: "Low Score Alerts",
      value: fb.lowFeedbackAlerts,
      sub: "Sessions scored below 50%",
      color: "var(--info)",
    },
    {
      label: "In Interview Now",
      value: data.interviewee.usersInInterview,
      sub: "Users in an active session",
      color: "var(--warning)",
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-[16px] border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</p>
                <p className="mt-2 font-display text-3xl font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
              </div>
              {/* hex-alpha bg works in both light & dark mode */}
              <div
                className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center"
                style={{ background: `${k.color}22` }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: k.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Session Outcomes + Difficulty Breakdown */}
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard
            title="Session Outcomes"
            subtitle="Completed, cancelled, and pending sessions"
          >
            {statusData.length > 0
              ? <DonutChart data={statusData} colorMap={STATUS_COLORS} />
              : <EmptyState message="No finished sessions yet." />}
          </ChartCard>
        </div>
        <div className="xl:col-span-2">
          <ChartCard
            title="Difficulty Breakdown"
            subtitle="Sessions by selected difficulty"
          >
            {difficultyData.length > 0
              ? <DonutChart data={difficultyData} colorMap={DIFFICULTY_COLORS} />
              : <EmptyState message="No difficulty data yet." />}
          </ChartCard>
        </div>
      </div>

      {/* Interview Type Popularity — full width */}
      <ChartCard
        title="Interview Type Popularity"
        subtitle="Which interview modes users prefer most"
      >
        {typeData.length > 0
          ? <ProBarChart data={typeData} palette={TYPE_COLORS} />
          : <EmptyState message="No session type data yet." />}
      </ChartCard>
    </div>
  )
}

// ── Feedback ──────────────────────────────────────────────────────────────────

function FeedbackTab({ data }: { data: AdminDashboardData }) {
  const { feedbackMonitoring: fb } = data

  return (
    <div className="space-y-6">
      <section className="rounded-[17px] border border-border bg-card p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Flagged Sessions</h2>
              <p className="text-xs text-muted-foreground">Sessions that scored below 50% and need attention</p>
            </div>
          </div>
          {fb.recentFlaggedSessions.length > 0 && (
            <span className="shrink-0 rounded-full bg-destructive/10 px-3 py-0.5 text-xs font-semibold text-destructive">
              {fb.recentFlaggedSessions.length} flagged
            </span>
          )}
        </div>

        {fb.recentFlaggedSessions.length === 0 ? (
          <EmptyState message="No flagged sessions — all feedback looks healthy." />
        ) : (
          <div className="space-y-3">
            {fb.recentFlaggedSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-card-foreground">{capitalize(session.sessionType)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <ScoreBadge score={session.score} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Security ──────────────────────────────────────────────────────────────────

function SecurityTab({ data }: { data: AdminDashboardData }) {
  const { securityAccessControl: sec } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Blocked Users" value={sec.blockedUsers} />
        <MetricCard label="Ongoing Sessions" value={sec.activeSessions} />
      </div>

      <section className="rounded-[17px] border border-border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-card-foreground">Access Policies</h2>
          <p className="text-xs text-muted-foreground">Configured permission rules</p>
        </div>

        {sec.accessPolicies.length === 0 ? (
          <EmptyState message="No access policies configured." />
        ) : (
          <div className="space-y-2">
            {sec.accessPolicies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-4 py-3"
              >
                <p className="text-sm text-card-foreground">{policy.name}</p>
                <StatusPill status={policy.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  value,
  pill,
  on,
}: {
  label: string
  description: string
  value: string
  pill?: boolean
  on?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-secondary/20 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-card-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {pill ? (
        <StatusPill status={on ? "active" : "disabled"} />
      ) : (
        <span className="shrink-0 rounded-lg border border-border/40 bg-background px-2.5 py-1 font-mono text-xs text-card-foreground">
          {value}
        </span>
      )}
    </div>
  )
}

function SettingsSection({ title, rows }: { title: string; rows: Parameters<typeof SettingRow>[0][] }) {
  return (
    <section className="rounded-[17px] border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold text-card-foreground">{title}</h2>
      <div className="space-y-2">
        {rows.map((r) => <SettingRow key={r.label} {...r} />)}
      </div>
    </section>
  )
}

function SettingsTab({ data }: { data: AdminDashboardData }) {
  const s = data.adminSettings

  return (
    <div className="space-y-6">
      {/* Live snapshot note */}
      <p className="text-xs text-muted-foreground">
        Live snapshot from the backend environment — edit{" "}
        <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">.env</code> to change values.
        Credentials and secrets are masked.
      </p>

      {/* ── Server ── */}
      <SettingsSection
        title="Server"
        rows={[
          { label: "Environment", description: "Runtime mode of the backend server", value: s.environment, pill: true, on: s.environment === "production" },
          { label: "Port", description: "Port the backend API listens on", value: s.port },
          { label: "Log Level", description: "Verbosity of the server logger", value: s.logLevel },
          { label: "MongoDB Host", description: "Database connection host (credentials masked)", value: s.mongoHost },
          { label: "Body Size Limit", description: "Max request body the server will accept", value: `${s.bodySizeLimitMb} MB` },
          { label: "Max File Upload", description: "Max single file upload size", value: `${s.maxFileSizeMb} MB` },
        ]}
      />

      {/* ── Auth & Security ── */}
      <SettingsSection
        title="Auth & Security"
        rows={[
          { label: "JWT Token Expiry", description: "How long access tokens are valid", value: s.jwtExpiry },
          { label: "JWT Refresh Expiry", description: "How long refresh tokens are valid", value: s.jwtRefreshExpiry },
          { label: "Bcrypt Salt Rounds", description: "Password hashing cost factor (higher = slower)", value: `${s.bcryptRounds} rounds` },
          { label: "Google OAuth", description: "Whether a Google Client ID is configured", value: s.googleConfigured ? "Configured" : "Not configured", pill: true, on: s.googleConfigured },
          { label: "CORS Origin", description: "Allowed frontend origin(s) for cross-origin requests", value: s.corsOrigin || "—" },
        ]}
      />

      {/* ── Rate Limiting ── */}
      <SettingsSection
        title="Rate Limiting"
        rows={[
          { label: "API Rate Limit", description: `Max requests per ${s.rateLimitWindowMinutes} min per IP`, value: `${s.rateLimit.toLocaleString()} req / ${s.rateLimitWindowMinutes} min` },
          { label: "Auth Rate Limit", description: `Max login/register attempts per ${s.rateLimitWindowMinutes} min`, value: `${s.authRateLimit} req / ${s.rateLimitWindowMinutes} min` },
          { label: "Rate Limit Window", description: "Rolling window for rate limit counters", value: `${s.rateLimitWindowMinutes} minutes` },
        ]}
      />

      {/* ── AI Pipeline ── */}
      <SettingsSection
        title="AI Pipeline"
        rows={[
          { label: "AI Analysis Pipeline", description: "Master toggle — gateway vs heuristic fallback", value: s.aiEnabled ? "Enabled" : "Disabled", pill: true, on: s.aiEnabled },
          { label: "AI Gateway URL", description: "Base URL of the Python AI gateway", value: s.aiServiceUrl },
          { label: "Gateway Timeout", description: "Max wait time for AI gateway responses", value: `${s.aiTimeoutSeconds}s` },
          { label: "Gateway Max Retries", description: "Retry attempts before falling back to heuristics", value: `${s.aiMaxRetries}` },
          { label: "Whisper Model", description: "Speech-to-text model size (STT)", value: s.whisperModel },
          { label: "NLP Analysis", description: "Natural language processing of interview answers", value: s.useNlpAi ? "Enabled" : "Disabled", pill: true, on: s.useNlpAi },
          { label: "Vocal Analysis", description: "Tone, pace and confidence from audio", value: s.useVocalAi ? "Enabled" : "Disabled", pill: true, on: s.useVocalAi },
          { label: "Facial Analysis", description: "Emotion and engagement detection from video", value: s.useFacialAi ? "Enabled" : "Disabled", pill: true, on: s.useFacialAi },
          { label: "Speech-to-Text", description: "Whisper-based transcription of spoken answers", value: s.useSttAi ? "Enabled" : "Disabled", pill: true, on: s.useSttAi },
          { label: "Groq API (LLM)", description: "Cloud LLM for question and feedback generation", value: s.groqConfigured ? "Configured" : "Not configured", pill: true, on: s.groqConfigured },
        ]}
      />

      {/* ── Alerts ── */}
      <SettingsSection
        title="Alerts"
        rows={[
          { label: "Critical Degradation Alerts", description: "Notify admins when a service degrades critically", value: s.notifyOnCriticalDegradation ? "Enabled" : "Disabled", pill: true, on: s.notifyOnCriticalDegradation },
        ]}
      />
    </div>
  )
}


function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[16px] border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-card-foreground">{value}</p>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[17px] border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function StatusPill({ status }: { status: string }) {
  const enabled = status === "enabled" || status === "active"
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        enabled ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground",
      )}
    >
      {capitalize(status)}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive"
  return <span className={cn("text-sm font-bold", color)}>{score}%</span>
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
