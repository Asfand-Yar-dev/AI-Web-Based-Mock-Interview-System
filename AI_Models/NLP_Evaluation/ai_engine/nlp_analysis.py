"""
NLP Answer Evaluation Module for Smart Mock Interview System

Provides semantic similarity analysis between user answers and reference answers
using Sentence-BERT embeddings.

Usage (Backend Integration):
    from ai_engine.nlp_analysis import NLPAnalyzer

    analyzer = NLPAnalyzer()
    score, feedback = analyzer.evaluate_answer(user_answer, reference_answer)

Dependencies:
    pip install sentence-transformers torch

Author: Smart Mock Interview System Team
Date: 2026-02-08
"""

import logging
import warnings

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


class NLPAnalyzer:
    """
    NLP Analyzer class for evaluating user answers against reference answers.
    Uses Sentence-BERT (all-MiniLM-L6-v2) for semantic similarity analysis.
    """
    
    def __init__(self):
        """
        Initialize the NLP Analyzer by loading the pre-trained Sentence-BERT model.
        The model is loaded once during initialization for efficiency.
        """
        logger.info("Loading Sentence-BERT model (all-MiniLM-L6-v2)...")
        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Model loaded successfully!")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def evaluate_answer(self, user_answer, reference_answer, question_text=None):
        """
        Evaluate the user's answer against a reference answer.
        
        Args:
            user_answer (str): The answer provided by the user
            reference_answer (str): The correct/reference answer
            question_text (str, optional): The original question asked
            
        Returns:
            tuple: (score, feedback)
                - score (float): Similarity score as percentage (0-100)
                - feedback (str): Qualitative feedback based on the score
        """
        # Input validation
        if not user_answer or len(user_answer.strip()) < 5:
            return 0.0, "No answer provided or answer is too short. Please enter a proper response."
        
        if not reference_answer or not reference_answer.strip():
            return 0.0, "No reference answer available for comparison."
        
        try:
            user_embedding = self.model.encode([user_answer])
            
            # Check if the user is just repeating the question
            if question_text and len(question_text.strip()) > 5:
                question_embedding = self.model.encode([question_text])
                question_similarity = cosine_similarity(user_embedding, question_embedding)[0][0]
                
                # If they are just parroting the question, similarity will be very high (e.g., > 0.8)
                if question_similarity > 0.85:
                    return 0.0, "You appear to have just repeated the question. Please provide a substantive answer."
            
            reference_embedding = self.model.encode([reference_answer])
            
            # Calculate cosine similarity with the reference answer
            similarity = cosine_similarity(user_embedding, reference_embedding)[0][0]
            
            # Convert to percentage (0-100), but scale it so that low similarities (e.g., < 0.4) 
            # approach 0, instead of getting an artificial 40% score.
            # Map [0.4, 1.0] to [0, 100]
            scaled_similarity = max(0.0, min(1.0, (similarity - 0.4) / 0.6))
            score = float(scaled_similarity * 100)
            
            # Generate qualitative feedback based on score thresholds
            feedback = self._generate_feedback(score)
            
            return round(score, 2), feedback
            
        except Exception as e:
            logger.error(f"Error during evaluation: {e}")
            return 0.0, f"Error during analysis: {str(e)}"
    
    def _generate_feedback(self, score):
        """
        Generate qualitative feedback based on the similarity score.
        
        Args:
            score (float): Similarity score (0-100)
            
        Returns:
            str: Qualitative feedback message
        """
        if score >= 90:
            return "Excellent answer! Highly relevant and comprehensive."
        elif score >= 80:
            return "Very good answer! Strong relevance with minor room for improvement."
        elif score >= 70:
            return "Good answer! Relevant but could include more details."
        elif score >= 60:
            return "Satisfactory answer. Relevant but lacks depth and detail."
        elif score >= 50:
            return "Partially relevant. Misses key concepts or details."
        elif score >= 30:
            return "Weak answer. Limited relevance to the reference answer."
        else:
            return "Off-topic or irrelevant. Please review the question carefully."

