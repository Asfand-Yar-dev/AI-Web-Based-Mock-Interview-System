"""
Vocal Characteristics Analysis Module for Smart Mock Interview System

This module uses Wav2Vec2 to extract deep acoustic features and combines them
with librosa signal-level analysis to evaluate vocal characteristics:
  - Clarity and Confidence
  - Tone quality
  - Hesitation and Stress indicators

This is NOT simple emotion classification (happy/sad/neutral). Instead it
produces dimensional scores that describe HOW someone speaks.

Dependencies:
    pip install transformers torch librosa soundfile numpy scipy

Author: AI Backend Developer
Date: 2026-02-18
"""

import logging
import os
import time
import warnings
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

import numpy as np

# Suppress non-critical warnings for cleaner output
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MODEL_NAME = "facebook/wav2vec2-base"
# Local cache directory – sits next to this file under models/
_MODULE_DIR = Path(__file__).resolve().parent
LOCAL_MODEL_DIR = _MODULE_DIR / "models" / "wav2vec2-base"

SAMPLE_RATE = 16_000  # Wav2Vec2 expects 16 kHz audio

# Thresholds (tuned for typical interview audio 5-120 s)
SILENCE_THRESHOLD_DB = -40  # dBFS below which a frame is considered silent
MIN_PAUSE_DURATION_S = 0.3  # seconds of silence to count as a pause
SHORT_SEGMENT_S = 0.15       # segments shorter than this hint at articulation issues
MAX_AUDIO_DURATION_S = 30    # cap audio length for fast analysis
HOP_LENGTH = 1024            # larger hop = fewer frames = faster


# ============================================================================
# Helper: audio loading
# ============================================================================

def _load_audio(audio_path: str) -> Tuple[np.ndarray, int]:
    """Load an audio file, convert to mono 16 kHz float32 numpy array.

    Returns:
        (waveform, sample_rate)
    """
    import librosa

    # Load and cap to MAX_AUDIO_DURATION_S for speed
    y, sr = librosa.load(
        audio_path, sr=SAMPLE_RATE, mono=True,
        duration=MAX_AUDIO_DURATION_S,
    )
    # Normalise to [-1, 1]
    peak = np.max(np.abs(y))
    if peak > 0:
        y = y / peak
    return y, sr


# ============================================================================
# Signal-level feature extraction (librosa)
# ============================================================================

