# Integration Guide for NLP Answer Evaluation Module

## Quick Start Integration

### 1. Basic Import and Usage

```python
from ai_engine.nlp_analysis import NLPAnalyzer

# Initialize once (preferably at application startup)
nlp_analyzer = NLPAnalyzer()

# Use throughout your application
score, feedback = nlp_analyzer.evaluate_answer(user_answer, reference_answer)
```

---

## Integration Patterns

### Pattern 1: Interview Question Evaluator

```python
class InterviewEvaluator:
    """Evaluates interview answers with configurable thresholds."""

    def __init__(self, pass_threshold=60):
        self.nlp_analyzer = NLPAnalyzer()
        self.pass_threshold = pass_threshold

    def evaluate_question(self, question_data, user_answer):
        """
        Evaluate a single interview question.

        Args:
            question_data: dict with 'id', 'question', 'reference_answer'
            user_answer: str, the candidate's answer

        Returns:
            dict with evaluation results
        """
        score, feedback = self.nlp_analyzer.evaluate_answer(
            user_answer,
            question_data['reference_answer']
        )

        return {
            'question_id': question_data['id'],
            'question': question_data['question'],
            'user_answer': user_answer,
            'reference_answer': question_data['reference_answer'],
            'score': score,
            'feedback': feedback,
            'passed': score >= self.pass_threshold,
            'grade': self._get_grade(score)
        }

    def _get_grade(self, score):
        """Convert score to letter grade."""
        if score >= 90: return 'A'
        elif score >= 80: return 'B'
        elif score >= 70: return 'C'
        elif score >= 60: return 'D'
        else: return 'F'


# Usage
evaluator = InterviewEvaluator(pass_threshold=65)
result = evaluator.evaluate_question(
    {
        'id': 'Q001',
        'question': 'Explain Object-Oriented Programming',
        'reference_answer': 'OOP is a paradigm based on objects...'
    },
    user_answer='OOP uses objects to organize code...'
)

print(f"Score: {result['score']}% | Grade: {result['grade']}")
```

---

### Pattern 2: Multi-Question Interview Session

```python
class InterviewSession:
    """Manages and evaluates a complete interview session."""

    def __init__(self, session_id, candidate_name):
        self.session_id = session_id
        self.candidate_name = candidate_name
        self.nlp_analyzer = NLPAnalyzer()
        self.results = []

    def evaluate_all_questions(self, questions_and_answers):
        """
        Evaluate multiple questions at once.

        Args:
            questions_and_answers: list of tuples
                [(question_dict, user_answer), ...]

        Returns:
            dict with session summary
        """
        for question_data, user_answer in questions_and_answers:
            score, feedback = self.nlp_analyzer.evaluate_answer(
                user_answer,
                question_data['reference_answer']
            )

            self.results.append({
                'question': question_data['question'],
                'category': question_data.get('category', 'General'),
                'score': score,
                'feedback': feedback
            })

        return self.get_session_summary()

    def get_session_summary(self):
        """Generate overall session performance summary."""
        if not self.results:
            return None

        scores = [r['score'] for r in self.results]

        return {
            'session_id': self.session_id,
            'candidate': self.candidate_name,
            'total_questions': len(self.results),
            'average_score': round(sum(scores) / len(scores), 2),
            'max_score': max(scores),
            'min_score': min(scores),
            'passed_count': sum(1 for s in scores if s >= 60),
            'overall_grade': self._calculate_overall_grade(scores),
            'detailed_results': self.results
        }

    def _calculate_overall_grade(self, scores):
        """Calculate overall performance grade."""
        avg = sum(scores) / len(scores)
        if avg >= 90: return 'Excellent'
        elif avg >= 80: return 'Very Good'
        elif avg >= 70: return 'Good'
        elif avg >= 60: return 'Satisfactory'
        else: return 'Needs Improvement'


# Usage
session = InterviewSession('S001', 'John Doe')

questions = [
    ({'question': 'What is OOP?', 'reference_answer': '...'}, 'OOP is...'),
    ({'question': 'Explain REST APIs', 'reference_answer': '...'}, 'REST is...'),
]

summary = session.evaluate_all_questions(questions)
print(f"Average Score: {summary['average_score']}%")
print(f"Grade: {summary['overall_grade']}")
```

---

### Pattern 3: Real-Time Evaluation with Caching

```python
from functools import lru_cache
import hashlib

class OptimizedNLPEvaluator:
    """NLP evaluator with caching for repeated evaluations."""

    def __init__(self):
        self.nlp_analyzer = NLPAnalyzer()

    @lru_cache(maxsize=100)
    def _cached_evaluate(self, user_hash, ref_hash):
        """Internal cached evaluation method."""
        # Note: This is a simplified example
        # In practice, you'd need to store actual texts separately
        return self.nlp_analyzer.evaluate_answer(
            self._get_text(user_hash),
            self._get_text(ref_hash)
        )

    def evaluate_with_cache(self, user_answer, reference_answer):
        """
        Evaluate with caching to avoid redundant computations.
        """
        # Generate hashes for caching
        user_hash = hashlib.md5(user_answer.encode()).hexdigest()
        ref_hash = hashlib.md5(reference_answer.encode()).hexdigest()

        # Direct evaluation (caching can be added for production)
        return self.nlp_analyzer.evaluate_answer(user_answer, reference_answer)
```

