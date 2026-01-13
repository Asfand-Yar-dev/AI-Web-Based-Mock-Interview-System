"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, X, Sparkles, Briefcase, Code, FileText, Loader2, ArrowLeft } from "lucide-react"
import { mockApi } from "@/lib/mock-api"

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

export default function InterviewSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    jobTitle: "",
    skills: [] as string[],
    jobDescription: "",
  })
  const [skillInput, setSkillInput] = useState("")

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
      // TODO: Replace with actual API call
      const session = await mockApi.startInterview(formData.jobTitle, formData.skills, formData.jobDescription)
      router.push(`/interview/session/${session.id}`)
    } catch (error) {
      console.error("Failed to start interview:", error)
      setIsLoading(false)
    }
  }

  const isFormValid = formData.jobTitle.trim() && formData.skills.length > 0

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </motion.div>

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
          {/* Job Title */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-accent/10 p-2">
                <Briefcase className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-card-foreground">Target Role</h2>
                <p className="text-sm text-muted-foreground">What position are you interviewing for?</p>
              </div>
            </div>
            <Input
              placeholder="e.g., Senior Frontend Developer"
              value={formData.jobTitle}
              onChange={(e) => setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))}
              className="h-12 bg-secondary/50 border-border/50 text-lg"
            />
          </div>

          {/* Skills */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-accent/10 p-2">
                <Code className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-card-foreground">Key Skills</h2>
                <p className="text-sm text-muted-foreground">
                  Add skills you want to be tested on (at least 1 required)
                </p>
              </div>
            </div>

            {/* Selected Skills */}
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

            {/* Skill Input */}
            <Input
              placeholder="Type a skill and press Enter..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              className="h-12 bg-secondary/50 border-border/50 mb-4"
            />

            {/* Suggested Skills */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Suggested Skills</Label>
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
              className="w-full h-14 bg-accent text-accent-foreground hover:bg-accent/90 text-lg font-semibold disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Preparing Your Interview...
                </>
              ) : (
                <>
                  Start Interview
                  <ArrowRight className="ml-2 h-5 w-5" />
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
    </DashboardLayout>
  )
}