def _extract_signal_features(y: np.ndarray, sr: int) -> Dict[str, Any]:
    """Compute acoustic features directly from the waveform with librosa.

    Returns a flat dict of scalar metrics used later to score vocal
    characteristics.
    """
    import librosa

    duration = len(y) / sr
    if duration < 0.5:
        raise ValueError("Audio is too short (< 0.5 s) for meaningful analysis.")

    # --- Pitch (F0) via yin (much faster than pyin) --------------------------
    fmin = librosa.note_to_hz("C2")
    fmax = librosa.note_to_hz("C6")
    f0 = librosa.yin(
        y, fmin=fmin, fmax=fmax,
        sr=sr, frame_length=2048, hop_length=HOP_LENGTH,
    )
    # yin returns fmin for unvoiced frames; treat those as NaN
    f0_valid = f0[(f0 > fmin * 1.01) & (f0 < fmax * 0.99)]
    voiced_ratio = float(len(f0_valid) / len(f0)) if len(f0) > 0 else 0.0

    if len(f0_valid) > 1:
        pitch_mean = float(np.mean(f0_valid))
        pitch_std = float(np.std(f0_valid))
        pitch_range = float(np.ptp(f0_valid))
        # Coefficient of variation – lower = more monotone
        pitch_cv = pitch_std / pitch_mean if pitch_mean > 0 else 0.0
    else:
        pitch_mean = 0.0
        pitch_std = 0.0
        pitch_range = 0.0
        pitch_cv = 0.0

    # --- Energy / RMS -------------------------------------------------------
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=HOP_LENGTH)[0]
    rms_mean = float(np.mean(rms))
    rms_std = float(np.std(rms))
    rms_cv = rms_std / rms_mean if rms_mean > 0 else 0.0  # volume stability

    # --- Spectral features --------------------------------------------------
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=HOP_LENGTH)[0]
    sc_mean = float(np.mean(spectral_centroid))
    sc_std = float(np.std(spectral_centroid))

    spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, hop_length=HOP_LENGTH)[0]
    sr_mean = float(np.mean(spectral_rolloff))

    # Zero crossing rate – correlates with noisiness / breathiness
    zcr = librosa.feature.zero_crossing_rate(y, hop_length=HOP_LENGTH)[0]
    zcr_mean = float(np.mean(zcr))

    # --- Pauses & silence detection -----------------------------------------
    rms_db = librosa.amplitude_to_db(rms, ref=np.max(rms) if np.max(rms) > 0 else 1.0)
    silence_mask = rms_db < SILENCE_THRESHOLD_DB  # boolean per frame
    hop_dur = HOP_LENGTH / sr

    # Count distinct pauses (consecutive silent frames >= MIN_PAUSE_DURATION_S)
    pause_count = 0
    total_pause_dur = 0.0
    current_silence_len = 0
    for is_silent in silence_mask:
        if is_silent:
            current_silence_len += 1
        else:
            silence_duration = current_silence_len * hop_dur
            if silence_duration >= MIN_PAUSE_DURATION_S:
                pause_count += 1
                total_pause_dur += silence_duration
            current_silence_len = 0
    # Handle trailing silence
    silence_duration = current_silence_len * hop_dur
    if silence_duration >= MIN_PAUSE_DURATION_S:
        pause_count += 1
        total_pause_dur += silence_duration

    pause_ratio = total_pause_dur / duration if duration > 0 else 0.0

    # --- Tempo / speech rate proxy ------------------------------------------
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo_arr = librosa.feature.tempo(onset_envelope=onset_env, sr=sr)
    tempo = float(tempo_arr[0]) if len(tempo_arr) > 0 else 0.0

    onsets = librosa.onset.onset_detect(y=y, sr=sr, onset_envelope=onset_env)
    syllable_rate = len(onsets) / duration if duration > 0 else 0.0

    # --- Jitter-like (pitch perturbation) rough estimate --------------------
    if len(f0_valid) > 1:
        pitch_diffs = np.abs(np.diff(f0_valid))
        jitter = float(np.mean(pitch_diffs) / pitch_mean) if pitch_mean > 0 else 0.0
    else:
        jitter = 0.0

    # --- Shimmer-like (amplitude perturbation) rough estimate ---------------
    if len(rms) > 1:
        rms_diffs = np.abs(np.diff(rms))
        shimmer = float(np.mean(rms_diffs) / rms_mean) if rms_mean > 0 else 0.0
    else:
        shimmer = 0.0

    return {
        "duration": duration,
        "pitch_mean": pitch_mean,
        "pitch_std": pitch_std,
        "pitch_range": pitch_range,
        "pitch_cv": pitch_cv,
        "voiced_ratio": voiced_ratio,
        "rms_mean": rms_mean,
        "rms_std": rms_std,
        "rms_cv": rms_cv,
        "spectral_centroid_mean": sc_mean,
        "spectral_centroid_std": sc_std,
        "spectral_rolloff_mean": sr_mean,
        "zcr_mean": zcr_mean,
        "pause_count": pause_count,
        "total_pause_duration": total_pause_dur,
        "pause_ratio": pause_ratio,
        "tempo": tempo,
        "syllable_rate": syllable_rate,
        "jitter": jitter,
        "shimmer": shimmer,
    }


# ============================================================================
# Deep feature extraction (Wav2Vec2)
# ============================================================================

