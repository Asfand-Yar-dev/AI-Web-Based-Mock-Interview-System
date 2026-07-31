"""
Facial Expression Analysis Module for Mock Interview System

This module provides real-time facial expression detection and emotion analysis
using the DeepFace library. It derives interview-relevant metrics such as
Confidence, Nervousness, Engagement, and Eye Contact and offers a session-level
feedback report at the end of a recording session.

Author: AI Developer Team
Date: 2026-01-21  (Updated: 2026-02-18)
"""

import time
import numpy as np
from collections import deque
from deepface import DeepFace
import cv2
from typing import Optional, Dict, List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FacialExpressionModel:
    """
    Real-time facial expression analyser with emotion stabilisation,
    eye-contact detection (Haar Cascades), and interview-metric scoring.

    Attributes
    ----------
    history_size : int
        Rolling buffer size for emotion stabilisation.
    emotion_history : deque
        Recent dominant-emotion labels.
    frame_count : int
        Total frames submitted to `analyze_frame`.
    face_cascade, eye_cascade : cv2.CascadeClassifier
        Haar cascades for face / eye detection.
    """

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------
    def __init__(self, history_size: int = 5):
        logger.info("Initializing Facial Expression Model...")

        self.history_size = history_size
        self.emotion_history: deque = deque(maxlen=history_size)
        self.frame_count: int = 0

        # --- Haar Cascades for eye-contact ---
        face_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        eye_path  = cv2.data.haarcascades + "haarcascade_eye.xml"

        self.face_cascade = cv2.CascadeClassifier(face_path)
        self.eye_cascade  = cv2.CascadeClassifier(eye_path)

        if self.face_cascade.empty():
            logger.warning(f"Failed to load face cascade from {face_path}")
        if self.eye_cascade.empty():
            logger.warning(f"Failed to load eye cascade from {eye_path}")

        # --- Session-level tracking ---
        self._init_session()

        # --- Warm-up ---
        self._warmup_model()

        logger.info("✓ Model initialized and warmed up successfully!")

    def _init_session(self):
        """Reset all session accumulators."""
        self._session = {
            "start_time": time.time(),
            "confidence": [],
            "nervousness": [],
            "engagement": [],
            "eye_contact": [],
            "emotions": [],
            "face_present_count": 0,
            "total_analyzed": 0,
        }

    # ------------------------------------------------------------------
    # Warm-up
    # ------------------------------------------------------------------
    def _warmup_model(self):
        try:
            logger.info("Warming up model (loading weights)...")
            dummy = np.zeros((224, 224, 3), dtype=np.uint8)
            DeepFace.analyze(
                img_path=dummy,
                actions=["emotion"],
                enforce_detection=False,
                detector_backend="opencv",
                silent=True,
            )
            logger.info("✓ Model warmup complete!")
        except Exception as e:
            logger.warning(f"Warmup issue (usually harmless): {e}")

    # ------------------------------------------------------------------
    # Eye-contact (Haar Cascades)
    # ------------------------------------------------------------------
    def _detect_eye_contact(self, frame: np.ndarray) -> float:
        """
        Returns
        -------
        float
            100  – face AND eyes visible (looking at camera)
             50  – face visible, no eyes (looking away / down)
              0  – no face at all
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.3, minNeighbors=5, minSize=(60, 60)
        )
        if len(faces) == 0:
            return 0.0
        # Extra guard: ignore tiny noise detections from dark/covered cameras
        faces = [f for f in faces if f[2] >= 30 and f[3] >= 30]
        if len(faces) == 0:
            return 0.0

        fx, fy, fw, fh = max(faces, key=lambda r: r[2] * r[3])
        roi = gray[fy : fy + fh, fx : fx + fw]
        eyes = self.eye_cascade.detectMultiScale(
            roi, scaleFactor=1.1, minNeighbors=5, minSize=(20, 20)
        )
        return 100.0 if len(eyes) >= 1 else 50.0

    # ------------------------------------------------------------------
    # Emotion stabilisation
    # ------------------------------------------------------------------
    def _get_most_common_emotion(self) -> Optional[str]:
        if not self.emotion_history:
            return None
        arr = np.array(list(self.emotion_history))
        unique, counts = np.unique(arr, return_counts=True)
        return unique[np.argmax(counts)]

    # ------------------------------------------------------------------
    # Interview-metric computation
    # ------------------------------------------------------------------
    @staticmethod
    def _compute_interview_metrics(
        all_emotions: Dict[str, float],
        eye_contact_score: float,
        is_face_present: bool,
    ) -> Dict[str, float]:
        """
        Derive Confidence / Nervousness / Engagement from raw emotion
        probabilities (which sum to ~100) and the eye-contact score.

        Returns dict with keys ``confidence``, ``nervousness``, ``engagement``.
        """
        if not is_face_present or not all_emotions:
            return {"confidence": 0.0, "nervousness": 0.0, "engagement": 0.0}

        happy   = all_emotions.get("happy", 0.0)
        neutral = all_emotions.get("neutral", 0.0)
        surprise = all_emotions.get("surprise", 0.0)
        angry   = all_emotions.get("angry", 0.0)
        disgust = all_emotions.get("disgust", 0.0)
        sad     = all_emotions.get("sad", 0.0)
        fear    = all_emotions.get("fear", 0.0)

        # --- Confidence (higher is better) ---
        confidence = (
            happy * 1.00
            + neutral * 0.65
            + surprise * 0.40
            + angry * 0.25
            + disgust * 0.15
            + sad * 0.10
            + fear * 0.05
        )
        confidence = float(np.clip(confidence, 0, 100))

        # --- Nervousness (lower is better for the candidate) ---
        nervousness = (
            fear * 1.00
            + sad * 0.70
            + surprise * 0.50
            + disgust * 0.40
            + angry * 0.30
            + neutral * 0.10
            + happy * 0.00
        )
        nervousness = float(np.clip(nervousness, 0, 100))

        # --- Engagement (higher is better) ---
        emotion_activity = 100.0 - neutral  # more expressive = more engaged
        engagement = (
            0.50 * eye_contact_score
            + 0.30 * emotion_activity
            + 0.20 * (100.0 if is_face_present else 0.0)
        )
        engagement = float(np.clip(engagement, 0, 100))

        return {
            "confidence": round(confidence, 1),
            "nervousness": round(nervousness, 1),
            "engagement": round(engagement, 1),
        }

    # ------------------------------------------------------------------
    # Main analysis entry-point
    # ------------------------------------------------------------------
    def analyze_frame(self, frame: np.ndarray) -> Dict:
        """
        Analyse *one* BGR frame and return all results.

        Returns
        -------
        dict  with keys:
            success, emotion, raw_emotion, confidence, facial_score,
            eye_contact_score, is_face_present, all_emotions,
            face_coordinates, interview_metrics, error
        """
        self.frame_count += 1

        # --- safe defaults ---
        is_face_present = False
        eye_contact_score = 0.0
        emotion = "neutral"
        raw_emotion = "neutral"
        confidence = 0.0
        all_emotions: Dict = {}
        face_coords: Optional[Dict] = None
        error_msg: Optional[str] = None
        success = False

        # 1) Eye-contact (lightweight) ---
        try:
            eye_contact_score = self._detect_eye_contact(frame)
        except Exception:
            eye_contact_score = 0.0

        # 2) DeepFace emotion analysis ---
        try:
            analysis = DeepFace.analyze(
                img_path=frame,
                actions=["emotion"],
                enforce_detection=False,
                detector_backend="opencv",
                silent=True,
            )
            face_data = analysis[0] if isinstance(analysis, list) else analysis

            emotions = face_data.get("emotion", {})
            dominant = face_data.get("dominant_emotion", "neutral")
            conf = emotions.get(dominant, 0.0)

            region = face_data.get("region", {})
            fc = {
                "x": region.get("x", 0),
                "y": region.get("y", 0),
                "w": region.get("w", 0),
                "h": region.get("h", 0),
            }

            # Require a minimum face region of 30x30 px.
            if fc["w"] >= 30 and fc["h"] >= 30:
                # If DeepFace failed to find a box, it returns the whole frame.
                # Reject it only if the frame is extremely dark (camera covered).
                is_full_frame = (fc["w"] >= frame.shape[1] - 10) and (fc["h"] >= frame.shape[0] - 10)
                mean_brightness = np.mean(frame)
                
                if is_full_frame and mean_brightness < 15.0:
                    is_face_present = False
                else:
                    is_face_present = True
                    emotion = dominant
                    raw_emotion = dominant
                    confidence = round(conf, 2)
                    all_emotions = emotions
                    face_coords = fc
                    success = True
                    self.emotion_history.append(dominant)

        except (ValueError, Exception) as e:
            is_face_present = False
            emotion = "neutral"
            confidence = 0.0
            eye_contact_score = 0.0
            error_msg = str(e)
            logger.debug(f"Frame {self.frame_count} analysis failed: {e}")

        # 3) Stabilised emotion ---
        stabilised = self._get_most_common_emotion()
        if stabilised and is_face_present:
            emotion = stabilised

        # 4) Interview metrics ---
        interview_metrics = self._compute_interview_metrics(
            all_emotions, eye_contact_score, is_face_present
        )

        # 5) Session tracking ---
        self._session["total_analyzed"] += 1
        if is_face_present:
            self._session["face_present_count"] += 1
            self._session["confidence"].append(interview_metrics["confidence"])
            self._session["nervousness"].append(interview_metrics["nervousness"])
            self._session["engagement"].append(interview_metrics["engagement"])
            self._session["eye_contact"].append(eye_contact_score)
            self._session["emotions"].append(emotion)

        return {
            "success": success,
            "emotion": emotion,
            "raw_emotion": raw_emotion,
            "confidence": confidence,
            "facial_score": confidence,
            "eye_contact_score": eye_contact_score,
            "is_face_present": is_face_present,
            "all_emotions": all_emotions,
            "face_coordinates": face_coords,
            "interview_metrics": interview_metrics,
            "error": error_msg,
        }

    # ------------------------------------------------------------------
    # Session feedback
    # ------------------------------------------------------------------
    def get_session_feedback(self) -> Dict:
        """
        Generate a comprehensive end-of-session feedback report.

        Returns
        -------
        dict  with average scores, qualitative text, and an overall rating.
        """
        s = self._session
        total = s["total_analyzed"]
        if total == 0:
            return {"error": "No frames were analyzed during this session."}

        duration = time.time() - s["start_time"]
        face_rate = (s["face_present_count"] / total) * 100.0

        def _avg(lst: List[float]) -> float:
            return float(np.mean(lst)) if lst else 0.0

        avg_conf = round(_avg(s["confidence"]), 1)
        avg_nerv = round(_avg(s["nervousness"]), 1)
        avg_eng  = round(_avg(s["engagement"]), 1)
        avg_eye  = round(_avg(s["eye_contact"]), 1)

        # Overall score (0-100, higher is better)
        overall = round(
            avg_conf * 0.30
            + (100 - avg_nerv) * 0.25
            + avg_eng * 0.25
            + avg_eye * 0.20,
            1,
        )

        # HARD PENALTY: If a real face was present in fewer than 40% of frames,
        # the camera was likely covered or the user was off-screen for most of the session.
        # Zero out all scores so fabricated body-language numbers don't appear.
        if face_rate < 40.0:
            avg_conf = 0.0
            avg_nerv = 100.0
            avg_eng = 0.0
            avg_eye = 0.0
            overall = 0.0

        # Emotion distribution
        if s["emotions"]:
            arr = np.array(s["emotions"])
            unique, counts = np.unique(arr, return_counts=True)
            dist = {e: int(c) for e, c in zip(unique, counts)}
        else:
            dist = {}

        return {
            "duration_seconds": round(duration, 1),
            "total_frames_analyzed": total,
            "face_presence_rate": round(face_rate, 1),
            "avg_confidence": avg_conf,
            "avg_nervousness": avg_nerv,
            "avg_engagement": avg_eng,
            "avg_eye_contact": avg_eye,
            "overall_score": overall,
            "emotion_distribution": dist,
            "confidence_feedback": self._qualitative("confidence", avg_conf),
            "nervousness_feedback": self._qualitative("nervousness", avg_nerv),
            "engagement_feedback": self._qualitative("engagement", avg_eng),
            "eye_contact_feedback": self._qualitative("eye_contact", avg_eye),
            "overall_feedback": self._qualitative("overall", overall),
        }

    # ------------------------------------------------------------------
    @staticmethod
    def _qualitative(metric: str, score: float) -> str:
        """Return a human-readable feedback sentence for a metric/score pair."""
        templates = {
            "confidence": [
                (80, "Excellent confidence! You appeared very self-assured and composed throughout."),
                (60, "Good confidence level. You appeared fairly confident most of the time."),
                (40, "Moderate confidence. Try to maintain a calm, positive expression."),
                (0,  "Low confidence detected. Practice maintaining a relaxed, positive demeanour."),
            ],
            "nervousness": [
                (60, "High nervousness detected. Consider deep-breathing exercises before interviews."),
                (40, "Moderate nervousness. You showed some signs of discomfort — practice can help."),
                (20, "Slight nervousness, but mostly calm. Well managed overall."),
                (0,  "Very calm and composed. Minimal signs of nervousness — great job!"),
            ],
            "engagement": [
                (80, "Excellent engagement! You were expressive and attentive throughout."),
                (60, "Good engagement. You showed interest and stayed mostly attentive."),
                (40, "Moderate engagement. Try to show more interest through expressions."),
                (0,  "Low engagement detected. Work on being more expressive and maintaining attention."),
            ],
            "eye_contact": [
                (80, "Great eye contact! You maintained a strong connection with the camera."),
                (60, "Good eye contact overall, with occasional glances away."),
                (40, "Moderate eye contact. Try to look at the camera more consistently."),
                (0,  "Low eye contact. Practice looking directly at the camera during responses."),
            ],
            "overall": [
                (80, "Outstanding performance! You demonstrated strong interview presence."),
                (60, "Good performance overall. A few areas to polish for perfection."),
                (40, "Fair performance. Focused practice on the weaker areas will help a lot."),
                (0,  "Needs improvement. Review each metric and practice targeted exercises."),
            ],
        }
        for threshold, text in templates.get(metric, []):
            if score >= threshold:
                return text
        return ""

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------
    def reset_history(self):
        """Reset emotion history AND session accumulators."""
        self.emotion_history.clear()
        self._init_session()
        logger.info("Emotion history and session data reset")

    def get_statistics(self) -> Dict:
        """Backward-compatible statistics (emotion distribution from history)."""
        if not self.emotion_history:
            return {
                "total_frames": self.frame_count,
                "analyzed_frames": 0,
                "emotion_distribution": {},
            }
        arr = np.array(list(self.emotion_history))
        unique, counts = np.unique(arr, return_counts=True)
        return {
            "total_frames": self.frame_count,
            "analyzed_frames": len(self.emotion_history),
            "emotion_distribution": {e: int(c) for e, c in zip(unique, counts)},
        }
