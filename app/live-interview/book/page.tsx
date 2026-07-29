"use client";

/**
 * Premium Live Interview — Book Page (3-Step Wizard)
 *
 * Step 1: Browse & select an interviewer
 * Step 2: Choose date, time, role and duration
 * Step 3: Review & send booking request
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Briefcase,
  Tag,
  CalendarDays,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  CheckCircle2,
  Globe,
  Send,
} from "lucide-react";
import { liveInterviewApi } from "@/lib/liveInterviewApi";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { PremiumBadge } from "@/components/live-interview/premium-layout";
import { useRequireAuth } from "@/contexts/auth-context";

// ── Constants ─────────────────────────────────────────────────────────────────

const DOMAINS = [
  { value: "",            label: "All Domains" },
  { value: "frontend",   label: "Frontend Development" },
  { value: "backend",    label: "Backend Development" },
  { value: "fullstack",  label: "Full-Stack Development" },
  { value: "data",       label: "Data Science / ML" },
  { value: "mobile",     label: "Mobile Development" },
  { value: "devops",     label: "DevOps / SRE" },
  { value: "design",     label: "UI/UX Design" },
  { value: "product",    label: "Product Management" },
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "other",      label: "Other" },
];

// Standard options stay within 15–60 minutes; "Other" lets the user enter a
// custom duration (still bounded to the backend's 15–180 limit).
const DURATIONS = [15, 30, 45, 60];
const DURATION_MIN = 15;
const DURATION_MAX = 180;

function defaultScheduledTime() {
  const t = new Date(Date.now() + 2 * 60 * 60 * 1000);
  t.setMinutes(0, 0, 0);
  return t.toISOString().slice(0, 16);
}

const inputClass =
  "w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all";

// Same as inputClass, but with theme-aligned native dropdown options so the
// popup matches the app theme (light/dark) instead of the browser default.
const selectClass = `${inputClass} cursor-pointer [&>option]:bg-card [&>option]:text-card-foreground`;

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "Configure Booking" },
    { n: 2, label: "Confirm & Send" },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                s.n < current
                  ? "bg-accent text-accent-foreground"
                  : s.n === current
                  ? "bg-accent/20 border-2 border-accent text-accent"
                  : "bg-secondary text-muted-foreground border border-border/50"
              }`}
            >
              {s.n < current ? <CheckCircle2 className="h-4 w-4" /> : s.n}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                s.n === current ? "text-accent font-medium" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-px mx-2 mb-5 transition-colors ${
                s.n < current ? "bg-accent/50" : "bg-border/30"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}



// ── Summary row ────────────────────────────────────────────────────────────────

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-card-foreground max-w-[60%] text-right">{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BookLiveInterviewPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();

  const [step, setStep] = useState(1);

  // Configure Booking state
  // Start empty so the placeholder acts as a sample — nothing to erase first.
  const [role, setRole]                   = useState("");
  const [skills, setSkills]               = useState("");
  const [domain, setDomain]               = useState("frontend");
  const [customDomain, setCustomDomain]   = useState("");
  const [scheduledTime, setScheduledTime] = useState(defaultScheduledTime);
  const [duration, setDuration]           = useState(45);
  const [isOtherDuration, setIsOtherDuration] = useState(false);
  const [customDuration, setCustomDuration]   = useState("");

  // Resolved values that account for the "Other" custom inputs.
  const finalDomain   = domain === "other" ? customDomain.trim().toLowerCase() : domain;
  const finalDuration = isOtherDuration ? Math.round(Number(customDuration)) : duration;

  // Submission state
  const [busy, setBusy]   = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNextStep() {
    setError(null);
    
    if (!role.trim()) {
      setError("Target role is required");
      return;
    }
    if (!finalDomain) {
      setError("Please enter your domain");
      return;
    }
    if (!Number.isFinite(finalDuration) || finalDuration < DURATION_MIN || finalDuration > DURATION_MAX) {
      setError(`Session duration must be between ${DURATION_MIN} and ${DURATION_MAX} minutes`);
      return;
    }
    if (!scheduledTime) {
      setError("Preferred date & time is required");
      return;
    }

    const slot = new Date(scheduledTime);
    if (Number.isNaN(slot.getTime())) {
      setError("Invalid date & time format");
      return;
    }
    if (slot.getTime() < Date.now() + 5 * 60 * 1000) {
      setError("Preferred date & time must be at least 5 minutes in the future");
      return;
    }

    setValidating(true);
    try {
      const res = await liveInterviewApi.checkConflict({
        interviewerId: "auto",
        role,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        domain: finalDomain,
        scheduledTime: slot.toISOString(),
      });

      if (!res.available) {
        setError(res.message || "This slot is not available. Please choose another time.");
        return;
      }

      // If available, advance step
      setStep(step + 1);
    } catch (err: any) {
      setError(err?.message || "Slot verification failed. Please try again.");
    } finally {
      setValidating(false);
    }
  }

  async function submit() {
    if (!isAuthenticated) { router.push("/login"); return; }
    setError(null);
    setBusy(true);
    try {
      const res = await liveInterviewApi.requestBooking({
        interviewerId: "auto",
        role,
        domain: finalDomain,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        scheduledTime: new Date(scheduledTime).toISOString(),
        durationMinutes: finalDuration,
      });
      router.push(`/live-interview/my-bookings`);
    } catch (err: any) {
      setError(err?.message || "Booking request failed");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 space-y-2">
        <PremiumBadge />
        <h1 className="text-3xl font-bold text-foreground">Book a Live Interview</h1>
        <p className="text-muted-foreground">
          Pick a time, configure your session, and send your request.
        </p>
      </div>

      <StepIndicator current={step} />

      <AnimatePresence mode="wait">
        {/* ── Step 1: Auto-match Setup ──────────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Auto-Match Setup Form */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent" />
                Configure Your Live Interview
              </h2>

              {/* Role */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  Target Role <span className="text-destructive">*</span>
                </label>
                <input
                  className={inputClass}
                  value={role}
                  onChange={(e) => { setRole(e.target.value); setError(null); }}
                  placeholder="e.g. Senior Software Engineer"
                  required
                />
              </div>

              {/* Domain */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  Domain <span className="text-destructive">*</span>
                </label>
                <select
                  className={selectClass}
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setError(null); }}
                >
                  {DOMAINS.filter(d => d.value).map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                {/* Custom domain field shown when "Other" is selected */}
                {domain === "other" && (
                  <input
                    autoFocus
                    className={`${inputClass} mt-2`}
                    value={customDomain}
                    onChange={(e) => { setCustomDomain(e.target.value); setError(null); }}
                    placeholder="Enter your domain (e.g. Game Development, Embedded Systems)"
                  />
                )}
              </div>

              {/* Skills */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  Key Skills (comma-separated)
                </label>
                <input
                  className={inputClass}
                  value={skills}
                  onChange={(e) => { setSkills(e.target.value); setError(null); }}
                  placeholder="e.g. React, TypeScript, System Design"
                />
              </div>

              {/* Date & time */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Preferred Date &amp; Time <span className="text-destructive">*</span>
                </label>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={scheduledTime}
                  min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                  onChange={(e) => { setScheduledTime(e.target.value); setError(null); }}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">Must be at least 5 minutes from now.</p>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Session Duration <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setDuration(d); setIsOtherDuration(false); setError(null); }}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                        !isOtherDuration && duration === d
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border/50 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setIsOtherDuration(true); setError(null); }}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                      isOtherDuration
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border/50 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    Other
                  </button>
                </div>
                {/* Custom duration field shown when "Other" is selected */}
                {isOtherDuration && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      autoFocus
                      type="number"
                      min={DURATION_MIN}
                      max={DURATION_MAX}
                      value={customDuration}
                      onChange={(e) => { setCustomDuration(e.target.value); setError(null); }}
                      placeholder={`e.g. 75`}
                      className={`${inputClass} max-w-[140px]`}
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                )}
                {isOtherDuration && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter any duration between {DURATION_MIN} and {DURATION_MAX} minutes.
                  </p>
                )}
              </div>
            </div>

            {/* Error display on Step 1 */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </motion.div>
            )}

            <Button
              onClick={handleNextStep}
              disabled={!role.trim() || !scheduledTime || validating}
              className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-base font-semibold"
            >
              {validating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Checking Availability…
                </>
              ) : (
                <>
                  Review &amp; Continue
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* ── Step 2: Review & Send ──────────────── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h2 className="mb-4 text-base font-semibold text-card-foreground">Booking Summary (Auto-Match)</h2>
              <div className="divide-y divide-border/30">
                <SummaryRow icon={User}        label="Interviewer"  value="Assigned by System (Auto-Match)" />
                <SummaryRow icon={Briefcase}   label="Role"         value={role} />
                <SummaryRow icon={Globe}       label="Domain"       value={finalDomain || domain} />
                {skills && <SummaryRow icon={Tag} label="Skills"    value={skills} />}
                <SummaryRow
                  icon={CalendarDays}
                  label="Date"
                  value={new Date(scheduledTime).toLocaleDateString("en-GB", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                />
                <SummaryRow
                  icon={Clock}
                  label="Time"
                  value={new Date(scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                />
                <SummaryRow icon={Clock}    label="Duration"      value={`${finalDuration} minutes`} />
                <SummaryRow icon={Star}     label="Est. Cost"     value="Variable (Based on matched interviewer)" />
              </div>
            </div>

            {/* What happens next */}
            <div className="rounded-2xl border border-border/40 bg-secondary/20 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-card-foreground">What happens next?</h3>
              <div className="space-y-2">
                {[
                  { n: 1, text: "System searches for the best matching interviewer for your domain, skills, and time" },
                  { n: 2, text: "If found, your request is automatically sent to them for approval" },
                  { n: 3, text: "Once they accept (usually within a few hours), you'll be prompted to complete payment" },
                  { n: 4, text: "If no interviewer is available, you can try another time slot" },
                ].map((item) => (
                  <div key={item.n} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                      {item.n}
                    </span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-2 bg-transparent"
                disabled={busy}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={submit}
                disabled={busy}
                className="flex-1 gap-2 bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-base font-semibold"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Finding Match &amp; Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Confirm &amp; Book
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