def _extract_wav2vec2_features(
    y: np.ndarray,
    processor,
    model,
) -> Dict[str, float]:
    """Run audio through Wav2Vec2 and derive statistics from hidden-state
    activations.  These capture high-level acoustic patterns that correlate
    with confidence, stress, and vocal quality.

    Returns scalar summary stats.
    """
    import torch

    inputs = processor(
        y,
        sampling_rate=SAMPLE_RATE,
        return_tensors="pt",
        padding=True,
    )

    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True)

    # Use the last hidden state (shape: 1 x T x D)
    hidden = outputs.last_hidden_state.squeeze(0).cpu().numpy()  # (T, D)

    # Summary statistics across the time axis
    feat_mean = np.mean(hidden, axis=0)   # (D,)
    feat_std = np.std(hidden, axis=0)     # (D,)

    # Global activation energy
    activation_energy = float(np.mean(np.linalg.norm(hidden, axis=1)))

    # Temporal variability – high = more expressive/dynamic
    frame_diffs = np.diff(hidden, axis=0)
    temporal_variability = float(np.mean(np.linalg.norm(frame_diffs, axis=1)))

    # Stability – low std across dims = more consistent/stable speech
    mean_std = float(np.mean(feat_std))

    # Concentration of energy in feature dimensions (kurtosis-like)
    feat_kurtosis = float(np.mean(
        ((feat_mean - np.mean(feat_mean)) / (np.std(feat_mean) + 1e-8)) ** 4
    ))

    return {
        "w2v_activation_energy": activation_energy,
        "w2v_temporal_variability": temporal_variability,
        "w2v_mean_std": mean_std,
        "w2v_feat_kurtosis": feat_kurtosis,
    }


# ============================================================================
# Scoring functions
# ============================================================================

def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


def _score_clarity_confidence(sig: Dict, w2v: Dict) -> Dict[str, Any]:
    """Compute clarity & confidence scores (0-100).

    Higher = better.
    """
    # --- Clarity ---
    # Factors: voiced ratio, spectral centroid (articulation), zcr (noise)
    clarity_voiced = sig["voiced_ratio"] * 100  # 0-100
    # Spectral centroid in range ~500-5000 Hz is typical; higher = clearer articulation
    clarity_articulation = _clamp((sig["spectral_centroid_mean"] - 500) / 35, 0, 100)
    # Low zero-crossing rate = cleaner signal (less breathy/noise)
    clarity_noise = _clamp(100 - sig["zcr_mean"] * 1000, 0, 100)
    # Wav2Vec2 activation energy – higher indicates model finds richer structure
    clarity_deep = _clamp(w2v["w2v_activation_energy"] * 3, 0, 100)

    clarity = (
        clarity_voiced * 0.30
        + clarity_articulation * 0.25
        + clarity_noise * 0.20
        + clarity_deep * 0.25
    )

    # --- Confidence ---
    # Factors: volume stability, pitch confidence (low CV), speech rate, low pause ratio
    conf_volume = _clamp(100 - sig["rms_cv"] * 150, 0, 100)
    conf_pitch = _clamp(100 - sig["pitch_cv"] * 200, 0, 100)
    # Syllable rate 3-6/s is confident range
    sr_norm = sig["syllable_rate"]
    conf_rate = _clamp(100 - abs(sr_norm - 4.5) * 30, 0, 100)
    conf_pause = _clamp(100 - sig["pause_ratio"] * 300, 0, 100)
    # Wav2Vec2 stability
    conf_deep = _clamp(100 - w2v["w2v_mean_std"] * 20, 0, 100)

    confidence = (
        conf_volume * 0.25
        + conf_pitch * 0.20
        + conf_rate * 0.20
        + conf_pause * 0.15
        + conf_deep * 0.20
    )

    return {
        "clarity_score": round(_clamp(clarity), 1),
        "confidence_score": round(_clamp(confidence), 1),
        "details": {
            "voiced_ratio": round(sig["voiced_ratio"] * 100, 1),
            "volume_stability": round(_clamp(conf_volume), 1),
            "articulation": round(_clamp(clarity_articulation), 1),
            "speech_rate_syl_per_sec": round(sig["syllable_rate"], 2),
        },
    }


