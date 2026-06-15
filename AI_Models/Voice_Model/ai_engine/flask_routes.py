"""
Flask Blueprint for the Vocal Characteristics Analysis API.

This module provides a ready-to-use Flask Blueprint that can be registered
directly with any Flask application.  It exposes endpoints for:
  - Full analysis    (Wav2Vec2 + signal features)
  - Quick analysis   (signal-only, faster)
  - Health check

Usage:
    from ai_engine.flask_routes import create_voice_blueprint

    app = Flask(__name__)
    voice_bp = create_voice_blueprint()
    app.register_blueprint(voice_bp, url_prefix="/api/voice")

Author: AI Backend Developer
Date: 2026-02-18
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import Optional

from flask import Blueprint, request, jsonify

from .vocal_analysis import VocalToneAnalyzer

logger = logging.getLogger(__name__)

# Allowed audio extensions
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".webm"}

# Configurable upload directory (falls back to system temp)
UPLOAD_DIR = os.environ.get(
    "VOICE_UPLOAD_DIR",
    str(Path(tempfile.gettempdir()) / "voice_uploads"),
)


def _allowed_file(filename: str) -> bool:
    """Check if the file extension is allowed."""
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def create_voice_blueprint(analyzer: VocalToneAnalyzer = None) -> Blueprint:
    """Create and return a Flask Blueprint for the voice analysis API.

    Args:
        analyzer: An already-initialised VocalToneAnalyzer instance.
                  If ``None``, one will be created (loads the model).

    Returns:
        A Flask Blueprint ready for ``app.register_blueprint()``.
    """
    bp = Blueprint("voice_analysis", __name__)

    # Lazily initialised analyzer (shared across requests)
    _state = {"analyzer": analyzer}

    def _get_analyzer() -> VocalToneAnalyzer:
        if _state["analyzer"] is None:
            logger.info("Initialising VocalToneAnalyzer …")
            _state["analyzer"] = VocalToneAnalyzer()
        return _state["analyzer"]

    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # ---------------------------------------------------------------- health
    @bp.route("/health", methods=["GET"])
    def health():
        """Health-check endpoint – also reports model status."""
        try:
            a = _get_analyzer()
            return jsonify({
                "status": "healthy",
                "model_loaded": a.model is not None,
                "model_dir": str(a.model_dir),
            }), 200
        except Exception as exc:
            return jsonify({"status": "unhealthy", "error": str(exc)}), 503

    # --------------------------------------------------------- full analysis
    @bp.route("/analyze", methods=["POST"])
    def analyze():
        """Full vocal characteristics analysis.

        Accepts:
            - multipart/form-data with field ``audio`` (audio file upload)  OR
            - JSON body ``{"audio_path": "/path/to/file.wav"}``

        Returns:
            JSON with clarity_confidence, tone, hesitation_stress, overall_score,
            feedback, duration_s, processing_time_s.
        """
        audio_path = _resolve_audio(request)
        if audio_path is None:
            return jsonify({"error": "No audio provided. Send a file under the 'audio' field or provide 'audio_path' in JSON body."}), 400

        try:
            a = _get_analyzer()
            result = a.analyze_tone(audio_path)
            return jsonify(result), 200
        except FileNotFoundError as exc:
            return jsonify({"error": str(exc)}), 404
        except Exception as exc:
            logger.exception("Analysis failed")
            return jsonify({"error": str(exc)}), 500

    # -------------------------------------------------------- quick analysis
    @bp.route("/analyze-quick", methods=["POST"])
    def analyze_quick():
        """Quick vocal characteristics analysis (signal-only, no Wav2Vec2).

        Same interface as ``/analyze``.
        """
        audio_path = _resolve_audio(request)
        if audio_path is None:
            return jsonify({"error": "No audio provided."}), 400

        try:
            a = _get_analyzer()
            result = a.analyze_tone_quick(audio_path)
            return jsonify(result), 200
        except FileNotFoundError as exc:
            return jsonify({"error": str(exc)}), 404
        except Exception as exc:
            logger.exception("Quick analysis failed")
            return jsonify({"error": str(exc)}), 500

    return bp


def _resolve_audio(req) -> Optional[str]:
    """Extract the audio file path from the request – either a file upload
    or a JSON ``audio_path`` field.

    Returns the file path on disk, or ``None`` if nothing was provided.
    """
    # 1. File upload
    if "audio" in req.files:
        f = req.files["audio"]
        if f.filename and _allowed_file(f.filename):
            dest = os.path.join(UPLOAD_DIR, f.filename)
            f.save(dest)
            return dest
        return None

    # 2. JSON body with path
    data = req.get_json(silent=True)
    if data and "audio_path" in data:
        return data["audio_path"]

    return None
