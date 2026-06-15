"""
Optimized Speech-to-Text Engine using OpenAI Whisper

Features:
- Supports English and Urdu only
- Local model storage (no re-downloading for each user)
- Singleton pattern for Flask integration (one model shared across requests)
- Supports both file path and raw bytes transcription (for Flask file uploads)
- Efficient GPU memory management
- Progress callback support
- Model caching
- Proper resource cleanup
- Comprehensive error handling

Flask Integration:
    from ai_models.stt_engine import STTEngine
    
    # Get singleton instance (loads model once, reuses across requests)
    engine = STTEngine.get_instance()
    
    # Transcribe from file path
    result = engine.transcribe_audio("audio.wav", language="en")
    
    # Transcribe from Flask uploaded file (raw bytes)
    audio_bytes = request.files['audio'].read()
    result = engine.transcribe_bytes(audio_bytes, language="ur")
"""

import whisper
import os
import torch
import gc
import logging
import tempfile
import time
import threading
from typing import Optional, Dict, Callable, Any, List
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Local models directory (relative to this file's location)
_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


class STTEngine:
    """Speech-to-Text Engine with optimized performance and resource management.
    
    Supported Languages:
        - English ('en')
        - Urdu ('ur')
    
    Model Storage:
        Models are stored locally in the 'models/' directory within the project.
        On first run, the model is downloaded once and saved there.
        All subsequent runs load the model from disk instantly without downloading.
        
        To pre-download the model for deployment, run:
            STTEngine.download_model("medium")
    """
    
    # Only English and Urdu are supported
    SUPPORTED_LANGUAGES = {
        'en': 'English',
        'ur': 'Urdu',
    }
    
    # Class-level cache for loaded models (shared across instances)
    _model_cache: Dict[str, Any] = {}
    
    # Singleton instance for Flask integration
    _instance: Optional['STTEngine'] = None
    _instance_lock = threading.Lock()
    
    @classmethod
    def get_instance(cls, model_size: str = "medium") -> 'STTEngine':
        """
        Get or create the singleton STTEngine instance.
        
        Use this in Flask to ensure all requests share one model instance.
        Thread-safe: only the first call loads the model.
        
        Args:
            model_size: Whisper model size (only used on first call)
            
        Returns:
            The shared STTEngine instance
            
        Example (Flask):
            engine = STTEngine.get_instance()
            result = engine.transcribe_audio(path)
        """
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:  # Double-check after acquiring lock
                    cls._instance = cls(model_size=model_size)
        return cls._instance
    
    def __init__(self, model_size: str = "medium", use_cache: bool = True):
        """
        Initialize the STT Engine.
        
        For Flask integration, use STTEngine.get_instance() instead of
        creating instances directly. This ensures one shared model.
        
        Args:
            model_size: Whisper model size ('tiny', 'base', 'small', 'medium', 'large')
            use_cache: Whether to use model caching (recommended for multiple instances)
        """
        self.model_size = model_size
        self.use_cache = use_cache
        self.model = None
        self.device = None
        self._model_loaded_at = None
        
        # Thread lock to prevent race conditions during concurrent STT requests
        self._transcribe_lock = threading.Lock()
        
        self._load_model()
    
    @staticmethod
    def get_models_dir() -> Path:
        """Get the local models directory path."""
        return _MODELS_DIR
    
    @staticmethod
    def get_model_path(model_size: str) -> Path:
        """Get the expected local file path for a given model size."""
        return _MODELS_DIR / f"{model_size}.pt"
    
    @staticmethod
    def is_model_downloaded(model_size: str) -> bool:
        """Check if a model is already downloaded locally."""
        model_path = STTEngine.get_model_path(model_size)
        return model_path.exists() and model_path.stat().st_size > 0
    
    @staticmethod
    def download_model(model_size: str = "medium") -> Path:
        """
        Pre-download a Whisper model to the local models/ directory.
        
        Run this ONCE during setup/deployment so users don't need to download.
        
        Args:
            model_size: Whisper model size ('tiny', 'base', 'small', 'medium', 'large')
            
        Returns:
            Path to the downloaded model file
        """
        _MODELS_DIR.mkdir(parents=True, exist_ok=True)
        model_path = _MODELS_DIR / f"{model_size}.pt"
        
        if model_path.exists() and model_path.stat().st_size > 0:
            logger.info(f"Model '{model_size}' already exists at: {model_path}")
            return model_path
        
        logger.info(f"Downloading Whisper '{model_size}' model to: {_MODELS_DIR}")
        logger.info("This is a one-time download...")
        
        # Use whisper's internal download to get the model file
        # This downloads to our local models/ directory
        whisper.load_model(model_size, download_root=str(_MODELS_DIR))
        
        logger.info(f"Model '{model_size}' downloaded successfully to: {model_path}")
        return model_path
    
    def _load_model(self) -> None:
        """Load the Whisper model from local storage (no re-download)."""
        logger.info(f"Loading Whisper '{self.model_size}' model...")
        
        try:
            # Determine optimal device
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {self.device}")
            
            # Check in-memory cache first (for multiple instances in same process)
            cache_key = f"{self.model_size}_{self.device}"
            if self.use_cache and cache_key in STTEngine._model_cache:
                logger.info("Loading model from memory cache (instant)...")
                self.model = STTEngine._model_cache[cache_key]
                logger.info("Model loaded from memory cache successfully")
                return
            
            # Ensure local models directory exists
            _MODELS_DIR.mkdir(parents=True, exist_ok=True)
            
            # Check if model is already downloaded locally
            model_path = self.get_model_path(self.model_size)
            if model_path.exists() and model_path.stat().st_size > 0:
                logger.info(f"Loading model from local storage: {model_path}")
                logger.info("No download needed - model found locally")
            else:
                logger.info(f"Model not found locally. Downloading to: {_MODELS_DIR}")
                logger.info("This is a one-time download. Future runs will load instantly.")
            
            # Load model from local directory (download_root points to our local folder)
            # If the model file already exists there, Whisper loads it directly without downloading
            self.model = whisper.load_model(
                self.model_size, 
                device=self.device,
                download_root=str(_MODELS_DIR)
            )
            
            # Optimize for inference
            self.model.eval()  # Set to evaluation mode
            if self.device == "cuda":
                # Enable optimizations for GPU
                torch.backends.cudnn.benchmark = True
                torch.cuda.empty_cache()  # Clear GPU cache
            
            # Cache the model in memory if enabled
            if self.use_cache:
                STTEngine._model_cache[cache_key] = self.model
            
            self._model_loaded_at = time.time()
            logger.info("Model loaded successfully (ready for transcription)")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            self.model = None
            raise
    
    def transcribe_audio(
        self, 
        audio_path: str, 
        language: Optional[str] = None,
        task: str = "transcribe",
        verbose: bool = False,
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio file to text.
        
        Only English ('en') and Urdu ('ur') are supported.
        
        Args:
            audio_path: Path to audio file
            language: Language code - 'en' (English) or 'ur' (Urdu). 
                      If None, auto-detects but only English/Urdu are accepted.
            task: 'transcribe' or 'translate' (translate to English)
            verbose: Enable detailed logging
            progress_callback: Optional callback function for progress updates (0-100)
            
        Returns:
            Dictionary with status, text, language, and other metadata
        """
        # Validate language if explicitly provided
        if language is not None and language not in self.SUPPORTED_LANGUAGES:
            supported = ', '.join(f"'{k}' ({v})" for k, v in self.SUPPORTED_LANGUAGES.items())
            return {
                "status": "error",
                "message": f"Unsupported language: '{language}'. Only supported languages are: {supported}"
            }
        # Validate model
        if self.model is None:
            return {"status": "error", "message": "Model not loaded"}
        
        # Validate file
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {"status": "error", "message": f"File not found: {audio_path}"}
        
        if not audio_file.is_file():
            return {"status": "error", "message": f"Path is not a file: {audio_path}"}
        
        try:
            if progress_callback:
                progress_callback(10)
            
            logger.info(f"Transcribing: {audio_file.name}")
            
            # Prepare transcription options
            options = {
                "fp16": self.device == "cuda",  # Use FP16 only on GPU
                "verbose": verbose,
                "task": task
            }
            
            if language:
                options["language"] = language
            
            if progress_callback:
                progress_callback(30)
            
            # Run transcription sequentially with thread lock to avoid Whisper's 
            # kv_cache hooks colliding and causing KeyErrors in Flask multithreading.
            with self._transcribe_lock:
                with torch.no_grad():  # Disable gradient computation for inference
                    result = self.model.transcribe(str(audio_path), **options)
            
            if progress_callback:
                progress_callback(90)
            
            # Validate detected language is supported (English or Urdu only)
            detected_lang = result.get('language', 'unknown')
            if detected_lang not in self.SUPPORTED_LANGUAGES:
                logger.warning(f"Detected unsupported language: '{detected_lang}'. This typically happens on background noise/silence. Returning empty text.")
                return {
                    "status": "success",
                    "text": "",
                    "language": "en",
                    "language_name": "English",
                    "device_used": self.device,
                    "segments": [],
                    "duration": audio_file.stat().st_size / (1024 * 1024)
                }
            
            # Clean up GPU memory if needed
            if self.device == "cuda":
                torch.cuda.empty_cache()
            
            if progress_callback:
                progress_callback(100)
            
            logger.info(f"Transcription completed successfully (language: {detected_lang})")
            
            return {
                "status": "success",
                "text": result['text'].strip(),
                "language": detected_lang,
                "language_name": self.SUPPORTED_LANGUAGES.get(detected_lang, 'Unknown'),
                "device_used": self.device,
                "segments": self._serialize_segments(result.get('segments', [])),
                "duration": audio_file.stat().st_size / (1024 * 1024)  # File size in MB
            }
            
        except torch.cuda.OutOfMemoryError:
            self._cleanup_gpu_memory()
            error_msg = "GPU out of memory. Try using a smaller model or CPU."
            logger.error(error_msg)
            return {"status": "error", "message": error_msg}
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
    
    def transcribe_bytes(
        self,
        audio_bytes: bytes,
        language: Optional[str] = None,
        task: str = "transcribe",
        filename: str = "upload.wav"
    ) -> Dict[str, Any]:
        """
        Transcribe audio from raw bytes (for Flask file uploads).
        
        This is the primary method for Flask integration. It accepts
        the raw bytes from request.files['audio'].read() and handles
        temporary file management internally.
        
        Args:
            audio_bytes: Raw audio file bytes
            language: 'en' (English) or 'ur' (Urdu), or None for auto-detect
            task: 'transcribe' or 'translate'
            filename: Original filename (used to determine file extension)
            
        Returns:
            Dictionary with status, text, language, and metadata
            
        Example (Flask):
            @app.route('/api/transcribe', methods=['POST'])
            def transcribe():
                audio_file = request.files['audio']
                engine = STTEngine.get_instance()
                result = engine.transcribe_bytes(
                    audio_file.read(),
                    language=request.form.get('language'),
                    filename=audio_file.filename
                )
                return jsonify(result)
        """
        if not audio_bytes:
            return {"status": "error", "message": "No audio data provided"}
        
        # Get file extension from filename
        ext = Path(filename).suffix or ".wav"
        
        # Write bytes to a temporary file for Whisper to process
        temp_file = None
        try:
            uploads_dir = _MODELS_DIR.parent / "uploads"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            
            temp_file = tempfile.NamedTemporaryFile(
                suffix=ext, delete=False, dir=str(uploads_dir)
            )
            temp_path = temp_file.name
            temp_file.write(audio_bytes)
            temp_file.close()
            
            # Use the existing transcribe_audio method
            result = self.transcribe_audio(
                audio_path=temp_path,
                language=language,
                task=task
            )
            return result
            
        except Exception as e:
            logger.error(f"Failed to process audio bytes: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
            
        finally:
            # Always clean up the temp file
            if temp_file and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get the current engine status (for health-check endpoints).
        
        Returns:
            Dictionary with model status information
            
        Example (Flask):
            @app.route('/api/stt/status')
            def stt_status():
                return jsonify(STTEngine.get_instance().get_status())
        """
        return {
            "status": "ready" if self.model is not None else "not_loaded",
            "model_size": self.model_size,
            "device": self.device,
            "supported_languages": self.SUPPORTED_LANGUAGES,
            "model_downloaded": self.is_model_downloaded(self.model_size),
            "models_dir": str(_MODELS_DIR),
            "loaded_at": self._model_loaded_at,
        }
    
    @classmethod
    def get_supported_languages(cls) -> Dict[str, str]:
        """
        Get supported languages dict (for API responses).
        
        Returns:
            Dict of language code -> language name
        """
        return dict(cls.SUPPORTED_LANGUAGES)
    
    @staticmethod
    def _serialize_segments(segments: list) -> List[Dict[str, Any]]:
        """
        Serialize Whisper segments to JSON-safe format.
        Strips non-serializable fields so Flask can jsonify the response.
        """
        serialized = []
        for seg in segments:
            serialized.append({
                "id": seg.get("id"),
                "start": round(seg.get("start", 0), 2),
                "end": round(seg.get("end", 0), 2),
                "text": seg.get("text", "").strip(),
            })
        return serialized
    
    def _cleanup_gpu_memory(self) -> None:
        """Force GPU memory cleanup."""
        if self.device == "cuda":
            torch.cuda.empty_cache()
            gc.collect()
            logger.info("GPU memory cleaned up")
    
    def unload_model(self) -> None:
        """Unload model and free memory."""
        if self.model is not None:
            self.model = None
            self._cleanup_gpu_memory()
            gc.collect()
            logger.info("Model unloaded, memory freed")
    
    def __del__(self):
        """Cleanup on deletion."""
        self.unload_model()
    
    @staticmethod
    def clear_cache() -> None:
        """Clear all cached models."""
        STTEngine._model_cache.clear()
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        gc.collect()
        logger.info("Model cache cleared")