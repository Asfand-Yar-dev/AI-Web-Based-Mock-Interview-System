"""
Fusion Engine Module — Smart Mock Interview System
====================================================
Combines Voice (Wav2Vec2) and Facial (DeepFace) analysis scores into a
single *Behavioral Score* using a deterministic weighted formula.

Formula
-------
    Behavioral Score = (0.6 × Voice Score) + (0.4 × Facial Score)

The module is **purely mathematical / rule-based** — no neural networks
are loaded or executed here.

Author : Intervexa Team
Created: 2026-02-18
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class FusionEngine:
    """Fuses voice-analysis and facial-analysis outputs into a unified
    Behavioral Score with human-readable feedback.

    Attributes
    ----------
    VOICE_WEIGHT : float
        Weight applied to the voice score (default 0.6).
    FACE_WEIGHT : float
        Weight applied to the facial score (default 0.4).
    """

    VOICE_WEIGHT: float = 0.6
    FACE_WEIGHT: float = 0.4

    # ------------------------------------------------------------------ #
    #  Score-range → label & feedback mapping                             #
    # ------------------------------------------------------------------ #
    _FEEDBACK_RULES: list[dict[str, Any]] = [
        {
            "min": 90,
            "max": 100,
            "label": "Outstanding",
            "feedback": (
                "Outstanding non-verbal communication! Your voice and "
                "facial expressions were highly aligned and confident."
            ),
        },
        {
            "min": 80,
            "max": 89.99,
            "label": "Excellent",
            "feedback": (
                "Excellent non-verbal communication. You demonstrated "
                "strong vocal control and positive facial cues."
            ),
        },
        {
            "min": 70,
            "max": 79.99,
            "label": "Good",
            "feedback": (
                "Good performance. Minor improvements in either vocal "
                "tone or facial expression could elevate your delivery."
            ),
        },
        {
            "min": 60,
            "max": 69.99,
            "label": "Satisfactory",
            "feedback": (
                "Satisfactory performance. Consider practicing a more "
                "steady tone and maintaining natural facial expressions."
            ),
        },
        {
            "min": 50,
            "max": 59.99,
            "label": "Needs Improvement",
            "feedback": (
                "Your delivery needs improvement. Focus on projecting "
                "confidence through your voice and keeping consistent "
                "eye contact."
            ),
        },
        {
            "min": 0,
            "max": 49.99,
            "label": "Poor",
            "feedback": (
                "Try to maintain better eye contact and a steady voice. "
                "Practice speaking clearly and keeping a calm, composed "
                "facial expression."
            ),
        },
    ]

    # ------------------------------------------------------------------ #
    #  Public API                                                         #
    # ------------------------------------------------------------------ #

    def fuse_scores(
        self,
        voice_data: Optional[Dict[str, Any]] = None,
        face_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Combine voice and facial analysis into a Behavioral Score.

        Parameters
        ----------
        voice_data : dict | None
            ``{'score': float, 'emotion': str}`` from the Wav2Vec2 vocal
            analysis pipeline.  Defaults to ``{'score': 0, 'emotion': 'N/A'}``
            when *None* or when keys are missing.
        face_data : dict | None
            ``{'score': float, 'emotion': str}`` from the DeepFace facial
            analysis pipeline.  Defaults the same way.

        Returns
        -------
        dict
            ``{
                "final_score": float,      # 0-100
                "label": str,              # e.g. "Excellent"
                "feedback": str,           # rule-based feedback string
                "voice_emotion": str,      # detected vocal emotion
                "face_emotion": str,       # detected facial emotion
                "emotion_summary": str     # combined dynamic summary
            }``
        """

        # -- 1. Safely extract scores & emotions ---------------------- #
        voice_score, voice_emotion = self._extract(voice_data, "Voice")
        face_score, face_emotion = self._extract(face_data, "Face")

        # -- 2. Apply the weighted formula ----------------------------- #
        raw_score: float = (
            self.VOICE_WEIGHT * voice_score
            + self.FACE_WEIGHT * face_score
        )

        # Clamp between 0 and 100
        final_score: float = round(min(max(raw_score, 0.0), 100.0), 2)

        # -- 3. Derive label & feedback -------------------------------- #
        label, feedback = self._get_feedback(final_score)

        # -- 4. Build dynamic emotion summary -------------------------- #
        emotion_summary = self._build_emotion_summary(
            voice_emotion, face_emotion
        )

        # -- 5. Construct the result dict ------------------------------ #
        return {
            "final_score": final_score,
            "label": label,
            "feedback": feedback,
            "voice_emotion": voice_emotion,
            "face_emotion": face_emotion,
            "emotion_summary": emotion_summary,
        }

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _extract(
        data: Optional[Dict[str, Any]], source_name: str
    ) -> tuple[float, str]:
        """Return ``(score, emotion)`` from a data dict, defaulting
        gracefully when the dict or individual keys are missing.
        """
        if data is None:
            return 0.0, "N/A"

        try:
            score = float(data.get("score", 0))
        except (TypeError, ValueError):
            score = 0.0

        emotion = str(data.get("emotion", "N/A")).strip() or "N/A"
        return score, emotion

    def _get_feedback(self, score: float) -> tuple[str, str]:
        """Map a score to its ``(label, feedback)`` pair using the
        rule-based feedback table.
        """
        for rule in self._FEEDBACK_RULES:
            if rule["min"] <= score <= rule["max"]:
                return rule["label"], rule["feedback"]

        # Fallback (should never trigger with valid 0-100 scores)
        return "Unknown", "Unable to determine feedback for this score."

    @staticmethod
    def _build_emotion_summary(
        voice_emotion: str, face_emotion: str
    ) -> str:
        """Create a dynamic, human-readable summary from the two
        detected emotions.

        Examples
        --------
        >>> FusionEngine._build_emotion_summary("Confident", "Neutral")
        'Your tone was Confident, and your facial expression appeared Neutral.'
        >>> FusionEngine._build_emotion_summary("Confident", "Nervous")
        'Your tone was Confident, but your facial expression appeared Nervous.'
        """

        # Emotions we consider "negative" or mismatched with a positive tone
        _NEGATIVE_FACE = {
            "nervous", "angry", "sad", "fear", "disgust",
            "anxious", "confused", "frustrated",
        }
        _NEGATIVE_VOICE = {
            "nervous", "angry", "sad", "fear",
            "anxious", "monotone", "hesitant",
        }

        # Decide conjunction: "and" when emotions align, "but" when they clash
        face_is_negative = face_emotion.lower() in _NEGATIVE_FACE
        voice_is_negative = voice_emotion.lower() in _NEGATIVE_VOICE

        if face_is_negative != voice_is_negative:
            conjunction = "but"
        else:
            conjunction = "and"

        return (
            f"Your tone was {voice_emotion}, {conjunction} your facial "
            f"expression appeared {face_emotion}."
        )


