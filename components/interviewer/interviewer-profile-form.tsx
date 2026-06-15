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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { liveInterviewApi } from "@/lib/liveInterviewApi"

interface ProfilePayload {
  domain: string
  skills: string
  roles: string
  yearsOfExperience: string
  bio: string
  linkedIn: string
  hourlyRate: string
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
}

export function InterviewerProfileForm({ onSaved }: InterviewerProfileFormProps) {
  const [form, setForm] = useState<ProfilePayload>({
    domain: "",
    skills: "",
    roles: "",
    yearsOfExperience: "",
    bio: "",
    linkedIn: "",
    hourlyRate: "",
  })
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [busy, setBusy]       = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await liveInterviewApi.getMyInterviewerProfile()
        const p = res.data
        if (p) {
          setForm({
            domain: p.domains?.[0] || "",
            skills: (p.skills || []).join(", "),
            roles: (p.roles || []).join(", "),
            yearsOfExperience: "",
            bio: p.bio || "",
            linkedIn: p.linkedinUrl || "",
            hourlyRate: p.hourlyRate !== undefined ? String(p.hourlyRate) : "",
          })
        }
      } catch (err: any) {
        console.error("Failed to load interviewer profile:", err)
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [])

  function patch(p: Partial<ProfilePayload>) {
    setForm((f) => ({ ...f, ...p }))
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
      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
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
            <FieldLabel icon={Star} label="Rate per Hour (USD)" required />
            <input
              type="number"
              min={0}
              placeholder="e.g. 50"
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
            className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400"
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
