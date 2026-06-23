"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScoreCard } from "@/components/results/score-card"
import { FeedbackSection } from "@/components/results/feedback-section"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowLeft, RotateCcw, Loader2 } from "lucide-react"
import { interviewApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

// Per-question row for the breakdown section
interface QuestionResult {
  questionNumber: number;
  question: string;
  score: number;
}

// Type for the feedback displayed on this page
interface InterviewFeedback {
  overallScore: number;
  confidenceScore: number;
  clarityScore: number;
  technicalScore: number;
  bodyLanguageScore: number;
  voiceToneScore: number;
  facePresence: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  questionsAnswered: number;
  hasEvaluatedAnswers: boolean;
  isProcessing: boolean;
  jobTitle: string;
  reportDate: string;
  questionBreakdown: QuestionResult[];
}

export default function ResultsPage() {
  const params = useParams()
  const sessionId = params.id as string
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function loadResults() {
      try {
        // Fetch results from backend
        const response = await interviewApi.getResults(sessionId)
        if (response.success && response.data) {
          const newFeedback = {
            overallScore: response.data.overallScore,
            confidenceScore: response.data.scores.confidence,
            clarityScore: response.data.scores.clarity,
            technicalScore: response.data.scores.technical,
            bodyLanguageScore: response.data.scores.bodyLanguage,
            voiceToneScore: response.data.scores.voiceTone,
            facePresence: response.data.scores.facePresence ?? 100,
            strengths: response.data.strengths,
            improvements: response.data.improvements,
            detailedFeedback: response.data.summary,
            questionsAnswered: response.data.questionsAnswered ?? 0,
            hasEvaluatedAnswers: response.data.hasEvaluatedAnswers ?? true,
            isProcessing: response.data.isProcessing ?? false,
            jobTitle: response.data.jobTitle || "",
            reportDate: response.data.completedAt || response.data.startedAt || "",
            questionBreakdown: (response.data.questionFeedback ?? []).map((q) => ({
              questionNumber: q.questionNumber,
              question: q.question,
              score: q.score,
            })),
          };
          setFeedback(newFeedback)

          // Auto-poll if results are still being compiled by the AI backend
          if (newFeedback.isProcessing) {
            timeoutId = setTimeout(loadResults, 3000);
          }
        }
      } catch (error) {
        console.error("Failed to load results:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadResults()

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [sessionId])

  // Show loading while checking auth or loading data
  if (authLoading || isLoading) {
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

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
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

  // Score → ring/text color: emerald when solid, amber when middling, red when weak.
  const ringColor = (score: number) =>
    score >= 75 ? "var(--accent)" : score >= 50 ? "var(--warning)" : "var(--destructive)"

  // Facial metrics (body language + face presence) are only meaningful when a
  // face was actually detected in the video. A low presence rate means the
  // facial model couldn't analyse the recording (not necessarily a camera that
  // was off) — so we say "no face detected" rather than blaming the camera.
  const facialUnavailable = feedback.facePresence < 20

  const showMeaningfulScores =
    feedback.questionsAnswered > 0 && feedback.hasEvaluatedAnswers

  const reportDateLabel = feedback.reportDate
    ? new Date(feedback.reportDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null
  const heroTitle =
    feedback.jobTitle ||
    (feedback.isProcessing ? "Analyzing your interview…" : "Interview report")

  // Performance band for the hero pill.
  const perf =
    feedback.overallScore >= 80
      ? { label: "Strong performance", tint: "bg-accent/15 text-accent" }
      : feedback.overallScore >= 60
        ? { label: "Good progress", tint: "bg-accent/15 text-accent" }
        : { label: "Keep practicing", tint: "bg-warning/15 text-warning" }

  const overallCirc = 2 * Math.PI * 62
  const overallOffset = overallCirc - (feedback.overallScore / 100) * overallCirc

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back row */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-[11px] border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            <ArrowLeft className="h-[15px] w-[15px]" />
            Dashboard
          </Link>
          <span className="font-mono text-xs text-faint">
            Report{reportDateLabel ? ` · ${reportDateLabel}` : ""}
          </span>
        </motion.div>

        {/* Hero score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="relative overflow-hidden rounded-[24px] border border-border bg-gradient-to-br from-accent/[0.12] to-card p-8"
        >
          <div className="pointer-events-none absolute right-[-10%] top-[-50%] h-[380px] w-[420px] bg-[radial-gradient(circle,var(--glow),transparent_70%)]" />
          <div className="relative flex flex-wrap items-center gap-10">
            {/* Overall ring */}
            <div className="relative shrink-0">
              <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
                <circle cx="74" cy="74" r="62" fill="none" stroke="var(--secondary)" strokeWidth="11" />
                {!feedback.isProcessing && (
                  <motion.circle
                    cx="74"
                    cy="74"
                    r="62"
                    fill="none"
                    style={{ stroke: "var(--accent)" }}
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={overallCirc}
                    initial={{ strokeDashoffset: overallCirc }}
                    animate={{ strokeDashoffset: overallOffset }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {feedback.isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                ) : (
                  <>
                    <span className="font-display text-[42px] font-bold leading-none">{feedback.overallScore}</span>
                    <span className="mt-1 font-mono text-[10px] text-faint">/ 100</span>
                  </>
                )}
              </div>
            </div>

            {/* Copy */}
            <div className="relative min-w-[240px] flex-1">
              {!feedback.isProcessing && showMeaningfulScores && (
                <div className={`mb-3.5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.05em] ${perf.tint}`}>
                  {perf.label}
                </div>
              )}
              <h1 className="mb-2.5 font-display text-3xl font-bold tracking-tight">
                {heroTitle}
              </h1>
              <p className="max-w-[460px] text-[15px] leading-relaxed text-muted-foreground text-pretty">
                {feedback.isProcessing
                  ? "Please wait while the AI scores your voice, content, and presence."
                  : showMeaningfulScores
                    ? "Here's your performance breakdown for this session."
                    : "No valid spoken answers were detected, so there is no score."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Score Cards Grid — the 5 core AI dimensions */}
        {showMeaningfulScores ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <ScoreCard
              label="Technical"
              score={feedback.technicalScore}
              color={ringColor(feedback.technicalScore)}
              delay={0.2}
              zeroReason="Response lacked the required technical depth or key terminology."
            />
            <ScoreCard
              label="Body language"
              score={feedback.bodyLanguageScore}
              color={ringColor(feedback.bodyLanguageScore)}
              delay={0.25}
              zeroReason={
                facialUnavailable
                  ? "No face detected in the video, so body language couldn't be scored."
                  : "Insufficient visual data or neutral expression detected."
              }
            />
            <ScoreCard
              label="Voice"
              score={feedback.voiceToneScore}
              color={ringColor(feedback.voiceToneScore)}
              delay={0.3}
              zeroReason="Audio clarity or speech rate was outside normal range."
            />
            <ScoreCard
              label="Face"
              score={feedback.facePresence}
              color={ringColor(feedback.facePresence)}
              delay={0.35}
              zeroReason="No face was detected in the recording for this session."
            />
            <ScoreCard
              label="Confidence"
              score={feedback.confidenceScore}
              color={ringColor(feedback.confidenceScore)}
              delay={0.4}
              zeroReason="Minimal vocal variation or long pauses detected."
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card/80 p-8 text-center text-muted-foreground text-sm max-w-xl mx-auto">
            Dimension scores (technical, body language, voice, face, confidence) appear after at least one answer is
            transcribed and scored. Finish a session with spoken responses to see the full breakdown.
          </div>
        )}

        {/* Feedback Sections */}
        <FeedbackSection
          strengths={feedback.strengths}
          improvements={feedback.improvements}
          detailedFeedback={feedback.detailedFeedback}
        />

        {/* Question breakdown */}
        {feedback.questionBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.05 }}
            className="overflow-hidden rounded-[17px] border border-border bg-card"
          >
            <h3 className="border-b border-border/60 px-6 py-4 font-display text-base font-semibold text-card-foreground">
              Question breakdown
            </h3>
            <ul className="divide-y divide-border/50">
              {feedback.questionBreakdown.map((q) => (
                <li
                  key={q.questionNumber}
                  className="flex items-center gap-4 px-6 py-4 text-sm"
                >
                  <span className="font-mono text-xs text-faint shrink-0 w-6">
                    {String(q.questionNumber).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-card-foreground/90 text-pretty">
                    {q.question}
                  </span>
                  <span
                    className="font-display text-base font-semibold tabular-nums shrink-0"
                    style={{ color: ringColor(q.score) }}
                  >
                    {q.score}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

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
              Practice again
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto bg-transparent border-border/50">
              Back to dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
