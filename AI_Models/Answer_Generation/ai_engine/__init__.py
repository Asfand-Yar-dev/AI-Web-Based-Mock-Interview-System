"""
AI Engine Package for Smart Mock Interview System
=================================================

This package contains AI-powered modules for conducting technical interviews.

Modules:
    - interviewer: Interview question generation and feedback using Gemini API
"""

from .interviewer import InterviewConductor

__all__ = ['InterviewConductor']
__version__ = '1.0.0'