def _score_tone(sig: Dict, w2v: Dict) -> Dict[str, Any]:
    """Evaluate tonal quality of speech.

    Returns scores for pitch expressiveness, energy, warmth, and a
    monotone indicator.
    """
    # Pitch expressiveness (higher range & CV = more expressive)
    expressiveness = _clamp(sig["pitch_cv"] * 250, 0, 100)

    # Energy level (RMS amplitude)
    energy = _clamp(sig["rms_mean"] * 500, 0, 100)

    # Warmth – lower spectral centroid + lower spectral rolloff → warmer
    warmth = _clamp(100 - (sig["spectral_centroid_mean"] - 1000) / 40, 0, 100)

    # Monotone indicator (inverse of expressiveness) – high = monotone
    monotone = _clamp(100 - expressiveness, 0, 100)

    # Wav2Vec2 temporal variability adds expressiveness signal
    deep_expressiveness = _clamp(w2v["w2v_temporal_variability"] * 10, 0, 100)

    # Overall tone score (balance of traits)
    tone_score = (
        expressiveness * 0.30
        + energy * 0.20
        + warmth * 0.15
        + (100 - monotone) * 0.15  # reward not being monotone
        + deep_expressiveness * 0.20
    )

    return {
        "tone_score": round(_clamp(tone_score), 1),
        "details": {
            "pitch_expressiveness": round(expressiveness, 1),
            "energy_level": round(energy, 1),
            "warmth": round(warmth, 1),
            "monotone_level": round(monotone, 1),
            "pitch_mean_hz": round(sig["pitch_mean"], 1),
            "pitch_range_hz": round(sig["pitch_range"], 1),
        },
    }


def _score_hesitation_stress(sig: Dict, w2v: Dict) -> Dict[str, Any]:
    """Evaluate hesitation and stress indicators.

    Lower scores = fewer issues (better performance).
    """
    # Hesitation indicators
    # Pause frequency relative to duration
    pauses_per_min = (sig["pause_count"] / sig["duration"]) * 60 if sig["duration"] > 0 else 0
    hesitation_pauses = _clamp(pauses_per_min * 8, 0, 100)

    # Pause ratio
    hesitation_ratio = _clamp(sig["pause_ratio"] * 300, 0, 100)

    # Overall hesitation
    hesitation = (
        hesitation_pauses * 0.50
        + hesitation_ratio * 0.50
    )

    # Stress indicators
    # Jitter (pitch perturbation) – higher = more stressed
    stress_jitter = _clamp(sig["jitter"] * 500, 0, 100)

    # Shimmer (amplitude perturbation)
    stress_shimmer = _clamp(sig["shimmer"] * 300, 0, 100)

    # High pitch mean can indicate stress
    # Average male ~120Hz, female ~210Hz, stressed adds ~20-40Hz
    stress_pitch = _clamp((sig["pitch_mean"] - 250) / 3, 0, 100)

    # Wav2Vec2 feature instability
    stress_deep = _clamp(w2v["w2v_mean_std"] * 15, 0, 100)

    stress = (
        stress_jitter * 0.30
        + stress_shimmer * 0.25
        + stress_pitch * 0.20
        + stress_deep * 0.25
    )

    return {
        "hesitation_score": round(_clamp(hesitation), 1),
        "stress_score": round(_clamp(stress), 1),
        "details": {
            "pause_count": sig["pause_count"],
            "total_pause_duration_s": round(sig["total_pause_duration"], 2),
            "pauses_per_minute": round(pauses_per_min, 1),
            "jitter": round(sig["jitter"], 4),
            "shimmer": round(sig["shimmer"], 4),
            "tempo_bpm": round(sig["tempo"], 1),
        },
    }


def _generate_feedback(clarity: Dict, tone: Dict, hesitation: Dict) -> list:
    """Generate human-readable feedback bullets based on scores."""
    feedback = []

    # Clarity
    cs = clarity["clarity_score"]
    if cs >= 75:
        feedback.append("Your speech is clear and well-articulated.")
    elif cs >= 50:
        feedback.append("Your speech clarity is moderate. Try to enunciate words more distinctly.")
    else:
        feedback.append("Your speech clarity needs improvement. Focus on pronouncing each word clearly.")

    # Confidence
    conf = clarity["confidence_score"]
    if conf >= 75:
        feedback.append("You sound confident and composed.")
    elif conf >= 50:
        feedback.append("Your confidence level is fair. Try to maintain a steady volume and pace.")
    else:
        feedback.append("You sound uncertain. Practice speaking with a consistent volume and tempo.")

    # Tone
    ts = tone["tone_score"]
    mono = tone["details"]["monotone_level"]
    if mono >= 70:
        feedback.append("Your tone is quite monotone. Vary your pitch to keep the listener engaged.")
    elif ts >= 70:
        feedback.append("Great tonal variety – your voice sounds engaging and expressive.")
    else:
        feedback.append("Your tone is acceptable but could be more dynamic and energetic.")

    # Hesitation
    hs = hesitation["hesitation_score"]
    if hs >= 60:
        feedback.append("Frequent hesitations detected. Practice to reduce pauses and filler moments.")
    elif hs >= 30:
        feedback.append("Some hesitation is present. Try to reduce unnecessary pauses.")
    else:
        feedback.append("Minimal hesitation – your speech flows well.")

    # Stress
    ss = hesitation["stress_score"]
    if ss >= 60:
        feedback.append("Signs of vocal stress detected. Deep breathing before speaking may help.")
    elif ss >= 30:
        feedback.append("Mild vocal stress indicators present. Stay relaxed and breathe regularly.")
    else:
        feedback.append("Your voice sounds relaxed and natural.")

    return feedback


