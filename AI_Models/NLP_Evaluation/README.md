# NLP Answer Evaluation Module

## Overview
This module provides semantic similarity analysis for evaluating user answers against reference answers using Sentence-BERT (all-MiniLM-L6-v2).

## Features
- **Semantic Similarity Analysis**: Uses state-of-the-art Sentence-BERT model
- **Cosine Similarity Scoring**: Provides percentage-based similarity scores (0-100%)
- **Qualitative Feedback**: Automatic feedback generation based on score thresholds
- **Testing GUI**: Built-in Tkinter interface for easy testing and demonstration

## Installation

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

Or install manually:
```bash
pip install sentence-transformers torch scikit-learn numpy
```

### 2. First Run (Model Download)
The first time you run the module, it will automatically download the `all-MiniLM-L6-v2` model (~80MB). This is a one-time process.

## Usage

### As a Standalone GUI Application
Simply run the script to launch the testing interface:
```bash
python ai_engine/nlp_analysis.py
```

### As a Python Module
Import and use the `NLPAnalyzer` class in your code:

```python
from ai_engine.nlp_analysis import NLPAnalyzer

# Initialize the analyzer (loads the model)
analyzer = NLPAnalyzer()

# Evaluate an answer
reference = "Object-Oriented Programming is a paradigm based on objects."
user_answer = "OOP uses objects to organize code."

score, feedback = analyzer.evaluate_answer(user_answer, reference)

print(f"Score: {score}%")
print(f"Feedback: {feedback}")
```

## Score Interpretation

| Score Range | Feedback | Interpretation |
|-------------|----------|----------------|
| 90-100% | Excellent answer | Highly relevant and comprehensive |
| 80-89% | Very good answer | Strong relevance, minor improvements possible |
| 70-79% | Good answer | Relevant but could include more details |
| 60-69% | Satisfactory answer | Relevant but lacks depth |
| 50-59% | Partially relevant | Misses key concepts |
| 30-49% | Weak answer | Limited relevance |
| 0-29% | Off-topic | Irrelevant or incorrect |

## GUI Features

The testing GUI includes:
- **Reference Answer Input**: Multi-line text area for the correct answer
- **User Answer Input**: Multi-line text area for the answer to evaluate
- **Analyze Button**: Triggers the evaluation
- **Clear Button**: Resets all fields
- **Load Example Button**: Loads sample data for testing
- **Color-Coded Results**: 
  - Green (≥80%): Excellent/Very Good
  - Orange (60-79%): Good/Satisfactory
  - Red (<60%): Needs Improvement

## Example Output

### Input:
- **Reference**: "Object-Oriented Programming (OOP) is a paradigm based on the concept of objects, which can contain data and code."
- **User Answer**: "OOP is about using objects to organize code."

### Output:
- **Score**: 82.5%
- **Feedback**: "Very good answer! Strong relevance with minor room for improvement."

## Technical Details

- **Model**: all-MiniLM-L6-v2 (Sentence-BERT)
- **Embedding Dimension**: 384
- **Similarity Metric**: Cosine Similarity
- **Framework**: Hugging Face Transformers via sentence-transformers

## File Structure
```
NLP_Evaluation/
├── ai_engine/
│   └── nlp_analysis.py    # Main module with NLPAnalyzer class and GUI
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Troubleshooting

### Issue: Module not found
**Solution**: Ensure all dependencies are installed:
```bash
pip install -r requirements.txt
```

### Issue: Slow first run
**Solution**: The first run downloads the model (~80MB). Subsequent runs will be fast as the model is cached.

### Issue: CUDA/GPU errors
**Solution**: The module works on CPU by default. If you have GPU issues, ensure PyTorch is properly installed:
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

## Integration with Smart Mock Interview System

To integrate this module into the main interview system:

```python
from ai_engine.nlp_analysis import NLPAnalyzer

class InterviewSystem:
    def __init__(self):
        self.nlp_analyzer = NLPAnalyzer()
    
    def evaluate_interview_answer(self, question_id, user_answer):
        # Get reference answer from database
        reference = self.get_reference_answer(question_id)
        
        # Evaluate
        score, feedback = self.nlp_analyzer.evaluate_answer(
            user_answer, 
            reference
        )
        
        return {
            'score': score,
            'feedback': feedback,
            'pass': score >= 60  # Configurable threshold
        }
```

## License
Part of the Smart Mock Interview System - FYP Project

## Author
PMLS - BUITEMS FYP Team
Date: February 2026
