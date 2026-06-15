"""
Flask API Blueprint for Speech-to-Text (STT) Module

This blueprint provides REST API endpoints for the STT engine.
It is ready to be registered in your main Flask application.

Usage in your Flask app:
    from ai_models.stt_api import stt_bp, init_stt_engine
    
    app = Flask(__name__)
    
    # Initialize the STT engine (loads model once at startup)
    init_stt_engine(app)
    
    # Register the blueprint
    app.register_blueprint(stt_bp, url_prefix='/api/stt')

API Endpoints:
    POST /api/stt/transcribe  - Transcribe an uploaded audio file
    GET  /api/stt/status       - Get engine status (health check)
    GET  /api/stt/languages    - Get supported languages
"""

import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy import: Flask may not be installed in dev/test environments
# These will be available when used in the actual Flask app
try:
    from flask import Blueprint, request, jsonify, current_app
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    logger.info("Flask not installed. STT API blueprint not available.")

from .stt_engine import STTEngine


def init_stt_engine(app, model_size: str = "medium"):
    """
    Initialize the STT engine when the Flask app starts.
    
    Call this ONCE in your Flask app factory or app setup.
    The model loads into memory and is shared across all requests.
    
    Args:
        app: Flask application instance
        model_size: Whisper model size to use
        
    Example:
        app = Flask(__name__)
        init_stt_engine(app, model_size="medium")
    """
    with app.app_context():
        # Check if model is downloaded
        if not STTEngine.is_model_downloaded(model_size):
            logger.warning(
                f"Whisper model '{model_size}' not found in local storage. "
                f"Run 'python setup_model.py --model-size {model_size}' first."
            )
        
        # Load the engine (singleton - loads model once)
        engine = STTEngine.get_instance(model_size=model_size)
        app.config['STT_ENGINE'] = engine
        
        logger.info(f"STT Engine initialized: {engine.get_status()}")


if FLASK_AVAILABLE:
    # Create Flask Blueprint
    stt_bp = Blueprint('stt', __name__)
    

    @stt_bp.route('/transcribe', methods=['POST'])
    def transcribe():
        """
        Transcribe an uploaded audio file.
        
        Request:
            - Form data with 'audio' file field
            - Optional 'language' field: 'en' or 'ur' (default: auto-detect)
            - Optional 'task' field: 'transcribe' or 'translate' (default: transcribe)
            
        Response (success):
            {
                "status": "success",
                "text": "transcribed text here",
                "language": "en",
                "language_name": "English",
                "device_used": "cpu",
                "segments": [...],
                "duration": 1.5
            }
            
        Response (error):
            {
                "status": "error",
                "message": "error description"
            }
        """
        # Validate audio file in request
        if 'audio' not in request.files:
            return jsonify({
                "status": "error",
                "message": "No audio file provided. Send a file with key 'audio'."
            }), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({
                "status": "error",
                "message": "No file selected."
            }), 400
        
        # Validate file extension
        allowed_extensions = {'.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm'}
        file_ext = Path(audio_file.filename).suffix.lower()
        if file_ext not in allowed_extensions:
            return jsonify({
                "status": "error",
                "message": f"Unsupported file format: '{file_ext}'. "
                           f"Allowed: {', '.join(sorted(allowed_extensions))}"
            }), 400
        
        # Get optional parameters
        language = request.form.get('language', None)
        task = request.form.get('task', 'transcribe')
        
        # Validate language parameter
        if language and language not in STTEngine.SUPPORTED_LANGUAGES:
            return jsonify({
                "status": "error",
                "message": f"Unsupported language: '{language}'. "
                           f"Supported: {STTEngine.get_supported_languages()}"
            }), 400
        
        # Validate task parameter
        if task not in ('transcribe', 'translate'):
            return jsonify({
                "status": "error",
                "message": "Task must be 'transcribe' or 'translate'."
            }), 400
        
        try:
            # Get the singleton engine instance
            engine = STTEngine.get_instance()
            
            # Read audio bytes and transcribe
            audio_bytes = audio_file.read()
            result = engine.transcribe_bytes(
                audio_bytes=audio_bytes,
                language=language if language else None,
                task=task,
                filename=audio_file.filename
            )
            
            # Return appropriate HTTP status
            if result["status"] == "success":
                return jsonify(result), 200
            else:
                return jsonify(result), 422  # Unprocessable Entity
                
        except Exception as e:
            logger.error(f"Transcription endpoint error: {e}", exc_info=True)
            return jsonify({
                "status": "error",
                "message": "Internal server error during transcription."
            }), 500


    @stt_bp.route('/status', methods=['GET'])
    def status():
        """
        Get the STT engine status (health check).
        
        Response:
            {
                "status": "ready",
                "model_size": "medium",
                "device": "cpu",
                "supported_languages": {"en": "English", "ur": "Urdu"},
                "model_downloaded": true
            }
        """
        try:
            engine = STTEngine.get_instance()
            return jsonify(engine.get_status()), 200
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500


    @stt_bp.route('/languages', methods=['GET'])
    def languages():
        """
        Get supported languages.
        
        Response:
            {
                "languages": {"en": "English", "ur": "Urdu"}
            }
        """
        return jsonify({
            "languages": STTEngine.get_supported_languages()
        }), 200
