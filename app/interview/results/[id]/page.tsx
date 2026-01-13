"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScoreCard } from "@/components/results/score-card"
import { FeedbackSection } from "@/components/results/feedback-section"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowLeft, Download, Share2, RotateCcw, Loader2, Trophy, TrendingUp } from "lucide-react"
import { mockApi, type InterviewFeedback } from "@/lib/mock-api"

export default function ResultsPage() {
  const params = useParams()
  const sessionId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null)

  useEffect(() => {
    async function loadResults() {
      try {
        // TODO: Replace with actual API call
        const data = await mockApi.completeInterview(sessionId)
        setFeedback(data)
      } catch (error) {
        console.error("Failed to load results:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadResults()
  }, [sessionId])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto" />
            <p className="text-muted-foreground">Analyzing your interview...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!feedback) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Failed to load results</p>
            <Link href="/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const scoreColors = {
    overall: "oklch(0.65 0.25 280)",
    confidence: "oklch(0.7 0.18 145)",
    clarity: "oklch(0.7 0.15 180)",
    technical: "oklch(0.75 0.18 80)",
    bodyLanguage: "oklch(0.6 0.2 320)",
    voiceTone: "oklch(0.65 0.22 40)",
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back Link */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          className="text-center"
        >
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-accent/10 mb-4">
            <Trophy className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Interview Complete!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Great job completing your practice session. Here's your detailed performance analysis.
          </p>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-8 text-center"
        >
          <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
          <div className="flex items-center justify-center gap-4">
            <motion.span
              className="text-6xl font-bold text-foreground"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {feedback.overallScore}
            </motion.span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 text-success">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">+5 from last session</span>
          </div>
        </motion.div>

        {/* Score Cards Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <ScoreCard label="Confidence" score={feedback.confidenceScore} color={scoreColors.confidence} delay={0.2} />
          <ScoreCard label="Clarity" score={feedback.clarityScore} color={scoreColors.clarity} delay={0.25} />
          <ScoreCard label="Technical" score={feedback.technicalScore} color={scoreColors.technical} delay={0.3} />
          <ScoreCard
            label="Body Language"
            score={feedback.bodyLanguageScore}
            color={scoreColors.bodyLanguage}
            delay={0.35}
          />
          <ScoreCard label="Voice & Tone" score={feedback.voiceToneScore} color={scoreColors.voiceTone} delay={0.4} />
          <div className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.45 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-card-foreground mb-1">85%</p>
              <p className="text-sm text-muted-foreground">Better than average</p>
            </motion.div>
          </div>
        </div>

        {/* Feedback Sections */}
        <FeedbackSection
          strengths={feedback.strengths}
          improvements={feedback.improvements}
          detailedFeedback={feedback.detailedFeedback}
        />

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
        >
          <Link href="/interview/setup">
            <Button className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              <RotateCcw className="mr-2 h-4 w-4" />
              Practice Again
            </Button>
          </Link>
          <Button variant="outline" className="bg-transparent border-border/50">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
          <Button variant="outline" className="bg-transparent border-border/50">
            <Share2 className="mr-2 h-4 w-4" />
            Share Results
          </Button>
        </motion.div>

        {/* Tips for Next Time */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.2 }}
          className="rounded-xl bg-secondary/30 p-6 border border-border/30 text-center"
        >
          <h3 className="text-lg font-semibold text-foreground mb-2">Keep Improving!</h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Practice makes perfect. Schedule regular interview sessions to maintain and improve your skills. Focus on
            the areas for improvement highlighted above in your next session.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
