"use client";

/**
 * Premium Live Interview — Results Page
 * Polls until results_ready, then renders the full 360° report with
 * AI analysis sections and interviewer human feedback side by side.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Brain,
  Star,
  User,
  ArrowLeft,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Mic,
  Video,
} from "lucide-react";
import { liveInterviewApi, type LiveBooking } from "@/lib/liveInterviewApi";
import { Button } from "@/components/ui/button";
import { PremiumLayout } from "@/components/live-interview/premium-layout";

// ── Status banner ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; color: string; bg: string }> = {
  pending_approval:   { icon: Loader2,       title: "Awaiting Acceptance",    desc: "Your booking request is waiting for the interviewer to accept.",       color: "text-warning",   bg: "bg-warning/10 border-warning/20"  },
  accepted:           { icon: Loader2,       title: "Accepted — Payment Needed", desc: "Your booking was accepted. Please complete payment to confirm.",     color: "text-info",    bg: "bg-info/10 border-info/20"    },
  payment_pending:    { icon: Loader2,       title: "Payment Pending",          desc: "Awaiting payment confirmation from the payment provider.",           color: "text-warning",   bg: "bg-warning/10 border-warning/20"  },
  payment_completed:  { icon: Loader2,       title: "Payment Confirmed",        desc: "Payment received. Your meeting room is being set up.",              color: "text-info",  bg: "bg-info/10 border-info/20"},
  meeting_scheduled:  { icon: Loader2,       title: "Interview Scheduled",      desc: "Your interview is confirmed. Join the meeting at the scheduled time.", color: "text-info",  bg: "bg-info/10 border-info/20"},
  meeting_started:    { icon: Loader2,       title: "Interview In Progress",    desc: "The interview session is currently active.",                         color: "text-accent",    bg: "bg-accent/10 border-accent/20"    },
  meeting_completed:  { icon: Loader2,       title: "Recording Received",       desc: "Your session is queued for AI analysis (~10 minutes).",              color: "text-info",    bg: "bg-info/10 border-info/20"    },
  evaluating_ai:      { icon: Brain,         title: "AI Analysis In Progress",  desc: "Evaluating Q&A transcript and scoring candidate performance.",       color: "text-info",  bg: "bg-info/10 border-info/20"},
  results_ready:      { icon: CheckCircle2,  title: "Your Report Is Ready",     desc: "360° AI analysis + human interviewer feedback below.",               color: "text-success", bg: "bg-success/10 border-success/20"},
  failed_no_show:     { icon: AlertCircle,   title: "Interviewer Did Not Show", desc: "We're sorry. An auto-refund has been issued to your account.",       color: "text-destructive",     bg: "bg-destructive/10 border-destructive/20"      },
  refunded:           { icon: AlertCircle,   title: "Booking Refunded",         desc: "A refund has been processed to your original payment method.",       color: "text-destructive",     bg: "bg-destructive/10 border-destructive/20"      },
  completed:          { icon: Loader2,       title: "Recording Received",       desc: "Your session is queued for AI analysis (~10 minutes).",              color: "text-info",    bg: "bg-info/10 border-info/20"    },
};

function StatusBanner({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    icon: AlertCircle,
    title: "Unknown Status",
    desc:  `Booking status: ${status.replace(/_/g, " ")}`,
    color: "text-muted-foreground",
    bg:    "bg-secondary/40 border-border/50",
  };
  const Icon = cfg.icon;
  const isAnimating = ["meeting_completed", "evaluating_ai", "completed"].includes(status);
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-5 ${cfg.bg}`}>
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color} ${isAnimating ? "animate-spin" : ""}`} />
      <div>
        <p className={`font-semibold ${cfg.color}`}>{cfg.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{cfg.desc}</p>
        {isAnimating && (
          <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Score circle ──────────────────────────────────────────────────────────────

function ScoreCircle({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const r = size === "lg" ? 54 : 36;
  const stroke = size === "lg" ? 8 : 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: (r + stroke) * 2, height: (r + stroke) * 2 }}>
        <svg className="rotate-[-90deg]" width={(r + stroke) * 2} height={(r + stroke) * 2}>
          <circle cx={r + stroke} cy={r + stroke} r={r} fill="none" stroke="oklch(0.22 0.01 260)" strokeWidth={stroke} />
          <motion.circle
            cx={r + stroke} cy={r + stroke} r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold tabular-nums ${size === "lg" ? "text-2xl" : "text-lg"}`} style={{ color }}>{score}</span>
          {size === "lg" && <span className="text-xs text-muted-foreground">/100</span>}
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground max-w-[80px]">{label}</p>
    </div>
  );
}

// ── Dimension score card ──────────────────────────────────────────────────────

function DimCard({ label, score, icon: Icon, color, bg }: {
  label: string;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl border border-border/40 ${bg} p-4 flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
      <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Interviewer dimension metadata (face, voice, confidence, …) ───────────────

const HUMAN_DIMENSION_META: Array<{
  key: "confidence" | "communication" | "technical" | "problemSolving" | "bodyLanguage" | "voiceClarity"
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
}> = [
  { key: "confidence",     label: "Confidence",        icon: Sparkles,       color: "text-success", bg: "bg-success/5" },
  { key: "communication",  label: "Communication",     icon: MessageSquare,  color: "text-info",    bg: "bg-info/5" },
  { key: "technical",      label: "Technical",         icon: Brain,          color: "text-info",    bg: "bg-info/5" },
  { key: "problemSolving", label: "Problem Solving",   icon: TrendingUp,     color: "text-warning", bg: "bg-warning/5" },
  { key: "bodyLanguage",   label: "Body Language",     icon: User,           color: "text-accent",  bg: "bg-accent/5" },
  { key: "voiceClarity",   label: "Voice & Clarity",   icon: Star,           color: "text-accent",  bg: "bg-accent/5" },
]

// ── Strengths & Improvements Lists ───────────────────────────────────────────

function StrengthsList({ strengths }: { strengths: string[] }) {
  if (!strengths?.length) return null;
  return (
    <div className="rounded-xl border border-success/20 bg-success/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <h3 className="text-sm font-semibold text-success">Key Strengths</h3>
      </div>
      <ul className="space-y-2">
        {strengths.map((str, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-success shrink-0" />
            <span>{str}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImprovementsList({ improvements }: { improvements: string[] }) {
  if (!improvements?.length) return null;
  return (
    <div className="rounded-xl border border-warning/20 bg-warning/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold text-warning">Areas for Improvement</h3>
      </div>
      <ul className="space-y-2">
        {improvements.map((imp, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
            <span>{imp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LiveResultsPage() {
  const params    = useParams<{ bookingId: string }>();
  const router    = useRouter();
  const bookingId = params?.bookingId as string;

  const [booking, setBooking]   = useState<LiveBooking | null>(null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId || bookingId === "undefined") return;
    if (!/^[0-9a-fA-F]{24}$/.test(bookingId)) {
      setError("Invalid ID format");
      return;
    }
    let cancelled = false;

    const PRE_INTERVIEW = new Set([
      "pending_approval",
      "accepted",
      "payment_pending",
      "payment_completed",
      "meeting_scheduled",
      "meeting_started",
    ]);

    async function tick() {
      try {
        const res = await liveInterviewApi.getBooking(bookingId);
        if (cancelled) return;
        const bk = res.data.booking;

        if (PRE_INTERVIEW.has(bk.status)) {
          router.replace("/live-interview/my-bookings");
          return;
        }

        setBooking(bk);
        if (!["results_ready", "failed_no_show", "refunded"].includes(bk.status)) {
          setTimeout(tick, 8000);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load results");
      }
    }
    tick();
    return () => { cancelled = true; };
  }, [bookingId, router]);

  if (error) {
    return (
      <PremiumLayout backHref="/live-interview/my-bookings" backLabel="My Bookings">
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => router.push("/live-interview/my-bookings")} className="mt-2 bg-transparent">Back to My Bookings</Button>
        </div>
      </PremiumLayout>
    );
  }

  if (!booking) {
    return (
      <PremiumLayout backHref="/live-interview/my-bookings" backLabel="My Bookings">
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading your results…</p>
        </div>
      </PremiumLayout>
    );
  }

  const isReady      = booking.status === "results_ready";
  const hasAiReport  = Boolean(booking.aiReport);
  const aiReport     = booking.aiReport as any;

  // AI Dimension scores — NLP evaluation (from evaluate_live_interview)
  const aiScore      = typeof aiReport?.overall_score === "number" ? aiReport.overall_score : null;
  const commScore    = typeof aiReport?.communication_score === "number" ? aiReport.communication_score : null;
  const techScore    = typeof aiReport?.technical_score === "number" ? aiReport.technical_score : null;
  const confScore    = typeof aiReport?.confidence_score === "number" ? aiReport.confidence_score : null;
  const probScore    = typeof aiReport?.problem_solving_score === "number" ? aiReport.problem_solving_score : null;
  const questionsEvaluated = typeof aiReport?.questions_evaluated === "number" ? aiReport.questions_evaluated : null;
  const strengths    = Array.isArray(aiReport?.strengths) ? aiReport.strengths : [];
  const improvements = Array.isArray(aiReport?.improvements) ? aiReport.improvements : [];
  const summary      = typeof aiReport?.summary === "string" ? aiReport.summary : "";

  // Voice & facial scores from the recording pipeline
  const voiceScore   = typeof aiReport?.voice_score  === "number" ? aiReport.voice_score  : null;
  const facialScore  = typeof aiReport?.facial_score === "number" ? aiReport.facial_score : null;

  // Which models actually ran (avoids showing "0" as if it were a real score)
  const modelsRan    = aiReport?.models_ran as { stt?: boolean; nlp?: boolean; voice?: boolean; facial?: boolean } | undefined;
  const sttUsed      = modelsRan?.stt ?? false;
  const transcript   = typeof aiReport?.nlp?.transcript === "string" ? aiReport.nlp.transcript : null;

  // Scoring configuration
  const humanScore   = typeof booking.humanScore === "number" ? booking.humanScore : null;
  const computedCombined = aiScore !== null && humanScore !== null
    ? Math.round((aiScore * 0.5) + (humanScore * 0.5))
    : aiScore ?? humanScore;

  const finalCombinedScore = typeof booking.combinedScore === "number" ? booking.combinedScore : computedCombined;

  return (
    <PremiumLayout backHref="/live-interview/my-bookings" backLabel="My Bookings">
      {/* Header */}
      <div className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Interview Results</h1>
        <p className="text-muted-foreground">Your 360° performance report — AI analysis + human feedback.</p>
      </div>

      <div className="space-y-6">
        {/* Status banner */}
        <StatusBanner status={booking.status} />

        {/* AI Analysis section */}
        {hasAiReport && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card p-6 space-y-6"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                <h2 className="text-base font-semibold text-card-foreground">AI 360° Analysis</h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {questionsEvaluated !== null && questionsEvaluated > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Evaluated {questionsEvaluated} Q&amp;A pair{questionsEvaluated === 1 ? "" : "s"}
                  </div>
                )}
                {/* Badge row: which AI models ran */}
                {modelsRan && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {modelsRan.stt    && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">STT</span>}
                    {modelsRan.nlp    && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">NLP</span>}
                    {modelsRan.voice  && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Voice</span>}
                    {modelsRan.facial && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Facial</span>}
                  </div>
                )}
              </div>
            </div>

            {/* NLP dimension cards (from full interview evaluation) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {commScore !== null && (
                <DimCard
                  label="Communication"
                  score={commScore}
                  icon={MessageSquare}
                  color="text-info"
                  bg="bg-info/5"
                />
              )}
              {techScore !== null && (
                <DimCard
                  label="Technical Depth"
                  score={techScore}
                  icon={Brain}
                  color="text-info"
                  bg="bg-info/5"
                />
              )}
              {confScore !== null && (
                <DimCard
                  label="Confidence"
                  score={confScore}
                  icon={Sparkles}
                  color="text-success"
                  bg="bg-success/5"
                />
              )}
              {probScore !== null && (
                <DimCard
                  label="Problem Solving"
                  score={probScore}
                  icon={TrendingUp}
                  color="text-warning"
                  bg="bg-warning/5"
                />
              )}
            </div>

            {/* Voice & Facial scores from the recording pipeline */}
            {(voiceScore !== null || facialScore !== null) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {voiceScore !== null && (
                  <DimCard
                    label="Voice Delivery"
                    score={voiceScore}
                    icon={Mic}
                    color="text-accent"
                    bg="bg-accent/5"
                  />
                )}
                {facialScore !== null && (
                  <DimCard
                    label="Facial Expression"
                    score={facialScore}
                    icon={Video}
                    color="text-warning"
                    bg="bg-warning/5"
                  />
                )}
              </div>
            )}

            {/* Transcribed speech (collapsible) */}
            {sttUsed && transcript && (
              <details className="rounded-xl border border-border/40 bg-secondary/20 p-4 text-sm">
                <summary className="cursor-pointer font-medium text-muted-foreground select-none">
                  Transcribed speech ({transcript.split(" ").length} words)
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-card-foreground/80 leading-relaxed text-xs">
                  {transcript}
                </p>
              </details>
            )}

            {/* AI Summary */}
            {summary && (
              <div className="rounded-xl bg-secondary/30 px-4 py-3 text-sm text-card-foreground leading-relaxed">
                <span className="font-semibold text-accent block mb-1">AI Assessment Summary</span>
                {summary}
              </div>
            )}

            {/* Strengths & Improvements */}
            <div className="grid gap-4 md:grid-cols-2">
              <StrengthsList strengths={strengths} />
              <ImprovementsList improvements={improvements} />
            </div>
          </motion.div>
        )}

        {/* Fallback when AI analysis failed (e.g. AI service was unreachable) */}
        {!hasAiReport && isReady && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/40 bg-secondary/20 p-5 flex items-start gap-3"
          >
            <Brain className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-muted-foreground text-sm">AI Analysis Unavailable</p>
              <p className="mt-0.5 text-xs text-muted-foreground/85">
                The AI analysis service could not be reached for this session. Your interviewer&apos;s
                score and feedback are still shown below.
              </p>
            </div>
          </motion.div>
        )}

        {/* Human Feedback — shown whenever the interviewer submitted scores
            and/or written notes (written feedback is optional). */}
        {(humanScore !== null ||
          booking.humanFeedback ||
          (booking.humanDimensionScores && Object.keys(booking.humanDimensionScores).length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border/50 bg-card p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" />
                <h2 className="text-base font-semibold text-card-foreground">Interviewer Feedback</h2>
              </div>
              {humanScore !== null && (
                <div className="flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-3 py-1">
                  <Star className="h-3.5 w-3.5 text-accent" />
                  <span className="text-sm font-semibold text-accent">{humanScore}/100</span>
                </div>
              )}
            </div>
            {/* Interviewer's per-dimension scores (face, voice, confidence, …) */}
            {booking.humanDimensionScores && Object.keys(booking.humanDimensionScores).length > 0 && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {HUMAN_DIMENSION_META.map(({ key, label, icon, color, bg }) => {
                  const v = booking.humanDimensionScores?.[key]
                  if (typeof v !== "number") return null
                  return <DimCard key={key} label={label} score={v} icon={icon} color={color} bg={bg} />
                })}
              </div>
            )}

            {/* Optional written mistakes / tips */}
            {booking.humanFeedback && (
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <User className="h-4 w-4 text-accent" />
                </div>
                <div className="rounded-xl bg-secondary/30 px-4 py-3 text-sm text-card-foreground whitespace-pre-wrap leading-relaxed">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">Mistakes &amp; Tips</span>
                  {booking.humanFeedback}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Final score — average of AI + human, shown below both sections */}
        {finalCombinedScore !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-accent/30 bg-card p-6"
          >
            <div className="mb-5 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold text-card-foreground">
                {hasAiReport && humanScore !== null ? "Final Score — Average of AI & Interviewer" : "Final Score"}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {hasAiReport && aiScore !== null && <ScoreCircle score={aiScore} label="AI Score" size="sm" />}
              <ScoreCircle score={finalCombinedScore} label={hasAiReport && humanScore !== null ? "Average Score" : "Final Score"} size="lg" />
              {humanScore !== null && <ScoreCircle score={humanScore} label="Human Score" size="sm" />}
            </div>
            {hasAiReport && humanScore !== null && (
              <p className="mt-5 text-center text-xs text-muted-foreground">
                Average of the AI analysis ({aiScore}) and the interviewer&apos;s score ({humanScore}),
                weighted 50 / 50.
              </p>
            )}
          </motion.div>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => router.push("/dashboard")}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/live-interview/book")}
            className="gap-2 bg-transparent"
          >
            Book Another Session
          </Button>
        </div>
      </div>
    </PremiumLayout>
  );
}
