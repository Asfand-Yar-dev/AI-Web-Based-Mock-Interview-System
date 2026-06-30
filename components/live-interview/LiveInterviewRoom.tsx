"use client";

/**
 * LiveInterviewRoom — Premium Live Interview Feature
 * ---------------------------------------------------
 * Professional full-screen 1-on-1 video room over WebRTC, signalled via Socket.IO.
 * Records the user's local stream with MediaRecorder so the chunks can be
 * uploaded to cloud storage after the call (for the async AI pipeline).
 *
 * Source: Doc/premium_live_interview_architecture.md §3 Step 3 + §5.4
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  Upload,
  CheckCircle2,
  ClipboardCheck,
  Brain,
} from "lucide-react";
import { API_BASE_URL, SOCKET_IO_PATH, STORAGE_KEYS } from "@/lib/api-config";
import { liveInterviewApi } from "@/lib/liveInterviewApi";

interface Props {
  bookingId: string;
  meetingRoomId: string;
  /**
   * Whether the current viewer is the applicant (candidate). Only the
   * applicant records and uploads their stream for the AI pipeline — the
   * backend rejects recording uploads from anyone else.
   */
  isApplicant?: boolean;
  /** Called after recording upload completes */
  onEnded?: () => void;
  /** Name shown on local feed label */
  localName?: string;
  /** Name shown on remote feed label */
  remoteName?: string;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

type Phase = "idle" | "connecting" | "in-call" | "ended" | "uploading" | "feedback" | "done" | "error";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Initialising…",
  connecting: "Connecting…",
  "in-call": "Connected",
  ended: "Call ended",
  uploading: "Uploading recording…",
  feedback: "Awaiting your feedback",
  done: "Processing complete",
  error: "Connection error",
};

// Dimensions the interviewer scores after the call — the same set the AI
// evaluates (face, voice, confidence, …). Each 0–100; the overall score
// auto-fills with their average but stays editable.
const FB_DIMENSIONS = [
  { key: "confidence", label: "Confidence" },
  { key: "communication", label: "Communication" },
  { key: "technical", label: "Technical Knowledge" },
  { key: "problemSolving", label: "Problem Solving" },
  { key: "bodyLanguage", label: "Body Language / Facial" },
  { key: "voiceClarity", label: "Voice & Clarity" },
] as const;

type FbDimensionKey = (typeof FB_DIMENSIONS)[number]["key"];

function scoreColor(v: number): string {
  return v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#ef4444";
}

function FbDimensionSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/80">{label}</span>
        <span className="text-xs font-bold tabular-nums" style={{ color: scoreColor(value) }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-current"
        style={{ color: scoreColor(value) }}
      />
    </div>
  );
}

