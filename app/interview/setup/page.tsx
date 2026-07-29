"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight,
  X,
  Sparkles,
  Briefcase,
  Code,
  FileText,
  Loader2,
  Gauge,
  Volume2,
  Lock,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRequireAuth, useAuth } from "@/contexts/auth-context"
import { interviewApi } from "@/lib/api"
import { toast } from "sonner"

const roleOptions = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Software Engineer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Mobile App Developer",
  "UI/UX Designer",
  "Product Manager",
  "QA Engineer",
  "Cybersecurity Analyst",
]

const suggestedSkills = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "JavaScript",
  "SQL",
  "AWS",
  "Docker",
  "Leadership",
  "Communication",
  "Problem Solving",
  "Agile",
]

const sessionTypes = [
  { id: "technical", name: "Technical Interview", description: "Coding and technical questions" },
  { id: "behavioral", name: "Behavioral Interview", description: "STAR method questions" },
  { id: "mixed", name: "Mixed Interview", description: "Combination of both" },
]

const difficultyOptions = [
  {
    id: "easy" as const,
    name: "Easy",
    description: "Foundational prompts, warm-up pace",
  },
  {
    id: "medium" as const,
    name: "Medium",
    description: "Typical interview depth",
  },
  {
    id: "hard" as const,
    name: "Hard",
    description: "Senior-level depth and follow-ups",
    premium: true,
  },
]

// Shared trigger styling so both dropdowns match the form's rounded, soft-filled inputs.
const selectTriggerClass =
  "h-12 w-full rounded-xl border-border/50 bg-secondary/50 px-3 text-base data-[placeholder]:text-muted-foreground"

