"use client";

/**
 * Premium Live Interview — Become / Edit Interviewer Profile
 * Redesigned to match the dark design system.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Briefcase,
  Tag,
  Star,
  FileText,
  DollarSign,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  UserCircle,
  BrainCircuit,
} from "lucide-react";
import { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS } from "@/lib/api-config";
import { liveInterviewApi } from "@/lib/liveInterviewApi";
import { Button } from "@/components/ui/button";
import { PremiumLayout, PremiumBadge } from "@/components/live-interview/premium-layout";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AvailabilityRow {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const DEFAULT_AVAILABILITY: AvailabilityRow[] = DAY_NAMES.map((_, i) => ({
  enabled: i >= 1 && i <= 5, // Mon–Fri default
  startTime: "09:00",
  endTime: "23:59",
}));

const inputClass = "w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all";

function FieldLabel({ icon: Icon, label, required, hint }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export default function BecomeInterviewerPage() {
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [hasProfile, setHasProfile]   = useState(false);
  const [bio, setBio]                 = useState("");
  const [domains, setDomains]         = useState("frontend");
  const [skills, setSkills]           = useState("React, TypeScript, Node.js");
  const [roles, setRoles]             = useState("Frontend Engineer");
  const [hourlyRate, setHourlyRate]   = useState(50);
  const [availability, setAvailability] = useState<AvailabilityRow[]>(DEFAULT_AVAILABILITY);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  useEffect(() => {
    async function loadExisting() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
        if (!token) { router.push("/login"); return; }
        
        const data = await liveInterviewApi.getMyInterviewerProfile();
        const p = data.data;
        if (p) {
          setHasProfile(true);
          setBio(p.bio || "");
          setDomains((p.domains || []).join(", "));
          setSkills((p.skills || []).join(", "));
          setRoles((p.roles || []).join(", "));
          setHourlyRate(typeof p.hourlyRate === "number" ? p.hourlyRate : 50);
          if (Array.isArray(p.availability) && p.availability.length > 0) {
            const next: AvailabilityRow[] = DAY_NAMES.map((_, i) => {
              const slot = p.availability.find((a: any) => a.dayOfWeek === i);
              return slot
                ? { enabled: true, startTime: slot.startTime, endTime: slot.endTime }
                : { enabled: false, startTime: "09:00", endTime: "17:00" };
            });
            setAvailability(next);
          }
        }
      } catch { /* no existing profile — fine */ }
      finally { setPageLoading(false); }
    }
    loadExisting();
  }, [router]);

  function toggleDay(idx: number) {
    setAvailability((prev) => prev.map((row, i) => i === idx ? { ...row, enabled: !row.enabled } : row));
  }
  function setDayTime(idx: number, key: "startTime" | "endTime", value: string) {
    setAvailability((prev) => prev.map((row, i) => i === idx ? { ...row, [key]: value } : row));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      const payload = {
        bio,
        domains: domains.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
        skills:  skills.split(",").map((s) => s.trim()).filter(Boolean),
        roles:   roles.split(",").map((s) => s.trim()).filter(Boolean),
        hourlyRate: Number(hourlyRate),
        isAcceptingBookings: true, // always discoverable after saving
        availability: availability
          .map((row, i) => row.enabled ? { dayOfWeek: i, startTime: row.startTime, endTime: row.endTime } : null)
          .filter(Boolean),
      };
      await liveInterviewApi.upsertMyInterviewerProfile(payload);
      setHasProfile(true);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to save profile");
    } finally {
      setBusy(false);
    }
  }

  if (pageLoading) {
    return (
      <PremiumLayout backHref="/dashboard" backLabel="Dashboard">
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        </div>
      </PremiumLayout>
    );
  }

  return (
    <PremiumLayout backHref={hasProfile ? "/interviewer-dashboard" : "/dashboard"} backLabel={hasProfile ? "My Dashboard" : "Dashboard"}>
      {/* Header */}
      <div className="mb-8 space-y-2">
        <PremiumBadge />
        <h1 className="text-3xl font-bold text-foreground">
          {hasProfile ? "Edit Your Interviewer Profile" : "Become an Interviewer"}
        </h1>
        <p className="text-muted-foreground">
          {hasProfile
            ? "Update your availability and skills. Changes go live immediately."
            : "Tell applicants what you can interview for and when you're available. The system uses this to auto-match bookings."}
        </p>
      </div>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Profile info card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border/40 pb-4">
            <UserCircle className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold text-card-foreground">Profile Information</h2>
          </div>

          {/* Bio */}
          <div>
            <FieldLabel icon={FileText} label="Short Bio" hint="Shown to applicants when you're matched to their booking." />
            <textarea
              className={inputClass}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Senior frontend engineer with 8 years of React experience…"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Domains */}
            <div>
              <FieldLabel icon={Briefcase} label="Domains (comma-separated)" required hint="e.g. frontend, backend, data" />
              <input className={inputClass} value={domains} onChange={(e) => setDomains(e.target.value)} required />
            </div>

            {/* Skills */}
            <div>
              <FieldLabel icon={Tag} label="Skills (comma-separated)" required />
              <input className={inputClass} value={skills} onChange={(e) => setSkills(e.target.value)} required />
            </div>

            {/* Roles */}
            <div>
              <FieldLabel icon={Star} label="Roles you can interview for" required hint="Comma-separated" />
              <input className={inputClass} value={roles} onChange={(e) => setRoles(e.target.value)} required />
            </div>

            {/* Hourly rate */}
            <div>
              <FieldLabel icon={DollarSign} label="Hourly Rate (USD)" required />
              <input
                type="number"
                min={0}
                step={5}
                className={inputClass}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        {/* Availability card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center gap-2 border-b border-border/40 pb-4 mb-5">
            <Calendar className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Weekly Availability</h2>
              <p className="text-xs text-muted-foreground">Toggle which days you're available and set your hours.</p>
            </div>
          </div>

          <div className="space-y-3">
            {availability.map((row, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${row.enabled ? "bg-secondary/30" : "bg-secondary/10 opacity-60"}`}>
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex h-9 w-16 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    row.enabled
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-secondary text-muted-foreground border border-border/40"
                  }`}
                >
                  {DAY_NAMES[i]}
                </button>

                {/* Times */}
                <input
                  type="time"
                  className={`${inputClass} flex-1`}
                  value={row.startTime}
                  onChange={(e) => setDayTime(i, "startTime", e.target.value)}
                  disabled={!row.enabled}
                />
                <span className="text-xs text-muted-foreground shrink-0">to</span>
                <input
                  type="time"
                  className={`${inputClass} flex-1`}
                  value={row.endTime}
                  onChange={(e) => setDayTime(i, "endTime", e.target.value)}
                  disabled={!row.enabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Profile saved! Please complete your AI Vetting Audit next to verify your profile.
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={busy}
            className="flex-1 gap-2 bg-accent text-accent-foreground hover:bg-accent/90 py-5"
          >
            {busy ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> {hasProfile ? "Save Changes" : "Create Profile"}</>
            )}
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2 bg-purple-600 text-white hover:bg-purple-700 py-5"
            onClick={() => router.push("/live-interview/become-interviewer/vetting")}
          >
            <BrainCircuit className="h-4 w-4" /> Start AI Vetting
          </Button>
          {hasProfile && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={() => router.push("/interviewer-dashboard")}
            >
              Go to My Bookings
            </Button>
          )}
        </div>
      </motion.form>
    </PremiumLayout>
  );
}
