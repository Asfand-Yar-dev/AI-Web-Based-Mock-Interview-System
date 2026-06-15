"""
Standalone Flask Application for Vocal Characteristics Analysis API.

Run this file directly to start the API server:
    python flask_app.py

Or use it as a reference for integrating into your main Flask application.

Endpoints:
    GET  /api/voice/health          – Health check
    POST /api/voice/analyze         – Full analysis (Wav2Vec2 + signal)
    POST /api/voice/analyze-quick   – Quick analysis (signal-only)
"""

import os
import sys
import logging
from pathlib import Path

# Ensure the project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from flask import Flask
from flask_cors import CORS
from ai_engine.flask_routes import create_voice_blueprint
from ai_engine.vocal_analysis import VocalToneAnalyzer


def create_app() -> Flask:
    """Application factory – creates and configures the Flask app."""
    app = Flask(__name__)
    CORS(app)  # Allow cross-origin requests from frontend

    # Configure upload size limit (50 MB)
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

    # Pre-initialise the analyzer so the model is loaded at startup
    # (not on the first request)
    logging.info("Pre-loading Wav2Vec2 model …")
    analyzer = VocalToneAnalyzer()
    logging.info("Model ready.")

    # Register the voice analysis blueprint
    voice_bp = create_voice_blueprint(analyzer=analyzer)
    app.register_blueprint(voice_bp, url_prefix="/api/voice")

    # Root endpoint
    @app.route("/")
    def index():
        return {
            "service": "Vocal Characteristics Analysis API",
            "version": "2.0.0",
            "endpoints": {
                "health": "/api/voice/health",
                "analyze": "/api/voice/analyze",
                "analyze_quick": "/api/voice/analyze-quick",
            },
        }

    return app


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    port = int(os.environ.get("VOICE_API_PORT", 5001))
    app = create_app()

    print(f"\n{'='*60}")
    print(f"  Vocal Characteristics Analysis API")
    print(f"  Running on http://127.0.0.1:{port}")
    print(f"{'='*60}\n")

    app.run(host="0.0.0.0", port=port, debug=False)