# ============================================================================
# Main Analyzer Class
# ============================================================================

class VocalToneAnalyzer:
    """Analyze vocal characteristics from audio files using Wav2Vec2 deep
    features combined with signal-level acoustic analysis.

    Produces dimensional scores for:
      - Clarity & Confidence
      - Tone quality
      - Hesitation & Stress

    The Wav2Vec2 model is cached locally under ``ai_engine/models/``
    so it only downloads once.
    """

    def __init__(self, model_dir: Optional[str] = None):
        """
        Args:
            model_dir: Override the default local model cache directory.
        """
        self.model_dir = Path(model_dir) if model_dir else LOCAL_MODEL_DIR
        self.processor = None
        self.model = None
        self._load_model()

    # ------------------------------------------------------------------ load
    def _load_model(self) -> None:
        """Load Wav2Vec2 model + processor, downloading to local cache on first
        run and loading from cache thereafter."""
        from transformers import Wav2Vec2Processor, Wav2Vec2Model

        try:
            if self.model_dir.exists() and any(self.model_dir.iterdir()):
                # Load from local cache
                logger.info(f"Loading Wav2Vec2 model from local cache: {self.model_dir}")
                self.processor = Wav2Vec2Processor.from_pretrained(str(self.model_dir))
                self.model = Wav2Vec2Model.from_pretrained(str(self.model_dir))
            else:
                # Download and save locally
                logger.info(f"Downloading Wav2Vec2 model '{MODEL_NAME}' (first time only) ...")
                self.model_dir.mkdir(parents=True, exist_ok=True)
                self.processor = Wav2Vec2Processor.from_pretrained(MODEL_NAME)
                self.model = Wav2Vec2Model.from_pretrained(MODEL_NAME)
                # Save for future runs
                self.processor.save_pretrained(str(self.model_dir))
                self.model.save_pretrained(str(self.model_dir))
                logger.info(f"Model saved to: {self.model_dir}")

            self.model.eval()
            logger.info("Wav2Vec2 model loaded successfully!")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise RuntimeError(f"Model initialization failed: {e}")

    # -------------------------------------------------------------- analyze
    def analyze_tone(self, audio_path: str) -> Dict[str, Any]:
        """Perform full vocal characteristics analysis on an audio file.

        Args:
            audio_path: Path to a WAV / MP3 audio file.

        Returns:
            dict with keys:
                - clarity_confidence  (dict)
                - tone                (dict)
                - hesitation_stress   (dict)
                - overall_score       (float 0-100)
                - feedback            (list[str])
                - processing_time_s   (float)

        Raises:
            FileNotFoundError: If the audio file does not exist.
            RuntimeError: If analysis fails.
        """
        t0 = time.time()

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        if self.model is None or self.processor is None:
            raise RuntimeError("Model is not properly initialized.")

        try:
            # 1. Load audio
            y, sr = _load_audio(audio_path)
            logger.info(
                f"Audio loaded: {len(y)/sr:.1f}s, {sr} Hz – {audio_path}"
            )

            # 2. Signal-level features
            sig_features = _extract_signal_features(y, sr)

            # 3. Wav2Vec2 deep features
            w2v_features = _extract_wav2vec2_features(y, self.processor, self.model)

            # 4. Score each dimension
            clarity = _score_clarity_confidence(sig_features, w2v_features)
            tone = _score_tone(sig_features, w2v_features)
            hesitation = _score_hesitation_stress(sig_features, w2v_features)

            # 5. Overall composite score
            overall = (
                clarity["clarity_score"] * 0.25
                + clarity["confidence_score"] * 0.25
                + tone["tone_score"] * 0.20
                + (100 - hesitation["hesitation_score"]) * 0.15
                + (100 - hesitation["stress_score"]) * 0.15
            )

            # 6. Feedback
            feedback = _generate_feedback(clarity, tone, hesitation)

            elapsed = round(time.time() - t0, 2)
            logger.info(f"Analysis completed in {elapsed}s – overall={overall:.1f}")

            return {
                "clarity_confidence": clarity,
                "tone": tone,
                "hesitation_stress": hesitation,
                "overall_score": round(_clamp(overall), 1),
                "feedback": feedback,
                "duration_s": round(sig_features["duration"], 2),
                "processing_time_s": elapsed,
            }

        except FileNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            raise RuntimeError(f"Audio analysis failed: {e}")

    # ---------------------------------------- lightweight / quick analysis
    def analyze_tone_quick(self, audio_path: str) -> Dict[str, Any]:
        """A faster analysis that skips Wav2Vec2 deep features and uses only
        signal-level analysis.  Useful for real-time or low-latency contexts.
        """
        t0 = time.time()
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        y, sr = _load_audio(audio_path)
        sig = _extract_signal_features(y, sr)

        # Dummy w2v features (neutral)
        dummy_w2v = {
            "w2v_activation_energy": 15.0,
            "w2v_temporal_variability": 5.0,
            "w2v_mean_std": 3.0,
            "w2v_feat_kurtosis": 3.0,
        }

        clarity = _score_clarity_confidence(sig, dummy_w2v)
        tone = _score_tone(sig, dummy_w2v)
        hesitation = _score_hesitation_stress(sig, dummy_w2v)

        overall = (
            clarity["clarity_score"] * 0.25
            + clarity["confidence_score"] * 0.25
            + tone["tone_score"] * 0.20
            + (100 - hesitation["hesitation_score"]) * 0.15
            + (100 - hesitation["stress_score"]) * 0.15
        )
        feedback = _generate_feedback(clarity, tone, hesitation)
        elapsed = round(time.time() - t0, 2)

        return {
            "clarity_confidence": clarity,
            "tone": tone,
            "hesitation_stress": hesitation,
            "overall_score": round(_clamp(overall), 1),
            "feedback": feedback,
            "duration_s": round(sig["duration"], 2),
            "processing_time_s": elapsed,
            "mode": "quick (signal-only)",
        }


