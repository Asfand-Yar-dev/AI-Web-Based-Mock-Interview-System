"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  UserCircle,
  Briefcase,
  Tag,
  Star,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { liveInterviewApi, type InterviewerProfile } from "@/lib/liveInterviewApi"

interface ProfilePayload {
  domain: string
  skills: string
  roles: string
  yearsOfExperience: string
  bio: string
  linkedIn: string
  hourlyRate: string
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface AvailabilityRow {
  enabled: boolean
  startTime: string
  endTime: string
}

const DEFAULT_AVAILABILITY: AvailabilityRow[] = DAY_NAMES.map((_, i) => ({
  enabled: i >= 1 && i <= 5, // Mon–Fri default
  startTime: "09:00",
  endTime: "17:00",
}))

const EMPTY_FORM: ProfilePayload = {
  domain: "",
  skills: "",
  roles: "",
  yearsOfExperience: "",
  bio: "",
  linkedIn: "",
  hourlyRate: "",
}

// Map a saved interviewer profile onto the form fields so editing starts from
// the existing data instead of a blank form.
function mapProfileToForm(p: InterviewerProfile): ProfilePayload {
  return {
    // Lowercase so the value matches the dropdown's option values even if the
    // stored domain was saved with different casing.
    domain: (p.domains?.[0] || "").toLowerCase(),
    skills: (p.skills || []).join(", "),
    roles: (p.roles || []).join(", "),
    yearsOfExperience: p.yearsOfExperience !== undefined && p.yearsOfExperience !== null ? String(p.yearsOfExperience) : "",
    bio: p.bio || "",
    linkedIn: p.linkedinUrl || "",
    hourlyRate: p.hourlyRate !== undefined ? String(p.hourlyRate) : "",
  }
}

function mapProfileToAvailability(p: InterviewerProfile): AvailabilityRow[] {
  if (!Array.isArray(p.availability) || p.availability.length === 0) return DEFAULT_AVAILABILITY
  return DAY_NAMES.map((_, i) => {
    const slot = p.availability.find((a) => a.dayOfWeek === i)
    return slot
      ? { enabled: true, startTime: slot.startTime, endTime: slot.endTime }
      : { enabled: false, startTime: "09:00", endTime: "17:00" }
  })
}

const DOMAINS = [
  "frontend",
  "backend",
  "fullstack",
  "data",
  "mobile",
  "devops",
  "design",
  "product",
  "cybersecurity",
  "other",
]

const DOMAIN_LABELS: Record<string, string> = {
  frontend:     "Frontend Development",
  backend:      "Backend Development",
  fullstack:    "Full-Stack Development",
  data:         "Data Science / ML",
  mobile:       "Mobile Development",
  devops:       "DevOps / SRE",
  design:       "UI/UX Design",
  product:      "Product Management",
  cybersecurity:"Cybersecurity",
  other:        "Other",
}

function FieldLabel({ icon: Icon, label, required }: { icon: React.ComponentType<{ className?: string }>; label: string; required?: boolean }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
      {required && <span className="text-destructive">*</span>}
    </label>
  )
}

interface InterviewerProfileFormProps {
  onSaved?: () => void
  /** Pre-loaded profile from the parent. When provided, the form pre-fills
   *  instantly and skips its own fetch — so editing never starts from blank. */
  initialProfile?: InterviewerProfile | null
}

