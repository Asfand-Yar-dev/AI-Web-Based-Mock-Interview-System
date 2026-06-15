# Vocal Characteristics Analysis – Quick Start

## What This Module Does

Analyses **how** a person speaks, NOT what emotion they feel.  
It produces dimensional scores (0-100) for:

| Dimension | What it measures |
|-----------|-----------------|
| **Clarity** | Articulation, voiced ratio, signal quality |
| **Confidence** | Volume stability, steady pitch, appropriate pace, few pauses |
| **Tone** | Pitch expressiveness, energy, warmth, monotone detection |
| **Hesitation** | Pause count & duration, pauses per minute |
| **Stress** | Jitter, shimmer, elevated pitch, Wav2Vec2 instability |

It also returns an **overall score** (composite) and a list of
human-readable **feedback** bullets.

---

## 1. Install Dependencies

```bash
cd Voice_Model
pip install -r ai_engine/requirements.txt
```

> On the first run the Wav2Vec2 base model (~360 MB) will be downloaded
> and cached under `ai_engine/models/wav2vec2-base/`. Every subsequent
> run loads from this local directory – **no internet required**.

---

## 2. Run the GUI

```bash
python vocal_tone_gui.py
```

Or double-click **run_gui.bat**.

---

## 3. Run as Flask API

```bash
python flask_app.py
```

The server starts on **http://127.0.0.1:5001**.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/voice/health` | Health / model status |
| `POST` | `/api/voice/analyze` | Full analysis (Wav2Vec2 + signal) |
| `POST` | `/api/voice/analyze-quick` | Quick analysis (signal-only, faster) |

### Example: Upload a file

```bash
curl -X POST http://127.0.0.1:5001/api/voice/analyze \
     -F "audio=@recording.wav"
```

### Example: Pass a file path (JSON)

```bash
curl -X POST http://127.0.0.1:5001/api/voice/analyze \
     -H "Content-Type: application/json" \
     -d '{"audio_path": "recordings/recording.wav"}'
```

### Example Response

```json
{
  "clarity_confidence": {
    "clarity_score": 72.3,
    "confidence_score": 68.5,
    "details": {
      "voiced_ratio": 85.2,
      "volume_stability": 70.1,
      "articulation": 65.4,
      "speech_rate_syl_per_sec": 4.12
    }
  },
  "tone": {
    "tone_score": 61.8,
    "details": {
      "pitch_expressiveness": 45.2,
      "energy_level": 58.3,
      "warmth": 72.1,
      "monotone_level": 54.8,
      "pitch_mean_hz": 178.4,
      "pitch_range_hz": 92.6
    }
  },
  "hesitation_stress": {
    "hesitation_score": 28.4,
    "stress_score": 35.1,
    "details": {
      "pause_count": 3,
      "total_pause_duration_s": 1.82,
      "pauses_per_minute": 6.2,
      "jitter": 0.0312,
      "shimmer": 0.0845,
      "tempo_bpm": 112.5
    }
  },
  "overall_score": 67.9,
  "feedback": [
    "Your speech clarity is moderate. Try to enunciate words more distinctly.",
    "Your confidence level is fair. Try to maintain a steady volume and pace.",
    "Your tone is acceptable but could be more dynamic and energetic.",
    "Minimal hesitation – your speech flows well.",
    "Mild vocal stress indicators present. Stay relaxed and breathe regularly."
  ],
  "duration_s": 12.34,
  "processing_time_s": 2.18
}
```

---

## 4. Integrate Into Your Flask App

```python
from flask import Flask
from ai_engine.flask_routes import create_voice_blueprint
from ai_engine.vocal_analysis import VocalToneAnalyzer

app = Flask(__name__)

# Pre-load the model at startup
analyzer = VocalToneAnalyzer()

# Register the blueprint
voice_bp = create_voice_blueprint(analyzer=analyzer)
app.register_blueprint(voice_bp, url_prefix="/api/voice")
```

---

## 5. Use Directly in Python

```python
from ai_engine.vocal_analysis import VocalToneAnalyzer

analyzer = VocalToneAnalyzer()

# Full analysis (Wav2Vec2 + signal)
result = analyzer.analyze_tone("path/to/audio.wav")

# Quick analysis (signal-only – no Wav2Vec2, faster)
result_quick = analyzer.analyze_tone_quick("path/to/audio.wav")
```

---

## Project Structure

```
Voice_Model/
├── ai_engine/
│   ├── __init__.py
│   ├── vocal_analysis.py      # Core analysis engine
│   ├── flask_routes.py        # Flask blueprint (API routes)
│   ├── requirements.txt
│   └── models/
│       └── wav2vec2-base/      # Auto-cached on first run
├── flask_app.py               # Standalone Flask server
├── vocal_tone_gui.py          # Tkinter GUI for testing
├── run_gui.bat
└── recordings/                # Saved recordings
```
