"""
AI Models Package - Speech-to-Text Engine

Provides:
    - STTEngine: Core transcription engine (English & Urdu only)
    - stt_bp: Flask Blueprint for REST API endpoints
    - init_stt_engine: Flask app initialization helper

Quick Start (standalone):
    from ai_models.stt_engine import STTEngine
    engine = STTEngine.get_instance()
    result = engine.transcribe_audio("audio.wav", language="en")

Quick Start (Flask):
    from ai_models import stt_bp, init_stt_engine
    app = Flask(__name__)
    init_stt_engine(app)
    app.register_blueprint(stt_bp, url_prefix='/api/stt')
"""

from .stt_engine import STTEngine

# Flask components (may not be available if Flask is not installed)
try:
    from .stt_api import stt_bp, init_stt_engine
except ImportError:
    stt_bp = None
    init_stt_engine = None

__all__ = ['STTEngine', 'stt_bp', 'init_stt_engine']