export default function InterviewSetupPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth()
  const { isPro } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  // Shown when a free user clicks the Premium-only "Hard" difficulty.
  const [showHardPrompt, setShowHardPrompt] = useState(false)
  const [formData, setFormData] = useState({
    jobTitle: "",
    skills: [] as string[],
    jobDescription: "",
    sessionType: "mixed",
    difficulty: "medium" as "easy" | "medium" | "hard",
    speakQuestions: false,
  })
  const [skillInput, setSkillInput] = useState("")
  const [roleInput, setRoleInput] = useState("")

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !formData.skills.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }))
    }
    setSkillInput("")
  }

  const handleCustomRoleApply = () => {
    const customRole = roleInput.trim()
    if (!customRole) return
    setFormData((prev) => ({ ...prev, jobTitle: customRole }))
    setRoleInput("")
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addSkill(skillInput)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.jobTitle || formData.skills.length === 0) return

    setIsLoading(true)
    try {
      // Start interview session with backend
      const response = await interviewApi.startSession({
        session_type: formData.sessionType,
        jobTitle: formData.jobTitle,
        skills: formData.skills,
        jobDescription: formData.jobDescription,
        difficulty: formData.difficulty,
      })

      if (response.success && response.data?.session) {
        sessionStorage.setItem(
          "interviewSetup",
          JSON.stringify({
            jobTitle: formData.jobTitle,
            skills: formData.skills,
            jobDescription: formData.jobDescription,
            sessionType: formData.sessionType,
            difficulty: formData.difficulty,
            speakQuestions: formData.speakQuestions,
          })
        )
        
        toast.success("Interview session started!", {
          description: "Get ready for your practice interview.",
        })
        
        router.push(`/interview/session/${response.data.session._id}`)
      } else {
        throw new Error("Failed to create session")
      }
    } catch (error) {
      console.error("Failed to start interview:", error)
      const message =
        error instanceof Error
          ? error.message
          : "Please try again."

      const friendly =
        message.includes("Request timeout")
          ? "Question generation is taking longer than usual. If this keeps happening, your Gemini API key may be rate-limited or out of quota."
          : message

      toast.error("Failed to start interview", {
        description: friendly,
      })
      setIsLoading(false)
    }
  }

  const isFormValid = formData.jobTitle.trim() && formData.skills.length > 0

  // Include a custom-entered role so the dropdown can display it as selected.
  const roleList =
    formData.jobTitle && !roleOptions.includes(formData.jobTitle)
      ? [formData.jobTitle, ...roleOptions]
      : roleOptions
  const availableSkills = suggestedSkills.filter((s) => !formData.skills.includes(s))

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
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent/10 mb-4">
            <Sparkles className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Set Up Your Interview</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Tell us about the role you're preparing for and we'll customize your practice session
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-8"
        >
          {/* Session Type Selection */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-accent/10 p-2">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-card-foreground">Interview Type</h2>
                <p className="text-sm text-muted-foreground">Select the type of interview practice</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sessionTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, sessionType: type.id }))}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.sessionType === type.id
                      ? "border-accent bg-accent/10"
                      : "border-border/50 hover:border-accent/50"
                  }`}
                >
                  <p className="font-medium text-foreground">{type.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-accent/10 p-2">
                <Gauge className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-card-foreground">Question difficulty</h2>
                <p className="text-sm text-muted-foreground">How challenging should generated questions be?</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {difficultyOptions.map((d) => {
                const locked = "premium" in d && d.premium && !isPro
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      if (locked) {
                        setShowHardPrompt(true)
                        return
                      }
                      setFormData((prev) => ({ ...prev, difficulty: d.id }))
                    }}
                    aria-disabled={locked}
                    className={`relative p-4 rounded-xl border text-left transition-all ${
                      locked
                        ? "border-border/50 opacity-70 hover:border-accent/40"
                        : formData.difficulty === d.id
                        ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                        : "border-border/50 hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{d.name}</p>
                      {locked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          <Lock className="h-2.5 w-2.5" />
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Role + skills (dashboard-style row) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-secondary/20 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-accent/10 p-2">
                  <Briefcase className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-semibold text-card-foreground">Target role</h2>
                  <p className="text-sm text-muted-foreground">Pick a role or enter your own</p>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Role</Label>
                <Select
                  value={formData.jobTitle || undefined}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, jobTitle: value }))
                  }
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select a job role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleList.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    placeholder="Custom role…"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    className="h-11 rounded-xl bg-secondary/50 border-border/50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCustomRoleApply}
                    className="h-11 rounded-xl shrink-0"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-secondary/20 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-accent/10 p-2">
                  <Code className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-semibold text-card-foreground">Key skills</h2>
                  <p className="text-sm text-muted-foreground">At least one skill required</p>
                </div>
              </div>

              <AnimatePresence>
                {formData.skills.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-2 mb-4"
                  >
                    {formData.skills.map((skill) => (
                      <motion.span
                        key={skill}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-sm font-medium"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:bg-accent/30 rounded p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3 mb-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Add from list</Label>
                <Select key={formData.skills.length} onValueChange={(value) => addSkill(value)}>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Choose a skill…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSkills.length > 0 ? (
                      availableSkills.map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        All suggested skills added
                      </div>
                    )}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Custom skill — press Enter"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  className="h-12 rounded-xl bg-secondary/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quick add</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedSkills
                    .filter((s) => !formData.skills.includes(s))
                    .slice(0, 8)
                    .map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => addSkill(skill)}
                        className="px-3 py-1.5 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-accent/50 transition-all"
                      >
                        + {skill}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Speak questions preference */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-accent/10 p-2 mt-0.5">
                  <Volume2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-semibold text-card-foreground">Read questions aloud</h2>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Turn on to hear each question with speech synthesis when the session starts. You can always use
                    &quot;Speak now&quot; during the interview.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:shrink-0">
                <Label htmlFor="speak-setup" className="text-sm text-muted-foreground">
                  Auto-speak
                </Label>
                <Switch
                  id="speak-setup"
                  checked={formData.speakQuestions}
                  onCheckedChange={(v) =>
                    setFormData((prev) => ({ ...prev, speakQuestions: v }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Job Description (Optional) */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-accent/10 p-2">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-card-foreground">Job Description</h2>
                <p className="text-sm text-muted-foreground">
                  Optional: Paste the job description for tailored questions
                </p>
              </div>
            </div>
            <Textarea
              placeholder="Paste the job description here for more relevant interview questions..."
              value={formData.jobDescription}
              onChange={(e) => setFormData((prev) => ({ ...prev, jobDescription: e.target.value }))}
              className="min-h-32 bg-secondary/50 border-border/50 resize-none"
            />
          </div>

          {/* Submit Button */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing Your Interview...
                </>
              ) : (
                <>
                  Start Interview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="rounded-xl bg-secondary/30 p-4 border border-border/30"
          >
            <h3 className="text-sm font-medium text-foreground mb-2">Tips for a great session</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Find a quiet space with good lighting</li>
              <li>• Have a glass of water nearby</li>
              <li>• Speak clearly and at a natural pace</li>
              <li>• Take a moment to think before answering</li>
            </ul>
          </motion.div>
        </motion.form>
      </div>

      {/* Premium prompt — shown when a free user taps the locked "Hard" difficulty */}
      <AnimatePresence>
        {showHardPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowHardPrompt(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center shadow-xl"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
                <Lock className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">Hard mode is a Premium feature</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Senior-level questions and tougher follow-ups are available on Premium. Upgrade to unlock Hard
                difficulty and more.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => router.push("/upgrade?next=/interview/setup")}
                  className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Premium
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowHardPrompt(false)}
                  className="bg-transparent"
                >
                  Maybe later
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