export function InterviewerProfileForm({ onSaved, initialProfile }: InterviewerProfileFormProps) {
  const [form, setForm] = useState<ProfilePayload>(
    initialProfile ? mapProfileToForm(initialProfile) : EMPTY_FORM,
  )
  const [availability, setAvailability] = useState<AvailabilityRow[]>(
    initialProfile ? mapProfileToAvailability(initialProfile) : DEFAULT_AVAILABILITY,
  )
  // Only show the loading state when we have to fetch the profile ourselves.
  const [loadingProfile, setLoadingProfile] = useState(!initialProfile)
  const [busy, setBusy]       = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    // Parent already supplied the profile — nothing to fetch.
    if (initialProfile) {
      setForm(mapProfileToForm(initialProfile))
      setAvailability(mapProfileToAvailability(initialProfile))
      setLoadingProfile(false)
      return
    }
    async function loadProfile() {
      try {
        const res = await liveInterviewApi.getMyInterviewerProfile()
        const p = res.data
        if (p) {
          setForm(mapProfileToForm(p))
          setAvailability(mapProfileToAvailability(p))
        }
      } catch (err: any) {
        console.error("Failed to load interviewer profile:", err)
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [initialProfile])

  function patch(p: Partial<ProfilePayload>) {
    setForm((f) => ({ ...f, ...p }))
    setSuccess(false)
    setError(null)
  }

  function toggleDay(idx: number) {
    setAvailability((prev) => prev.map((row, i) => (i === idx ? { ...row, enabled: !row.enabled } : row)))
    setSuccess(false)
    setError(null)
  }

  function setDayTime(idx: number, key: "startTime" | "endTime", value: string) {
    setAvailability((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)))
    setSuccess(false)
    setError(null)
  }

  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="ml-2 text-sm text-muted-foreground">Loading profile data...</span>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.domain.trim()) { setError("Please select a domain."); return }
    if (!form.skills.trim()) { setError("Please enter at least one skill."); return }
    if (!form.hourlyRate || Number(form.hourlyRate) < 0) { setError("Please enter a valid hourly rate."); return }

    // Map form fields to backend schema field names
    const payload: Record<string, unknown> = {
      domains:             [form.domain.trim()],                                        // backend expects array
      roles:               form.roles.split(",").map((s) => s.trim()).filter(Boolean),  // backend expects array
      skills:              form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      hourlyRate:          Number(form.hourlyRate),                                      // backend field name
      isAcceptingBookings: true,                                                         // always visible in search
      bio:                 form.bio.trim() || undefined,
      linkedinUrl:         form.linkedIn.trim() || undefined,                            // backend field name
      yearsOfExperience:   form.yearsOfExperience.trim() ? Number(form.yearsOfExperience) : undefined,
      availability:        availability                                                  // weekly availability slots
        .map((row, i) => (row.enabled ? { dayOfWeek: i, startTime: row.startTime, endTime: row.endTime } : null))
        .filter(Boolean),
    }

    setBusy(true)
    setError(null)
    try {
      await liveInterviewApi.upsertMyInterviewerProfile(payload)
      setSuccess(true)
      if (onSaved) onSaved()
    } catch (err: any) {
      setError(err?.message || "Failed to save profile. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Card */}
      <div className="rounded-[17px] border border-border bg-card p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-4">
          <UserCircle className="h-5 w-5 text-accent" />
          <div>
            <h2 className="text-base font-semibold text-card-foreground">Interviewer Profile</h2>
            <p className="text-xs text-muted-foreground">
              This information is shown to applicants when you are matched to their booking.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Domain */}
          <div className="sm:col-span-2">
            <FieldLabel icon={Briefcase} label="Primary Domain" required />
            <select
              value={form.domain}
              onChange={(e) => patch({ domain: e.target.value })}
              className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            >
              <option value="">Select your domain…</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>{DOMAIN_LABELS[d] || d}</option>
              ))}
            </select>
          </div>

          {/* Skills */}
          <div className="sm:col-span-2">
            <FieldLabel icon={Tag} label="Skills (comma-separated)" required />
            <input
              type="text"
              placeholder="e.g. React, Node.js, System Design, Python"
              value={form.skills}
              onChange={(e) => patch({ skills: e.target.value })}
              className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              List the technologies and skills you can evaluate in interviews.
            </p>
          </div>

          {/* Roles */}
          <div className="sm:col-span-2">
            <FieldLabel icon={Briefcase} label="Roles You Interview For (comma-separated)" />
            <input
              type="text"
              placeholder="e.g. Senior Software Engineer, Frontend Developer, Full-Stack Engineer"
              value={form.roles}
              onChange={(e) => patch({ roles: e.target.value })}
              className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Applicants filter by these roles when searching for interviewers.
            </p>
          </div>

          {/* Years */}
          <div>
            <FieldLabel icon={Star} label="Years of Experience" />
            <input
              type="number"
              min={0}
              max={50}
              placeholder="e.g. 5"
              value={form.yearsOfExperience}
              onChange={(e) => patch({ yearsOfExperience: e.target.value })}
              className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>

          {/* Rate */}
          <div>
            <FieldLabel icon={Star} label="Rate per Hour (PKR)" required />
            <input
              type="number"
              min={0}
              placeholder="e.g. 5000"
              value={form.hourlyRate}
              onChange={(e) => patch({ hourlyRate: e.target.value })}
              className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>

          {/* LinkedIn */}
          <div className="sm:col-span-2">
            <FieldLabel icon={UserCircle} label="LinkedIn Profile URL" />
            <input
              type="url"
              placeholder="https://linkedin.com/in/your-profile"
              value={form.linkedIn}
              onChange={(e) => patch({ linkedIn: e.target.value })}
              className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>

          {/* Bio */}
          <div className="sm:col-span-2">
            <FieldLabel icon={FileText} label="Short Bio" />
            <textarea
              rows={4}
              placeholder="Tell applicants about your background, industry experience, and what makes you a great interviewer…"
              value={form.bio}
              onChange={(e) => patch({ bio: e.target.value })}
              className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none transition-all"
            />
          </div>
        </div>

        {/* Weekly Availability */}
        <div className="border-t border-border/40 pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            <div>
              <h3 className="text-base font-semibold text-card-foreground">Weekly Availability</h3>
              <p className="text-xs text-muted-foreground">
                Toggle the days you're available and set your hours. The system uses this to auto-match bookings.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {availability.map((row, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${row.enabled ? "bg-secondary/30" : "bg-secondary/10 opacity-60"}`}
              >
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
                <input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => setDayTime(i, "startTime", e.target.value)}
                  disabled={!row.enabled}
                  className="flex-1 rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all disabled:opacity-50"
                />
                <span className="text-xs text-muted-foreground shrink-0">to</span>
                <input
                  type="time"
                  value={row.endTime}
                  onChange={(e) => setDayTime(i, "endTime", e.target.value)}
                  disabled={!row.enabled}
                  className="flex-1 rounded-xl border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Error / Success */}
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
            className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-sm text-success"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Profile saved successfully!
          </motion.div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={busy}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 min-w-[140px]"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.form>
  )
}
