"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScoreCard } from "@/components/results/score-card"
import { FeedbackSection } from "@/components/results/feedback-section"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowLeft, RotateCcw, Loader2, Download } from "lucide-react"
import { interviewApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

// Per-question row for the breakdown section
interface QuestionResult {
  questionNumber: number;
  question: string;
  score: number;
  /** What the applicant actually answered. */
  applicantAnswer?: string;
  /** Ideal answer — only present when the applicant's answer was wrong. */
  modelAnswer?: string;
  isCorrect?: boolean;
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
              applicantAnswer: q.applicantAnswer,
              modelAnswer: q.modelAnswer,
              isCorrect: q.isCorrect,
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

  // Build a styled report and open the browser print dialog (Save as PDF).
  const downloadReport = () => {
    if (!feedback) return
    const esc = (s: string) =>
      String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const col = (n: number) => (n <= 50 ? "#ef4444" : n <= 75 ? "#f59e0b" : "#10b981")
    const dims: [string, number][] = [
      ["Technical", feedback.technicalScore],
      ["Clarity", feedback.clarityScore],
      ["Voice", feedback.voiceToneScore],
      ["Confidence", feedback.confidenceScore],
      ["Body language", feedback.bodyLanguageScore],
    ]
    const listItems = (arr: string[], cls: string) =>
      arr.length
        ? arr.map((s) => `<li>${esc(s)}</li>`).join("")
        : `<li class="${cls}-empty">No items recorded.</li>`

    // Overall score ring geometry
    const RING_R = 50
    const ringCirc = 2 * Math.PI * RING_R
    const ringOffset = ringCirc * (1 - Math.max(0, Math.min(100, feedback.overallScore)) / 100)
    const overallColor = col(feedback.overallScore)
    const band =
      feedback.overallScore >= 75
        ? { t: "Strong performance", bg: "#dcfce7", fg: "#15803d" }
        : feedback.overallScore >= 50
          ? { t: "Good progress", bg: "#fef3c7", fg: "#b45309" }
          : { t: "Keep practicing", bg: "#fee2e2", fg: "#b91c1c" }
    const metaLine = [feedback.jobTitle && esc(feedback.jobTitle), reportDateLabel, `${feedback.questionsAnswered} question(s)`]
      .filter(Boolean)
      .join("&nbsp;&nbsp;•&nbsp;&nbsp;")

    const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Intervexa Report${feedback.jobTitle ? " — " + esc(feedback.jobTitle) : ""}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;background:#fff;font-size:13px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .brand{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#0f9d6b,#0b6e4b);color:#fff;padding:22px 32px}
  .brand .logo{font-size:21px;font-weight:800;letter-spacing:-.02em}
  .brand .tag{font-size:10.5px;text-transform:uppercase;letter-spacing:.16em;opacity:.9;text-align:right}
  .body{padding:30px 32px}
  .hero{display:flex;align-items:center;gap:28px;border:1px solid #e5e7eb;border-radius:16px;padding:22px 26px;margin-bottom:28px;background:#f8fafc}
  .ring{position:relative;width:120px;height:120px;flex:none}
  .ring .num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .ring .num b{font-size:34px;font-weight:800;line-height:1}
  .ring .num small{font-size:10px;color:#64748b;margin-top:2px}
  .hero h1{font-size:22px;font-weight:800;letter-spacing:-.02em;margin-bottom:5px}
  .hero .meta{color:#64748b;font-size:12.5px}
  .badge{display:inline-block;margin-top:12px;padding:5px 13px;border-radius:999px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
  .section{margin-bottom:26px;page-break-inside:avoid}
  .stitle{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:#0f9d6b;margin-bottom:14px;display:flex;align-items:center;gap:10px}
  .stitle::after{content:"";flex:1;height:1px;background:#e5e7eb}
  .bar{display:flex;align-items:center;gap:12px;margin:10px 0}
  .bar .lbl{width:120px;flex:none;font-weight:600;font-size:12.5px;color:#334155}
  .bar .track{flex:1;height:8px;border-radius:999px;background:#eef2f7;overflow:hidden}
  .bar .fill{height:100%;border-radius:999px}
  .bar .val{width:42px;flex:none;text-align:right;font-weight:800;font-size:12.5px}
  .cols{display:flex;gap:16px}
  .card{flex:1;border:1px solid #e5e7eb;border-radius:12px;padding:15px 17px}
  .card h3{font-size:12px;font-weight:800;margin-bottom:9px;text-transform:uppercase;letter-spacing:.05em}
  .card.s h3{color:#0f9d6b}
  .card.i h3{color:#d97706}
  .card ul{list-style:none}
  .card li{position:relative;padding-left:16px;margin:7px 0;font-size:12px;color:#374151;line-height:1.5}
  .card li::before{content:"";position:absolute;left:0;top:6px;width:6px;height:6px;border-radius:50%}
  .card.s li::before{background:#0f9d6b}
  .card.i li::before{background:#d97706}
  .card li[class$="-empty"]{color:#94a3b8;padding-left:0}
  .card li[class$="-empty"]::before{display:none}
  .analysis{border:1px solid #e5e7eb;border-left:4px solid #0f9d6b;border-radius:10px;padding:15px 18px;background:#f8fafc;font-size:12.5px;line-height:1.7;color:#334155}
  .qcard{border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:12px;page-break-inside:avoid}
  .qhead{display:flex;gap:11px;align-items:flex-start}
  .qnum{width:26px;height:26px;flex:none;border-radius:8px;background:#f1f5f9;color:#64748b;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
  .qtext{flex:1;font-weight:700;font-size:13px;color:#0f172a;line-height:1.4}
  .qscore{flex:none;font-weight:800;font-size:16px;min-width:32px;text-align:right}
  .alabel{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin:11px 0 4px 37px}
  .atext{font-size:12px;color:#334155;line-height:1.55;background:#f8fafc;border:1px solid #eef2f7;border-radius:8px;padding:9px 11px;margin-left:37px}
  .alabel.ok{color:#059669}
  .atext.ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
  .foot{margin-top:6px;padding:16px 32px;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:10.5px;display:flex;justify-content:space-between}
  @page{margin:12mm}
</style></head><body>
  <div class="brand">
    <div class="logo">Intervexa</div>
    <div class="tag">Interview Performance Report</div>
  </div>
  <div class="body">
    <div class="hero">
      <div class="ring">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="${RING_R}" fill="none" stroke="#e8edf3" stroke-width="11"/>
          <circle cx="60" cy="60" r="${RING_R}" fill="none" stroke="${overallColor}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${ringCirc.toFixed(1)}" stroke-dashoffset="${ringOffset.toFixed(1)}" transform="rotate(-90 60 60)"/>
        </svg>
        <div class="num"><b style="color:${overallColor}">${feedback.overallScore}</b><small>/ 100</small></div>
      </div>
      <div>
        <h1>${feedback.jobTitle ? esc(feedback.jobTitle) : "Interview Report"}</h1>
        <div class="meta">${metaLine}</div>
        <span class="badge" style="background:${band.bg};color:${band.fg}">${band.t}</span>
      </div>
    </div>

    <div class="section">
      <div class="stitle">Score breakdown</div>
      ${dims.map(([l, s]) => `<div class="bar"><span class="lbl">${l}</span><span class="track"><span class="fill" style="width:${Math.max(0, Math.min(100, s))}%;background:${col(s)}"></span></span><span class="val" style="color:${col(s)}">${s}</span></div>`).join("")}
    </div>

    <div class="section">
      <div class="cols">
        <div class="card s"><h3>Strengths</h3><ul>${listItems(feedback.strengths, "s")}</ul></div>
        <div class="card i"><h3>Areas to improve</h3><ul>${listItems(feedback.improvements, "i")}</ul></div>
      </div>
    </div>

    ${feedback.detailedFeedback ? `<div class="section"><div class="stitle">Detailed analysis</div><div class="analysis">${esc(feedback.detailedFeedback)}</div></div>` : ""}

    ${feedback.questionBreakdown.length ? `<div class="section"><div class="stitle">Question breakdown</div>${feedback.questionBreakdown.map((q) => `<div class="qcard"><div class="qhead"><span class="qnum">${String(q.questionNumber).padStart(2, "0")}</span><span class="qtext">${esc(q.question)}</span><span class="qscore" style="color:${col(q.score)}">${q.score}</span></div>${q.applicantAnswer ? `<div class="alabel">Your answer</div><div class="atext">${esc(q.applicantAnswer)}</div>` : ""}${q.modelAnswer ? `<div class="alabel ok">Correct answer</div><div class="atext ok">${esc(q.modelAnswer)}</div>` : ""}</div>`).join("")}</div>` : ""}
  </div>
  <div class="foot"><span>Generated by Intervexa</span><span>${reportDateLabel || ""}</span></div>
  <script>window.onload=function(){setTimeout(function(){window.print()},250)};window.onafterprint=function(){window.close()};</script>
</body></html>`

    const w = window.open("", "_blank")
    if (!w) return // popup blocked — nothing to do
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
  }

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
              label="Clarity"
              score={feedback.clarityScore}
              color={ringColor(feedback.clarityScore)}
              delay={0.35}
              zeroReason="Audio clarity or text coherence was too low to be scored."
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
            Dimension scores (technical, body language, voice, clarity, confidence) appear after at least one answer is
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
                <li key={q.questionNumber} className="px-6 py-4 text-sm">
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-xs text-faint shrink-0 w-6 mt-0.5">
                      {String(q.questionNumber).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-card-foreground/90 font-medium text-pretty">
                      {q.question}
                    </span>
                    <span
                      className="font-display text-base font-semibold tabular-nums shrink-0"
                      style={{ color: ringColor(q.score) }}
                    >
                      {q.score}
                    </span>
                  </div>

                  {q.applicantAnswer && (
                    <div className="mt-3 ml-10 space-y-2.5">
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Your answer
                        </p>
                        <p className="whitespace-pre-wrap rounded-lg border border-border/40 bg-secondary/40 px-3 py-2 text-[13px] leading-relaxed text-card-foreground/85">
                          {q.applicantAnswer}
                        </p>
                      </div>

                      {q.modelAnswer && (
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-success">
                            Correct answer
                          </p>
                          <p className="whitespace-pre-wrap rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-[13px] leading-relaxed text-card-foreground/85">
                            {q.modelAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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
          <Button
            variant="outline"
            onClick={downloadReport}
            disabled={feedback.isProcessing}
            className="w-full sm:w-auto bg-transparent border-border/50 disabled:opacity-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