# ============================================================================
# Standalone test
# ============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("VOCAL CHARACTERISTICS ANALYSIS MODULE – TEST")
    print("=" * 70)

    try:
        print("\n[1] Initializing Vocal Characteristics Analyzer ...")
        analyzer = VocalToneAnalyzer()
        print("✓ Analyzer ready!\n")

        test_audio = "../recordings"
        # Find first WAV in recordings/
        from pathlib import Path as _P
        recs = list(_P(test_audio).glob("*.wav"))
        if not recs:
            recs = list(_P(".").glob("**/*.wav"))

        if recs:
            sample = str(recs[0])
            print(f"[2] Analysing: {sample}\n")
            result = analyzer.analyze_tone(sample)

            print("=" * 70)
            print("ANALYSIS RESULTS")
            print("=" * 70)
            import json
            print(json.dumps(result, indent=2))
        else:
            print("⚠ No WAV files found for testing.")
            print("   Place a WAV file in the recordings/ folder and re-run.")

    except Exception as exc:
        print(f"\n✗ Error: {exc}")
        logging.exception("Test failed")

    print("\n" + "=" * 70)
    print("FLASK INTEGRATION EXAMPLE")
    print("=" * 70)
    print("""
from flask import Flask, request, jsonify
from ai_engine.vocal_analysis import VocalToneAnalyzer

app = Flask(__name__)
analyzer = VocalToneAnalyzer()          # loads model once at startup

@app.route('/analyze-voice', methods=['POST'])
def analyze_voice():
    audio_file = request.files['audio']
    path = f'/tmp/{audio_file.filename}'
    audio_file.save(path)
    result = analyzer.analyze_tone(path)
    return jsonify(result)
""")
    print("=" * 70)
