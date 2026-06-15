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
  const [evaluationFeedback, setEvaluationFeedback] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || sending) return;

    const currentMsg = userInput.trim();
    setUserInput("");
    setSending(true);

    // Optimistically add user message
    setConversation((prev) => [...prev, { role: "user", content: currentMsg }]);
    setTyping(true);

    try {
      const res = await liveInterviewApi.sendVettingMessage(currentMsg);
      const d = res.data;
      if (d) {
        setConversation(d.vettingConversation);
        if (d.isCompleted) {
          setVettingStatus(d.vettingStatus);
          setIsVerified(d.isVerified || false);
          setVettingScore(d.vettingScore || 0);
          setEvaluationFeedback(d.evaluationFeedback || "");
        }
      }
    } catch (err) {
      console.error("Failed to send vetting message:", err);
    } finally {
      setSending(false);
      setTyping(false);
    }
  };

  if (loading) {
    return (
      <PremiumLayout backHref="/live-interview/become-interviewer" backLabel="Profile Settings">
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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-accent via-purple-400 to-accent-foreground bg-clip-text text-transparent">
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
                  To maintain the high standards of live interviews on Intervexa, all new interviewers complete a brief interactive vetting chat. Our AI Agent will ask you 10 situational and background questions based on your profile to verify your experience and evaluation mindset.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
                  <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">1</div>
                  <h3 className="text-xs font-semibold text-foreground">Interactive Chat</h3>
                  <p className="text-xxs text-muted-foreground">10 structured technical & behavioral questions.</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
                  <div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs font-bold">2</div>
                  <h3 className="text-xs font-semibold text-foreground">AI Review</h3>
                  <p className="text-xxs text-muted-foreground">Evaluation of communication, empathy, and depth.</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">3</div>
                  <h3 className="text-xs font-semibold text-foreground">Immediate Pass</h3>
                  <p className="text-xxs text-muted-foreground">Score of 70 or higher immediately verifies your profile.</p>
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
                          : "bg-purple-500/10 border-purple-500/25 text-purple-400"
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
                    <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border bg-purple-500/10 border-purple-500/25 text-purple-400">
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
                  placeholder="Type your response to the AI Auditor…"
                  disabled={sending || typing}
                  className="flex-1 rounded-xl border border-border/40 bg-background/50 px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
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
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
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
                    <span className={`text-xs font-semibold ${isVerified ? "text-emerald-400" : "text-destructive"}`}>
                      {isVerified ? "Verified" : "Action Required"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feedback Message */}
              <div className="space-y-3 bg-secondary/20 p-5 rounded-xl border border-border/30">
                <h3 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  AI Evaluation Auditor Report
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {evaluationFeedback || "Your mock interviewer assessment is complete. The system evaluated your responses across technical capability and coaching communication mindset. Continue practicing to maintain top-tier evaluation patterns."}
                </p>
              </div>

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
                  <>
                    <Button
                      onClick={handleStartVetting}
                      className="w-full sm:w-auto gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-5 rounded-xl font-semibold shadow-lg shadow-accent/20"
                    >
                      Try Vetting Again
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/live-interview/become-interviewer")}
                      className="w-full sm:w-auto border-border/50 hover:bg-secondary/40 py-5 rounded-xl text-card-foreground bg-transparent"
                    >
                      Edit Profile Details
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PremiumLayout>
  );
}