export function LiveInterviewRoom({ bookingId, meetingRoomId, isApplicant = true, onEnded, localName = "You", remoteName = "Interviewer" }: Props) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // ── Real-time facial analysis state (applicant only) ──
  const [liveFaceScore, setLiveFaceScore] = useState<number | null>(null);
  const [liveFaceEmotion, setLiveFaceEmotion] = useState<string>("");
  const [faceCaptureActive, setFaceCaptureActive] = useState(false);

  // ── Interviewer feedback form (shown after the interviewer ends the call) ──
  const [fbDims, setFbDims] = useState<Record<FbDimensionKey, number>>(() =>
    FB_DIMENSIONS.reduce((acc, d) => ({ ...acc, [d.key]: 70 }), {} as Record<FbDimensionKey, number>)
  );
  const [fbScore, setFbScore] = useState(70);
  const [fbScoreTouched, setFbScoreTouched] = useState(false);
  const [fbFeedback, setFbFeedback] = useState("");
  const [fbTranscript, setFbTranscript] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);

  // ── Timer ──
  useEffect(() => {
    if (phase === "in-call") {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Real-time facial frame capture (applicant only, every 15 s during call) ──
  useEffect(() => {
    if (phase !== "in-call" || !isApplicant) return;

    const canvas = document.createElement("canvas");
    setFaceCaptureActive(true);

    const captureFrame = async () => {
      const video = localVideoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Draw un-mirrored frame (CSS mirror is display-only)
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const form = new FormData();
          form.append("frame", blob, "frame.jpg");
          const token = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
          const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/frame-capture`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: form,
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data && !json.data.skipped) {
              const d = json.data;
              const score = d.overall_score ?? d.session_feedback?.overall_score;
              const emotion = d.dominant_emotion ?? d.session_feedback?.dominant_emotion ?? "";
              if (typeof score === "number") setLiveFaceScore(Math.round(score));
              if (emotion) setLiveFaceEmotion(emotion);
            }
          }
        } catch {
          // Silent — frame capture failure must not disrupt the call
        }
      }, "image/jpeg", 0.85);
    };

    // First capture after 5 s, then every 15 s
    const firstShot = setTimeout(() => {
      captureFrame();
      frameIntervalRef.current = setInterval(captureFrame, 15_000);
    }, 5_000);

    return () => {
      clearTimeout(firstShot);
      if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
      setFaceCaptureActive(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isApplicant]);

  // ── Start WebRTC ──
  useEffect(() => {
    let cancelled = false;

    async function start() {
      setPhase("connecting");
      try {
        // 1. Hardware permissions
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) return;
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // 2. RTCPeerConnection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = ev.streams[0];
            // Explicitly play — catch autoplay-with-sound blocks
            remoteVideoRef.current.play().catch(() => {
              console.warn("Autoplay blocked — showing unmute button");
              setAudioBlocked(true);
            });
          }
          setRemoteConnected(true);
        };

        // 3. Local recording for the AI pipeline (applicant only — the backend
        //    only accepts the applicant's recording).
        if (isApplicant) {
          try {
            const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.start(2000);
            recorderRef.current = mr;
          } catch (recErr) {
            console.warn("MediaRecorder unavailable — recording disabled.", recErr);
          }
        }

        // 4. Socket.IO signalling
        const { io } = await import("socket.io-client");
        const token = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
        const socket = io(API_BASE_URL, {
          path: SOCKET_IO_PATH,
          auth: { token: token || "" },
          transports: ["websocket"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join-room", { roomId: meetingRoomId }, (ack: any) => {
            if (!ack?.ok) { setErrorMsg(ack?.error || "Could not join room"); setPhase("error"); }
          });
        });

        socket.on("peer-joined", async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { roomId: meetingRoomId, sdp: offer });
        });

        socket.on("offer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { roomId: meetingRoomId, sdp: answer });
        });

        socket.on("answer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on("ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { }
        });

        pc.onicecandidate = (ev) => {
          if (ev.candidate) socket.emit("ice-candidate", { roomId: meetingRoomId, candidate: ev.candidate });
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") setPhase("in-call");
          if (["failed", "disconnected"].includes(pc.connectionState)) {
            setErrorMsg("Connection lost"); setPhase("error");
          }
        };
      } catch (err: any) {
        setErrorMsg(err?.message || "Failed to start the room");
        setPhase("error");
      }
    }

    start();
    return () => { cancelled = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingRoomId]);

  function cleanup() {
    try { socketRef.current?.emit("leave-room", { roomId: meetingRoomId }); } catch { }
    try { socketRef.current?.disconnect(); } catch { }
    try { pcRef.current?.close(); } catch { }
    // NOTE: Do NOT stop recorderRef here — endCall() handles it to ensure
    // the final data chunk is captured before creating the upload Blob.
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch { }
    if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
  }

  async function endCall() {
    setPhase("ended");

    // Interviewer: collect manual feedback (score + notes + optional Q&A
    // transcript). Submitting triggers the AI analysis + combined/average score
    // on the backend, then routes everyone to the 360° report.
    if (!isApplicant) {
      cleanup();
      setPhase("feedback");
      return;
    }

    // Applicant: stop the recorder gracefully, wait for the final data
    // chunk to arrive via ondataavailable, THEN create the Blob and upload.
    // This prevents truncated .webm files that DeepFace can't analyze.
    setPhase("uploading");
    try {
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });
      }

      const blob = new Blob(chunksRef.current, { type: "video/webm" });

      // Now clean up signalling, peer connection, and media tracks
      cleanup();

      await uploadRecording(bookingId, blob);
      setPhase("done");
      onEnded?.();
    } catch (err: any) {
      cleanup();
      setErrorMsg(err?.message || "Upload failed");
      setPhase("error");
    }
  }

  async function submitFeedback() {
    setFbError(null);
    if (fbEffectiveScore < 0 || fbEffectiveScore > 100) {
      setFbError("Score must be between 0 and 100.");
      return;
    }
    setFbSubmitting(true);
    try {
      await liveInterviewApi.submitInterviewerFeedback(
        bookingId,
        fbEffectiveScore,
        fbFeedback.trim() || undefined,        // mistakes / tips — optional
        fbTranscript.trim() || undefined,
        fbDims,
      );
      setPhase("done");
      onEnded?.();
    } catch (err: any) {
      setFbError(err?.message || "Failed to submit feedback. Please try again.");
      setFbSubmitting(false);
    }
  }

  // ── Controls ──
  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  }, []);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  }, []);

  const isActive = ["connecting", "in-call"].includes(phase);

  // ── Format timer ──
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // Overall score auto-fills with the average of the dimension scores, but the
  // interviewer can override it by dragging the overall slider.
  const fbDimsAvg = Math.round(
    FB_DIMENSIONS.reduce((sum, d) => sum + (fbDims[d.key] ?? 0), 0) / FB_DIMENSIONS.length
  );
  const fbEffectiveScore = fbScoreTouched ? fbScore : fbDimsAvg;
  const fbScoreColor = scoreColor(fbEffectiveScore);

  function setFbDim(key: FbDimensionKey, v: number) {
    setFbDims((prev) => ({ ...prev, [key]: v }));
    setFbError(null);
  }

  return (
    <div className="relative flex h-screen w-full flex-col bg-black">
      {/* ── Remote video (full screen) ── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Mirrored to match the self-view so both feeds read the same way
            (raising your right hand shows on the right). */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ transform: "scaleX(-1)" }}
          className="h-full w-full object-cover"
        />

        {/* Tap-to-unmute overlay (shown when browser blocks autoplay audio) */}
        {audioBlocked && (
          <button
            onClick={() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.play().then(() => setAudioBlocked(false)).catch(() => { });
              }
            }}
            className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg animate-pulse hover:bg-accent/80 transition-colors"
          >
            🔊 Tap to Unmute Audio
          </button>
        )}

        {/* Remote label */}
        {remoteConnected && (
          <div className="absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <p className="text-sm font-medium text-white">{remoteName}</p>
          </div>
        )}

        {/* Waiting overlay (no remote yet) */}
        {!remoteConnected && phase !== "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-sm text-white/70">
              {phase === "connecting" ? "Requesting camera & connecting…" : "Waiting for the other participant…"}
            </p>
          </div>
        )}

        {/* Error overlay */}
        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-white/70">{errorMsg}</p>
          </div>
        )}

        {/* Status overlays (upload / done) */}
        <AnimatePresence>
          {(phase === "uploading" || phase === "done") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85"
            >
              {phase === "uploading" ? (
                <>
                  <Upload className="h-10 w-10 animate-pulse text-accent" />
                  <p className="text-base font-medium text-white">Uploading recording…</p>
                  <p className="text-xs text-white/50">This may take a moment</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-10 w-10 text-success" />
                  <p className="text-base font-medium text-white">Upload complete</p>
                  <p className="text-xs text-white/50">AI analysis will begin shortly (~10 min)</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Top HUD ── */}
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          {/* Connection status */}
          <div className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            {phase === "in-call" ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-warning" />
            )}
            <span className="text-xs font-medium text-white">{PHASE_LABEL[phase]}</span>
          </div>

          {/* Timer */}
          {phase === "in-call" && (
            <div className="rounded-lg bg-black/60 px-3 py-1.5 backdrop-blur-sm font-mono text-sm text-white">
              {hh}:{mm}:{ss}
            </div>
          )}

          {/* Live facial analysis badge (applicant only) */}
          {phase === "in-call" && isApplicant && faceCaptureActive && (
            <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              {liveFaceScore !== null ? (
                <span className="text-xs text-white/80">
                  Face&nbsp;<span className="font-bold text-white tabular-nums">{liveFaceScore}</span>
                  {liveFaceEmotion && (
                    <span className="ml-1 text-white/50 capitalize">{liveFaceEmotion}</span>
                  )}
                </span>
              ) : (
                <span className="text-xs text-white/50">Analyzing…</span>
              )}
            </div>
          )}
        </div>

        {/* ── Local PiP video (bottom-right) ── */}
        <div className="absolute bottom-20 right-4 w-36 overflow-hidden rounded-xl border-2 border-white/10 bg-black shadow-2xl md:w-48">
          {/* Mirror the local self-view (scaleX(-1)) so it behaves like a real
              mirror: raising your right hand shows on the right. The remote
              peer's video is NOT mirrored. */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ transform: "scaleX(-1)" }}
            className={`h-full w-full object-cover transition-opacity ${camOn ? "opacity-100" : "opacity-20"}`}
          />
          {/* Local label */}
          <div className="absolute bottom-1 left-2">
            <p className="text-[10px] font-medium text-white/80">{localName}</p>
          </div>
          {/* Cam off indicator */}
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoOff className="h-6 w-6 text-white/50" />
            </div>
          )}
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div className="flex h-16 shrink-0 items-center justify-center gap-4 bg-black/90 px-6 backdrop-blur-sm">
        {/* Mic */}
        <button
          onClick={toggleMic}
          disabled={!isActive}
          title={micOn ? "Mute mic" : "Unmute mic"}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${micOn
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-destructive/80 hover:bg-destructive text-white"
            }`}
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={toggleCam}
          disabled={!isActive}
          title={camOn ? "Turn off camera" : "Turn on camera"}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${camOn
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-destructive/80 hover:bg-destructive text-white"
            }`}
        >
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        {/* End call */}
        {isActive && (
          <button
            onClick={endCall}
            title="End interview"
            className="flex h-13 w-28 items-center justify-center gap-2 rounded-full bg-destructive px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-destructive/80"
          >
            <PhoneOff className="h-4 w-4" />
            End Call
          </button>
        )}
      </div>

      {/* ── Interviewer feedback form (after the interviewer ends the call) ── */}
      <AnimatePresence>
        {phase === "feedback" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/90 p-4 backdrop-blur-sm sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
                  <ClipboardCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Interview Feedback</h2>
                  <p className="text-xs text-white/50">Your score and notes complete the candidate&apos;s 360° report.</p>
                </div>
              </div>

              {/* Per-dimension scores */}
              <label className="mb-2 block text-sm font-medium text-white/80">
                Rate the candidate on each dimension
              </label>
              <div className="mb-5 grid grid-cols-1 gap-x-5 gap-y-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
                {FB_DIMENSIONS.map((d) => (
                  <FbDimensionSlider
                    key={d.key}
                    label={d.label}
                    value={fbDims[d.key]}
                    onChange={(v) => setFbDim(d.key, v)}
                  />
                ))}
              </div>

              {/* Overall score (auto-averaged, editable) */}
              <label className="mb-2 flex items-center justify-between text-sm font-medium text-white/80">
                <span>Overall Score</span>
                {!fbScoreTouched && <span className="text-xs text-accent">auto-averaged · editable</span>}
              </label>
              <div className="mb-5 flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={fbEffectiveScore}
                  onChange={(e) => { setFbScoreTouched(true); setFbScore(Number(e.target.value)); }}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-current"
                  style={{ color: fbScoreColor }}
                />
                <span className="w-12 text-right text-2xl font-bold tabular-nums" style={{ color: fbScoreColor }}>
                  {fbEffectiveScore}
                </span>
              </div>

              {/* Optional written feedback — mistakes & tips */}
              <label className="mb-2 block text-sm font-medium text-white/80">
                Mistakes &amp; Tips <span className="text-white/40">(optional)</span>
              </label>
              <textarea
                value={fbFeedback}
                onChange={(e) => setFbFeedback(e.target.value)}
                rows={4}
                placeholder="Optional — note any mistakes and tips to improve…"
                className="mb-5 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-accent/50 focus:outline-none"
              />

              {/* Q&A transcript */}
              <label className="mb-2 block text-sm font-medium text-white/80">
                Q&amp;A Transcript <span className="text-white/40">(optional — improves AI accuracy)</span>
              </label>
              <textarea
                value={fbTranscript}
                onChange={(e) => setFbTranscript(e.target.value)}
                rows={4}
                placeholder={"Paste the questions you asked and the candidate's answers, e.g.\nQ: ...\nA: ..."}
                className="mb-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-accent/50 focus:outline-none"
              />
              <div className="mb-5 flex items-start gap-2 text-xs text-white/40">
                <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  AI analysis always runs. Adding the Q&amp;A transcript gives the AI full context to
                  score technical depth and problem-solving more precisely.
                </span>
              </div>

              {fbError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {fbError}
                </div>
              )}

              <button
                onClick={submitFeedback}
                disabled={fbSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {fbSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting &amp; running AI analysis…
                  </>
                ) : (
                  <>Submit Feedback &amp; Generate Report</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Upload the recorded blob to the backend.
 * In production this hits a presigned S3 URL. For dev/FYP a base64 fallback
 * is used. Replace with real upload once S3 is wired.
 */
async function uploadRecording(bookingId: string, blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("recording", blob, `${bookingId}.webm`);

  const token = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
  const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/upload-recording`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${txt}`);
  }
  const data = await res.json();
  return data.recordingUrl as string;
}
