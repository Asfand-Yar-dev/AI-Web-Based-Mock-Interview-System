"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowRight,
  Loader2,
  Clock,
  Sparkles,
  X,
  Captions,
} from "lucide-react";
import {
  answersApi,
  interviewApi,
  type Question,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// Map backend Question to frontend InterviewQuestion format
interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

function mapBackendQuestion(q: any): InterviewQuestion {
  const difficulty = (String(q.difficulty || "medium").toLowerCase() === "easy"
    ? "easy"
    : String(q.difficulty || "medium").toLowerCase() === "hard"
      ? "hard"
      : "medium") as "easy" | "medium" | "hard";

  return {
    id: String(q.id || q._id),
    question: String(q.questionText || q.question || ""),
    category: String(q.category || ""),
    difficulty,
  };
}

export default function InterviewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [globalTimeRemaining, setGlobalTimeRemaining] = useState(600); // 10 minutes limit
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showTip, setShowTip] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [speakQuestionsAloud, setSpeakQuestionsAloud] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<{
    jobTitle: string;
    sessionType: string;
    difficulty: string;
    skills: string[];
  }>({ jobTitle: "", sessionType: "", difficulty: "", skills: [] });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const isFinishingRef = useRef(false);

  // Live-value refs so the global timer callback never reads stale closures
  const isRecordingRef = useRef(isRecording);
  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  const questionsRef = useRef(questions);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const currentQuestion = questions[currentQuestionIndex];

  // Initialize camera and questions
  useEffect(() => {
    if (!hasStarted) return;

    async function init() {
      // 1) Load Groq-assigned questions for THIS interview session
      try {
        const qRes = await interviewApi.getSessionQuestions(sessionId);
        if (!qRes.success || !qRes.data?.questions?.length) {
          throw new Error("No questions were assigned to this interview.");
        }

        const mappedQuestions = [...qRes.data.questions]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(mapBackendQuestion);

        setQuestions(mappedQuestions);
      } catch (error) {
        console.error("Failed to load interview questions:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load interview questions"
        );
        setIsLoading(false);
        router.push("/interview/setup");
        return;
      }

      // 2) Initialize camera + microphone (separate from question loading)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Failed to initialize camera/mic:", error);
        setPermissionError(true);
      } finally {
        setIsLoading(false);
      }
    }
    init();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (
        videoRecorderRef.current &&
        videoRecorderRef.current.state !== "inactive"
      ) {
        videoRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId, hasStarted]);

  // Auto-start recording when everything is ready
  useEffect(() => {
    if (hasStarted && !isLoading && !permissionError && !isRecording && currentQuestionIndex === 0) {
      const timer = setTimeout(() => {
        startRecording();
      }, 500); // short delay to ensure stream is stable
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, isLoading, permissionError]);

  // Make sure to attach the camera stream once the loading screen disappears and video mounts
  useEffect(() => {
    if (!isLoading && !permissionError && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [isLoading, permissionError, isCameraOn]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("interviewSetup");
      if (raw) {
        const o = JSON.parse(raw) as {
          speakQuestions?: boolean;
          jobTitle?: string;
          sessionType?: string;
          difficulty?: string;
          skills?: string[];
        };
        setSpeakQuestionsAloud(Boolean(o.speakQuestions));
        setSessionMeta({
          jobTitle: o.jobTitle || "",
          sessionType: o.sessionType || "",
          difficulty: o.difficulty || "",
          skills: Array.isArray(o.skills) ? o.skills : [],
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const speakQuestion = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (!speakQuestionsAloud || !currentQuestion?.question) return;
    speakQuestion(currentQuestion.question);
  }, [currentQuestionIndex, currentQuestion?.question, speakQuestionsAloud, speakQuestion]);

  const setSpeakPreference = useCallback((on: boolean) => {
    setSpeakQuestionsAloud(on);
    try {
      const raw = sessionStorage.getItem("interviewSetup");
      const o = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      sessionStorage.setItem(
        "interviewSetup",
        JSON.stringify({ ...o, speakQuestions: on })
      );
    } catch {
      /* ignore */
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, []);

  // Start recording
  const startRecording = () => {
    // Clear previous audio chunks
    audioChunksRef.current = [];
    videoChunksRef.current = [];

    // Create MediaRecorders from stream (audio-only + video-only)
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      const videoTracks = streamRef.current.getVideoTracks();

      if (audioTracks.length === 0) {
        console.error("No audio track available");
        toast.error("Microphone not available for recording.");
        return;
      }

      const audioStream = new MediaStream(audioTracks);

      // Audio MIME selection
      const audioMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/mpeg",
      ];
      let selectedAudioMimeType: string | undefined;
      for (const mimeType of audioMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedAudioMimeType = mimeType;
          break;
        }
      }

      const audioOptions = selectedAudioMimeType
        ? { mimeType: selectedAudioMimeType }
        : {};
      const audioRecorder = new MediaRecorder(audioStream, audioOptions);
      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      // Video is optional. If camera is off/disabled, still record audio answer.
      let videoRecorder: MediaRecorder | null = null;
      const activeVideoTrack = videoTracks.find((t) => t.enabled);
      if (activeVideoTrack && isCameraOn) {
        try {
          const videoStream = new MediaStream([activeVideoTrack]);
          const videoMimeTypes = [
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm",
          ];
          let selectedVideoMimeType: string | undefined;
          for (const mimeType of videoMimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
              selectedVideoMimeType = mimeType;
              break;
            }
          }

          const videoOptions = selectedVideoMimeType
            ? { mimeType: selectedVideoMimeType }
            : {};
          videoRecorder = new MediaRecorder(videoStream, videoOptions);
          videoRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) videoChunksRef.current.push(event.data);
          };
        } catch (error) {
          console.warn("Video recorder could not start; continuing with audio-only.", error);
        }
      }

      mediaRecorderRef.current = audioRecorder;
      videoRecorderRef.current = videoRecorder;

      // Start both recorders in parallel
      audioRecorder.start(1000); // Collect data every second
      if (videoRecorder) {
        videoRecorder.start(1000);
      }
    }

    setIsRecording(true);
    setShowTip(false);
    setTimeElapsed(0);
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
  };

  const stopMediaRecorders = async () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const audioRecorder = mediaRecorderRef.current;
    const videoRecorder = videoRecorderRef.current;

    const stopAndWait = (rec: MediaRecorder | null) =>
      new Promise<void>((resolve) => {
        if (!rec || rec.state === "inactive") return resolve();
        rec.onstop = () => resolve();
        rec.stop();
      });

    await Promise.all([stopAndWait(audioRecorder), stopAndWait(videoRecorder)]);

    let audioBlob: Blob | undefined;
    let videoBlob: Blob | undefined;

    if (audioChunksRef.current.length > 0) {
      audioBlob = new Blob(audioChunksRef.current, { type: audioRecorder?.mimeType || "audio/webm" });
    }
    if (videoChunksRef.current.length > 0) {
      videoBlob = new Blob(videoChunksRef.current, { type: videoRecorder?.mimeType || "video/webm" });
    }

    if (!videoBlob || videoBlob.size < 2048) {
      videoBlob = undefined;
    }

    return { audioBlob, videoBlob, duration: timeElapsed };
  };

  const submitBackgroundAnswer = async (qId: string, audioBlob?: Blob, videoBlob?: Blob, duration?: number) => {
    if (!audioBlob || audioBlob.size < 1024) return; // Skip if too short
    try {
      await answersApi.submit({
        question_id: qId,
        session_id: sessionId,
        audio_blob: audioBlob,
        video_blob: videoBlob,
        audio_duration: duration || 0,
        answer_text: "", // Background AI will generate transcription
      });
    } catch (error) {
      console.error("Background chunk upload failed:", error);
    }
  };

  const handleNextQuestion = async () => {
    setIsProcessing(true);
    const qId = currentQuestion.id;
    const { audioBlob, videoBlob, duration } = await stopMediaRecorders();

    // Await submission to ensure backend finishes processing before proceeding or redirecting
    await submitBackgroundAnswer(qId, audioBlob, videoBlob, duration);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowTip(true);
      startRecording(); // Restart immediately for the next question
      setIsProcessing(false);
    } else {
      finishInterview();
    }
  };

  // Finish interview
  const finishInterview = async () => {
    // Guard against double invocations (e.g. timer + button click race)
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    setIsLoading(true);

    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
      videoRecorderRef.current.stop();
    }

    // Stop camera and microphone streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    try {
      // End the interview session in the backend
      await interviewApi.endSession(sessionId);
      toast.success("Interview completed!");
      router.push(`/interview/results/${sessionId}`);
    } catch (error) {
      console.error("Failed to complete interview:", error);
      // If session was already completed (e.g. from a race with the global timer),
      // still redirect to results instead of leaving the user stranded.
      const msg = error instanceof Error ? error.message : "";
      if (msg.toLowerCase().includes("already completed")) {
        router.push(`/interview/results/${sessionId}`);
      } else {
        toast.error("Failed to complete interview");
        isFinishingRef.current = false;
        setIsLoading(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Global Session Timer
  useEffect(() => {
    if (!hasStarted || isLoading || authLoading || questions.length === 0) return;

    const interval = setInterval(() => {
      setGlobalTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);

          // Read LIVE values via refs to avoid stale-closure bugs.
          const liveQuestions = questionsRef.current;
          const liveIndex = currentQuestionIndexRef.current;
          const liveRecording = isRecordingRef.current;
          const qId = liveQuestions[liveIndex]?.id;

          if (qId && liveRecording) {
            stopMediaRecorders().then(({ audioBlob, videoBlob, duration }) => {
              submitBackgroundAnswer(qId, audioBlob, videoBlob, duration).then(() => {
                finishInterview();
              });
            }).catch(() => finishInterview());
          } else {
            finishInterview();
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, authLoading, questions.length]);

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Instructions Overlay
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-card border border-border/50 rounded-2xl p-8 space-y-6 shadow-sm">
          <h1 className="text-3xl font-bold text-foreground">Interview Instructions</h1>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p><strong>1. Time Limit:</strong> The total session time is strictly 10 minutes. The session will end automatically.</p>
            <p><strong>2. Continuous Flow:</strong> Your video and audio will be continuously recorded from the moment you start. The AI evaluates you throughout the session.</p>
            <p><strong>3. Environment:</strong> Do not refresh or leave this page. Stay in a quiet environment.</p>
            <p><strong>4. Navigation:</strong> Answer each question clearly, then simply click "Next" to automatically process and move to the next question. There is no pause.</p>
          </div>
          <div className="flex items-center gap-3 pt-4 border-t border-border/50">
            <input
              type="checkbox"
              id="accepted"
              className="w-5 h-5 rounded border-accent text-accent focus:ring-accent accent-accent cursor-pointer"
              checked={instructionsAccepted}
              onChange={(e) => setInstructionsAccepted(e.target.checked)}
            />
            <label htmlFor="accepted" className="text-foreground font-medium cursor-pointer">
              I have read and confirm the instructions above.
            </label>
          </div>
          <Button
            className="w-full h-12 text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            disabled={!instructionsAccepted}
            onClick={() => {
              setHasStarted(true); // Triggers loading state & camera request
            }}
          >
            Start Interview
          </Button>
        </div>
      </div>
    );
  }

  // Show loading while checking auth or initializing
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto" />
          <p className="text-muted-foreground">Preparing your interview...</p>
        </div>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <VideoOff className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Camera Access Required
            </h2>
            <p className="text-muted-foreground">
              We need access to your camera and microphone for the interview
              session. Please allow access in your browser settings and try
              again.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="bg-transparent"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const userInitials =
    (user?.name || "You")
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "YOU";
  const waveformBars = [0.35, 0.6, 0.9, 0.5, 1, 0.45, 0.85, 0.65, 0.75, 0.3, 0.55, 0.7, 0.4];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(1200px_600px_at_50%_-15%,var(--accent-soft),transparent_70%),var(--background)] text-foreground">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="relative flex h-14 shrink-0 items-center justify-between px-5">
        {/* Left: REC + role */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full bg-destructive ${isRecording ? "shadow-[0_0_10px_var(--destructive)] animate-pulse" : "opacity-40"}`} />
            <span className="font-mono text-[11px] tracking-[0.14em] text-destructive">REC</span>
          </span>
          <span className="text-sm text-muted-foreground">
            {sessionMeta.jobTitle || "Interview Session"}
            {sessionMeta.sessionType && (
              <span className="capitalize"> · {sessionMeta.sessionType}</span>
            )}
          </span>
        </div>

        {/* Center: close */}
        <button
          onClick={finishInterview}
          title="End interview"
          className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Right: timer + counter */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 rounded-[11px] border border-border bg-card px-3 py-1.5 font-mono text-[13px] ${globalTimeRemaining < 60 ? "text-destructive animate-pulse" : "text-foreground"}`}>
            <Clock className="h-3.5 w-3.5" />
            {formatTime(globalTimeRemaining)}
          </div>
          <span className="font-mono text-[13px] text-muted-foreground">
            Q {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-[1fr_360px]">
        {/* Left column: stage + question */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Stage / camera */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] border border-border bg-[radial-gradient(circle_at_50%_38%,color-mix(in_oklab,var(--accent)_10%,var(--secondary)),var(--background))]"
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover ${!isCameraOn && "hidden"}`}
            />

            {/* Camera-off / preview placeholder */}
            {!isCameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-accent/30">
                  {isRecording && (
                    <span className="absolute inset-0 rounded-full border border-accent/40 animate-pulse-ring" />
                  )}
                  <span className="font-display text-4xl font-semibold text-accent">
                    {userInitials}
                  </span>
                </div>
                <p className="font-mono text-[11px] tracking-[0.08em] text-faint">camera preview</p>
              </div>
            )}

            {/* "You" label */}
            <span className="absolute left-4 top-4 rounded-[10px] border border-border bg-background/60 px-3 py-1.5 text-xs backdrop-blur-sm">
              You
            </span>

            {/* AI interviewer PiP */}
            <div className="absolute bottom-4 right-4 w-44 overflow-hidden rounded-[16px] border border-border bg-gradient-to-br from-card to-popover shadow-xl">
              <div className="flex h-24 items-center justify-center bg-[radial-gradient(circle_at_50%_40%,var(--accent-soft),transparent_70%)]">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-[0_0_22px_var(--glow)]">
                  <span className="absolute inset-0 rounded-full border border-accent/40 animate-pulse-ring" />
                  <Sparkles className="h-5 w-5 text-accent-foreground" />
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium">AI Interviewer</span>
                <span className="flex h-3.5 items-end gap-0.5">
                  <span className="h-full w-[3px] rounded-[2px] bg-accent animate-eq-bar" />
                  <span className="h-full w-[3px] rounded-[2px] bg-accent animate-eq-bar" style={{ animationDelay: ".15s" }} />
                  <span className="h-full w-[3px] rounded-[2px] bg-accent animate-eq-bar" style={{ animationDelay: ".3s" }} />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Question + waveform */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="shrink-0 rounded-[20px] border border-border bg-card/80 p-5 backdrop-blur-sm"
          >
            <div className="mb-2 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
              <span>Current question · {String(currentQuestionIndex + 1).padStart(2, "0")}</span>
              {currentQuestion?.category && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] capitalize tracking-normal">
                  {currentQuestion.category}
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl font-medium leading-snug text-card-foreground text-pretty">
              {currentQuestion?.question}
            </h2>
          </motion.div>
        </div>

        {/* Right column: analysis + tip + controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex min-h-0 flex-col gap-4"
        >
          {/* Session details */}
          <div className="rounded-[20px] border border-border bg-card/80 p-5 backdrop-blur-sm">
            <h3 className="mb-4 font-display text-base font-semibold">Session</h3>
            <dl className="space-y-3 text-sm">
              {sessionMeta.jobTitle && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="text-right font-medium text-card-foreground">{sessionMeta.jobTitle}</dd>
                </div>
              )}
              {sessionMeta.sessionType && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium capitalize text-card-foreground">{sessionMeta.sessionType}</dd>
                </div>
              )}
              {sessionMeta.difficulty && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Difficulty</dt>
                  <dd>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${sessionMeta.difficulty.toLowerCase() === "easy"
                          ? "bg-success/15 text-success"
                          : sessionMeta.difficulty.toLowerCase() === "hard"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning"
                        }`}
                    >
                      {sessionMeta.difficulty}
                    </span>
                  </dd>
                </div>
              )}
            </dl>

            {sessionMeta.skills.length > 0 && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  Focus skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sessionMeta.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-[20px] border border-border bg-card/80 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Progress</h3>
              <span className="font-mono text-xs text-muted-foreground">
                {currentQuestionIndex} / {questions.length} done
              </span>
            </div>
            <ol className="space-y-2">
              {questions.map((q, index) => {
                const done = index < currentQuestionIndex;
                const active = index === currentQuestionIndex;
                return (
                  <li
                    key={q.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${active
                        ? "border-accent/40 bg-accent/10"
                        : "border-transparent"
                      }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${done
                          ? "bg-success/20 text-success"
                          : active
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                    >
                      {done ? "✓" : String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`truncate ${active ? "text-card-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/70"}`}
                    >
                      {q.question}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Controls — pinned bottom */}
          <div className="mt-auto flex items-center justify-end gap-2.5">
            <button
              onClick={toggleMic}
              title={isMicOn ? "Mute mic" : "Unmute mic"}
              className={`flex h-12 w-12 items-center justify-center rounded-[14px] border border-border transition-colors ${isMicOn ? "bg-card text-foreground hover:border-accent/40" : "bg-destructive/10 text-destructive"
                }`}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleCamera}
              title={isCameraOn ? "Turn off camera" : "Turn on camera"}
              className={`flex h-12 w-12 items-center justify-center rounded-[14px] border border-border transition-colors ${isCameraOn ? "bg-card text-foreground hover:border-accent/40" : "bg-destructive/10 text-destructive"
                }`}
            >
              {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setSpeakPreference(!speakQuestionsAloud)}
              title={speakQuestionsAloud ? "Stop reading questions aloud" : "Read questions aloud"}
              className={`flex h-12 w-12 items-center justify-center rounded-[14px] border border-border transition-colors ${speakQuestionsAloud ? "border-accent/40 bg-accent/15 text-accent" : "bg-card text-foreground hover:border-accent/40"
                }`}
            >
              <Captions className="h-5 w-5" />
            </button>

            {!isLastQuestion && (
              <Button
                onClick={handleNextQuestion}
                disabled={isProcessing}
                className="h-12 bg-accent px-4 font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-80"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Next <ArrowRight className="ml-1.5 h-4 w-4" /></>
                )}
              </Button>
            )}
            <Button
              onClick={isLastQuestion ? handleNextQuestion : finishInterview}
              disabled={isProcessing}
              className="h-12 bg-destructive px-4 font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-80"
            >
              {isProcessing && isLastQuestion ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>End &amp; review <ArrowRight className="ml-1.5 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
