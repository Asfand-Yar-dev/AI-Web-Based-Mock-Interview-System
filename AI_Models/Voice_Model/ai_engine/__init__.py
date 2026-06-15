"""
AI Engine Package for Smart Mock Interview System

This package contains AI modules for analyzing interview performance:
- Vocal Characteristics Analysis: Clarity, confidence, tone, hesitation & stress
  analysis from audio using Wav2Vec2 deep features + signal-level acoustics.
"""

from .vocal_analysis import VocalToneAnalyzer

__version__ = "2.0.0"
__all__ = ["VocalToneAnalyzer"]