---

### Pattern 4: Database Integration Example

```python
import sqlite3
from datetime import datetime

class DatabaseIntegratedEvaluator:
    """NLP evaluator with database persistence."""

    def __init__(self, db_path='interview_results.db'):
        self.nlp_analyzer = NLPAnalyzer()
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        """Initialize database tables."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                candidate_name TEXT,
                question_id TEXT,
                question TEXT,
                user_answer TEXT,
                reference_answer TEXT,
                score REAL,
                feedback TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        conn.commit()
        conn.close()

    def evaluate_and_save(self, session_id, candidate_name,
                         question_id, question, user_answer, reference_answer):
        """Evaluate and save to database."""
        # Evaluate
        score, feedback = self.nlp_analyzer.evaluate_answer(
            user_answer,
            reference_answer
        )

        # Save to database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO evaluations
            (session_id, candidate_name, question_id, question,
             user_answer, reference_answer, score, feedback)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, candidate_name, question_id, question,
              user_answer, reference_answer, score, feedback))

        conn.commit()
        conn.close()

        return {'score': score, 'feedback': feedback}

    def get_candidate_history(self, candidate_name):
        """Retrieve all evaluations for a candidate."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT question, score, feedback, timestamp
            FROM evaluations
            WHERE candidate_name = ?
            ORDER BY timestamp DESC
        ''', (candidate_name,))

        results = cursor.fetchall()
        conn.close()

        return results


# Usage
db_evaluator = DatabaseIntegratedEvaluator()
result = db_evaluator.evaluate_and_save(
    session_id='S001',
    candidate_name='John Doe',
    question_id='Q001',
    question='What is OOP?',
    user_answer='OOP is about objects...',
    reference_answer='OOP is a paradigm...'
)
```

---

## Performance Optimization Tips

### 1. **Load Model Once**

```python
# ✅ GOOD - Initialize once at startup
class Application:
    def __init__(self):
        self.nlp_analyzer = NLPAnalyzer()  # Load model once

#  BAD - Don't create new instance for each evaluation
def evaluate_answer(user_answer, reference):
    analyzer = NLPAnalyzer()  # Slow! Reloads model every time
    return analyzer.evaluate_answer(user_answer, reference)
```

### 2. **Batch Processing**

```python
def evaluate_batch(nlp_analyzer, answer_pairs):
    """Process multiple evaluations efficiently."""
    results = []
    for user_ans, ref_ans in answer_pairs:
        score, feedback = nlp_analyzer.evaluate_answer(user_ans, ref_ans)
        results.append((score, feedback))
    return results
```

### 3. **Async Evaluation (for web apps)**

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

class AsyncNLPEvaluator:
    def __init__(self):
        self.nlp_analyzer = NLPAnalyzer()
        self.executor = ThreadPoolExecutor(max_workers=4)

    async def evaluate_async(self, user_answer, reference_answer):
        """Non-blocking evaluation."""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            self.executor,
            self.nlp_analyzer.evaluate_answer,
            user_answer,
            reference_answer
        )
        return result
```

---

## Configuration & Customization

### Custom Feedback Thresholds

```python
# Modify the NLPAnalyzer class to accept custom thresholds
class CustomNLPAnalyzer(NLPAnalyzer):
    def __init__(self, thresholds=None):
        super().__init__()
        self.thresholds = thresholds or {
            'excellent': 90,
            'very_good': 80,
            'good': 70,
            'satisfactory': 60,
            'partial': 50,
            'weak': 30
        }

    def _generate_feedback(self, score):
        """Override with custom thresholds."""
        t = self.thresholds
        if score >= t['excellent']:
            return "Outstanding! Comprehensive and accurate."
        elif score >= t['very_good']:
            return "Excellent understanding demonstrated."
        # ... customize as needed
```

---

## Testing Your Integration

```python
def test_nlp_integration():
    """Basic integration test."""
    analyzer = NLPAnalyzer()

    # Test 1: Valid inputs
    score, feedback = analyzer.evaluate_answer(
        "OOP uses objects",
        "OOP is about objects"
    )
    assert 0 <= score <= 100
    assert isinstance(feedback, str)

    # Test 2: Empty answer
    score, feedback = analyzer.evaluate_answer("", "reference")
    assert score == 0

    # Test 3: Identical answers
    score, feedback = analyzer.evaluate_answer("same text", "same text")
    assert score >= 95  # Should be very high

    print("✅ All tests passed!")

if __name__ == "__main__":
    test_nlp_integration()
```

---

## Common Pitfalls to Avoid

1. **Don't reload the model repeatedly** - Initialize once
2. **Don't ignore empty inputs** - Always validate user input
3. **Don't treat score as absolute truth** - Use as guidance, not definitive measure
4. **Don't forget error handling** - Wrap evaluations in try-except blocks
5. **Don't block UI thread** - Use async/threading for web/GUI apps

---

## Next Steps

1. Integrate into your interview management system
2. Add database persistence for evaluation history
3. Create analytics dashboard showing trends
4. Implement automated interview reports
5. Add multi-language support (if needed)

---

## Support & Documentation

- **Module Documentation**: See `README.md`
- **Demo Examples**: Run `python demo.py`
- **GUI Testing**: Run `python ai_engine/nlp_analysis.py`
- **Dependencies**: `pip install -r requirements.txt`
