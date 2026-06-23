"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Send,
  Loader2,
  BrainCircuit,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  User,
  Activity,
} from "lucide-react";
import { liveInterviewApi } from "@/lib/liveInterviewApi";
import { Button } from "@/components/ui/button";
import { PremiumLayout, PremiumBadge } from "@/components/live-interview/premium-layout";
import { toast } from "sonner";

type AuditItem = { reason: string; count?: number; points: number };

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function VettingPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [vettingStatus, setVettingStatus] = useState<"unstarted" | "interviewing" | "approved" | "rejected">("unstarted");
  const [isVerified, setIsVerified] = useState(false);
  const [vettingScore, setVettingScore] = useState(0);
  const [summary, setSummary] = useState("");
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [aiGeneratedSuspected, setAiGeneratedSuspected] = useState(false);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const pastedThisAnswer = useRef(false);

  useEffect(() => {
    async function fetchVettingStatus() {
      try {
        const res = await liveInterviewApi.getVettingStatus();
        const d = res.data;
        if (d) {
          setVettingStatus(d.vettingStatus || "unstarted");
          setIsVerified(d.isVerified || false);
          setVettingScore(d.vettingScore || 0);
          setConversation(d.vettingConversation || []);
        }
      } catch (err) {
        console.error("Failed to load vetting status:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVettingStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, typing]);

  const handleStartVetting = async () => {
    setLoading(true);
    try {
      const res = await liveInterviewApi.startVetting();
      if (res.data) {
        setVettingStatus(res.data.vettingStatus);
        setConversation(res.data.vettingConversation);
      }
    } catch (err) {
      console.error("Failed to start vetting:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (content: string, opts: { wasPasted?: boolean; skipped?: boolean }) => {
    if (sending || typing) return;
    setUserInput("");
    setSending(true);

    // Optimistically add user message
    setConversation((prev) => [...prev, { role: "user", content }]);
    setTyping(true);

    try {
      const res = await liveInterviewApi.sendVettingMessage(content, opts);
      const d = res.data;
      if (d) {
        setConversation(d.vettingConversation);
        if (d.isCompleted) {
          setVettingStatus(d.vettingStatus);
          setIsVerified(d.isVerified || false);
          setVettingScore(d.vettingScore || 0);
          setSummary(d.summary || "");
          setMistakes(d.mistakes || []);
          setStrengths(d.strengths || []);
          setAiGeneratedSuspected(d.aiGeneratedSuspected || false);
          setAudit(d.audit || []);
        }
      }
    } catch (err: any) {
      console.error("Failed to send vetting message:", err);
      toast.error(err?.message || "Failed to send your answer. Please try again.");
    } finally {
      setSending(false);
      setTyping(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = userInput.trim();
    if (!msg || sending || typing) return;

    // Answering is compulsory — block lazy one-word answers like "no" or ".".
    if (msg.length < 15) {
      toast.error("Please write a complete answer, or use Skip if you can't answer this one.");
      return;
    }

    const wasPasted = pastedThisAnswer.current;
    pastedThisAnswer.current = false;
    submitAnswer(msg, { wasPasted });
  };

  const handleSkip = () => {
    if (sending || typing) return;
    pastedThisAnswer.current = false;
    submitAnswer("[Skipped]", { skipped: true });
  };

  if (loading) {
    return (
      <PremiumLayout backHref="/interviewer-dashboard" backLabel="My Dashboard">
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading Vetting System…</p>
        </div>
      </PremiumLayout>
    );
  }

  // Count rounds completed
  const userAnswersCount = conversation.filter((m) => m.role === "user").length;

  return (
    <PremiumLayout backHref="/live-interview/become-interviewer" backLabel="Profile Settings">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <PremiumBadge />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-accent via-accent to-accent-foreground bg-clip-text text-transparent">
            AI Certify Your Profile
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Pass the verification chat with our AI Auditor to go live, set your availability, and accept paid booking calls on Intervexa.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* STATE 1: UNSTARTED */}
          {vettingStatus === "unstarted" && (
            <motion.div
              key="unstarted"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="rounded-2xl border border-border/50 bg-card p-8 space-y-6 relative overflow-hidden backdrop-blur-md bg-card/60 shadow-xl"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <BrainCircuit className="h-40 w-40 text-accent" />
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-accent animate-pulse" />
                  Intervexa Certification Audit Process
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To maintain the high standards of live interviews on Intervexa, all new interviewers complete a brief interactive vetting chat. Our AI Agent will ask you 10 short, focused technical and conceptual questions based on your profile to verify your real expertise and evaluation mindset.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
                  <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">1</div>
                  <h3 className="text-xs font-semibold text-foreground">Interactive Chat</h3>
                  <p className="text-xxs text-muted-foreground">10 short technical & conceptual questions.</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
                  <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">2</div>
                  <h3 className="text-xs font-semibold text-foreground">AI Review</h3>
                  <p className="text-xxs text-muted-foreground">Evaluation of communication, empathy, and depth.</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
                  <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center text-success text-xs font-bold">3</div>
                  <h3 className="text-xs font-semibold text-foreground">Immediate Pass</h3>
                  <p className="text-xxs text-muted-foreground">Score of 70 or higher immediately verifies your profile.</p>
                </div>
              </div>

              {/* Authenticity / anti-AI note */}
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
                <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-warning">Please answer in your own words</h4>
                  <p className="text-xxs text-muted-foreground leading-relaxed">
                    This is a verification of <span className="text-foreground font-medium">your</span> expertise, so we
                    expect short, direct answers written by you. Our system detects answers that are pasted in or
                    generated by an AI assistant (e.g. ChatGPT). If we detect this:
                  </p>
                  <ul className="text-xxs text-muted-foreground leading-relaxed list-disc pl-4 space-y-0.5">
                    <li>Your score will be <span className="text-foreground font-medium">reduced</span>, and</li>
                    <li>If most answers look AI-generated, you will be <span className="text-foreground font-medium">rejected</span> and asked to retake the vetting.</li>
                  </ul>
                  <p className="text-xxs text-muted-foreground leading-relaxed">
                    Each question needs a complete answer — if you can't answer one, use the <span className="text-foreground font-medium">Skip</span> button instead of typing "no" or "I don't know". At the end you'll get a <span className="text-foreground font-medium">score audit</span> showing exactly where points were deducted. Typing genuine, first-person answers from your own experience is never penalised.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleStartVetting}
                className="w-full sm:w-auto gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-5 rounded-xl font-semibold transition-all shadow-lg shadow-accent/20"
              >
                Start AI Verification Vetting <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* STATE 2: INTERVIEWING */}
          {vettingStatus === "interviewing" && (
            <motion.div
              key="interviewing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col h-[520px] rounded-2xl border border-border/50 bg-card overflow-hidden backdrop-blur-md bg-card/60 shadow-xl"
            >
              {/* Chat Header */}
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-secondary/20">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">AI Vetting Assistant</h3>
                    <p className="text-[10px] text-muted-foreground">Vetting Interview in Progress</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50 border border-border/30 text-[10px] text-muted-foreground font-medium">
                  <Activity className="h-3 w-3 text-accent" />
                  Round {Math.min(userAnswersCount + 1, 10)} of 10
                </div>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {conversation.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-start gap-3 max-w-[85%] ${
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border ${
                        msg.role === "user"
                          ? "bg-accent/10 border-accent/25 text-accent"
                          : "bg-accent/10 border-accent/25 text-accent"
                      }`}
                    >
                      {msg.role === "user" ? <User className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground rounded-tr-none"
                          : "bg-secondary/40 border border-border/40 text-card-foreground rounded-tl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {typing && (
                  <div className="flex items-start gap-3 max-w-[85%] mr-auto">
                    <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border bg-accent/10 border-accent/25 text-accent">
                      <BrainCircuit className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-secondary/40 border border-border/40 flex items-center gap-1.5 py-4">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border/40 bg-secondary/15 flex items-center gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onPaste={(e) => {
                    // Flag answers that are pasted — a strong sign of copy-paste from an AI assistant.
                    const pasted = e.clipboardData.getData("text") || "";
                    if (pasted.trim().length > 20) pastedThisAnswer.current = true;
                  }}
                  placeholder="Type a complete answer in your own words…"
                  disabled={sending || typing}
                  className="flex-1 rounded-xl border border-border/40 bg-background/50 px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
                <Button
                  type="button"
                  onClick={handleSkip}
                  disabled={sending || typing}
                  variant="outline"
                  title="Skip this question (counts against your score)"
                  className="shrink-0 rounded-xl border-border/50 bg-transparent text-muted-foreground hover:text-foreground py-6 px-4 text-xs"
                >
                  Skip
                </Button>
                <Button
                  type="submit"
                  disabled={sending || typing || !userInput.trim()}
                  className="shrink-0 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 py-6 px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </motion.div>
          )}

          {/* STATE 3 & 4: COMPLETED (APPROVED/REJECTED) */}
          {(vettingStatus === "approved" || vettingStatus === "rejected") && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="rounded-2xl border border-border/50 bg-card p-8 space-y-6 relative overflow-hidden backdrop-blur-md bg-card/60 shadow-xl"
            >
              {/* Vetting Score Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isVerified
                        ? "bg-success/10 border-success/20 text-success"
                        : "bg-destructive/10 border-destructive/20 text-destructive"
                    }`}
                  >
                    {isVerified ? <ShieldCheck className="h-8 w-8" /> : <ShieldAlert className="h-8 w-8" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {isVerified ? "Vetting Passed & Certified!" : "Vetting Unsuccessful"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {isVerified
                        ? "Your interviewer profile is live and verified on search discovery."
                        : "Your score was below the passing threshold of 70."}
                    </p>
                  </div>
                </div>

                {/* Circular Score Badge */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Vet Score</span>
                    <span className="text-2xl font-black text-foreground">{vettingScore}/100</span>
                  </div>
                  <div className="h-10 w-[1px] bg-border/40" />
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Status</span>
                    <span className={`text-xs font-semibold ${isVerified ? "text-success" : "text-destructive"}`}>
                      {isVerified ? "Verified" : "Action Required"}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI-generated answer warning */}
              {aiGeneratedSuspected && (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-destructive">AI-Generated Answers Detected</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your responses appear to have been written by an AI assistant rather than in your own words.
                      Interviewers must answer authentically, so your score was reduced for this. Please retake the
                      vetting and answer from your own experience.
                    </p>
                  </div>
                </div>
              )}

              {/* AI Evaluation Report — point by point */}
              <div className="space-y-4 bg-secondary/20 p-5 rounded-xl border border-border/30">
                <h3 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-4 w-4 text-accent" />
                  AI Evaluation Auditor Report
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {summary || "Your mock interviewer assessment is complete. See the breakdown below."}
                </p>

                {/* What went wrong */}
                {mistakes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold flex items-center gap-1.5 text-destructive">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      What went wrong
                    </h4>
                    <ul className="space-y-1.5">
                      {mistakes.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-destructive shrink-0" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* What went well */}
                {strengths.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold flex items-center gap-1.5 text-success">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      What went well
                    </h4>
                    <ul className="space-y-1.5">
                      {strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-success shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Score Audit — where points were deducted */}
              {audit.length > 0 && (
                <div className="space-y-3 bg-secondary/20 p-5 rounded-xl border border-border/30">
                  <h3 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <TrendingUp className="h-4 w-4 text-warning" />
                    Score Audit — where you lost points
                  </h3>
                  <div className="divide-y divide-border/30">
                    {audit.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          {item.reason}
                          {typeof item.count === "number" && item.count > 0 && (
                            <span className="text-foreground font-medium"> · {item.count} answer{item.count === 1 ? "" : "s"}</span>
                          )}
                        </p>
                        <span className={`text-xs font-bold shrink-0 ${item.points < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {item.points < 0 ? item.points : "—"} {item.points < 0 ? "pts" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2">
                    <p className="text-xs font-semibold text-foreground">Total deducted</p>
                    <span className="text-xs font-bold text-destructive">
                      {audit.reduce((s, a) => s + Math.min(0, a.points), 0)} pts
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-2">
                {isVerified ? (
                  <>
                    <Button
                      onClick={() => router.push("/interviewer-dashboard")}
                      className="w-full sm:w-auto gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-5 rounded-xl font-semibold shadow-lg shadow-accent/20"
                    >
                      Go to Interviewer Dashboard <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleStartVetting}
                      className="w-full sm:w-auto border-border/50 hover:bg-secondary/40 py-5 rounded-xl text-card-foreground bg-transparent"
                    >
                      Retake Vetting (Test Again)
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleStartVetting}
                    className="w-full sm:w-auto gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-5 rounded-xl font-semibold shadow-lg shadow-accent/20"
                  >
                    Try Vetting Again
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PremiumLayout>
  );
}
