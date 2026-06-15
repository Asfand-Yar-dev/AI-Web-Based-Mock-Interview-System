# Quick Start Guide - NLP Answer Evaluation Module

## ⚡ 5-Minute Quick Start

### Step 1: Install Dependencies (1 minute)

```bash
cd "c:/Users/PMLS/OneDrive - BUITEMS/BUITEMS/University/FYP/AI Modules/NLP_Evaluation"
pip install -r requirements.txt
```

### Step 2: Launch GUI Tester (30 seconds)

```bash
python ai_engine/nlp_analysis.py
```

The GUI will open with pre-loaded example data. Click **"Analyze Relevance"** to see it in action!

### Step 3: Try Your Own Data (2 minutes)

1. **Clear** the example data
2. Enter your **Reference Answer** (the correct answer)
3. Enter a **User Answer** (the answer to evaluate)
4. Click **"Analyze Relevance"**
5. View the **Score** and **Feedback**

---

## 🎯 Quick Code Example

### Minimal Integration (Copy & Paste Ready)

```python
from ai_engine.nlp_analysis import NLPAnalyzer

# Initialize (do this once at startup)
analyzer = NLPAnalyzer()

# Evaluate an answer
reference = "Python is a high-level programming language known for its simplicity."
user_answer = "Python is an easy-to-learn programming language."

score, feedback = analyzer.evaluate_answer(user_answer, reference)

print(f"Score: {score}%")
print(f"Feedback: {feedback}")
```

**Expected Output:**

```
Score: 78.5%
Feedback: Good answer! Relevant but could include more details.
```

---

## 📊 Understanding the Results

### Score Ranges:

| Range       | Meaning         | What It Says                                       |
| ----------- | --------------- | -------------------------------------------------- |
| **90-100%** | 🟢 Excellent    | Nearly perfect match - comprehensive understanding |
| **80-89%**  | 🟢 Very Good    | Strong grasp with minor gaps                       |
| **70-79%**  | 🟡 Good         | Understands core concepts but lacks detail         |
| **60-69%**  | 🟡 Satisfactory | Basic understanding, needs improvement             |
| **50-59%**  | 🟠 Partial      | Missing key concepts                               |
| **30-49%**  | 🔴 Weak         | Limited relevance                                  |
| **0-29%**   | 🔴 Off-topic    | Unrelated or incorrect                             |

---

## Run the Demo

Want to see multiple examples at once?

```bash
python demo.py
```

This will show 6 different scenarios:

1. ✅ Excellent answer
2. ✅ Good but brief answer
3. ⚠️ Partially relevant answer
4. Off-topic answer
5. ✅ Technical interview question
6. Empty answer (edge case)

**Runtime:** ~30 seconds (first run downloads model, subsequent runs are instant)

---

## 🔧 Common Tasks

### Task 1: Evaluate Multiple Questions

```python
analyzer = NLPAnalyzer()

questions = [
    ("What is OOP?", "OOP is a paradigm...", "OOP uses objects..."),
    ("Explain REST API", "REST is...", "REST APIs use HTTP..."),
]

for q, ref, ans in questions:
    score, feedback = analyzer.evaluate_answer(ans, ref)
    print(f"{q}: {score}%")
```

### Task 2: Set Custom Pass/Fail Threshold

```python
PASSING_SCORE = 65

score, feedback = analyzer.evaluate_answer(user_answer, reference)

if score >= PASSING_SCORE:
    print("✅ PASS:", feedback)
else:
    print(" FAIL:", feedback)
```

### Task 3: Save Results to File

```python
import json
from datetime import datetime

result = {
    'timestamp': datetime.now().isoformat(),
    'question': 'What is Python?',
    'user_answer': user_answer,
    'reference_answer': reference,
    'score': score,
    'feedback': feedback
}

with open('results.json', 'w') as f:
    json.dump(result, f, indent=2)
```

---

## ❓ Troubleshooting

### Problem: "ModuleNotFoundError: No module named 'sentence_transformers'"

**Solution:**

```bash
pip install sentence-transformers torch scikit-learn numpy
```

### Problem: "Model takes long to load first time"

**Solution:** This is normal. The model (~80MB) is being downloaded. Subsequent runs will be instant.

### Problem: "GUI doesn't open on Windows"

**Solution:** Ensure Python has tkinter installed. For Windows, it's usually included. Try:

```bash
python -m tkinter
```

If this fails, reinstall Python with tkinter enabled.

### Problem: "Low scores for seemingly good answers"

**Explanation:** The model compares semantic similarity. Very brief answers or different wording can result in lower scores. Consider this guidance:

- Scores are **relative**, not absolute truth
- Use them as **one signal** among multiple evaluation criteria
- Encourage complete answers with key concepts mentioned

---

## 📁 File Overview

```
NLP_Evaluation/
│
├── ai_engine/
│   └── nlp_analysis.py          ← Main module (NLPAnalyzer class + GUI)
│
├── demo.py                       ← Run this to see examples
├── requirements.txt              ← Install dependencies from here
├── README.md                     ← Full documentation
├── INTEGRATION_GUIDE.md          ← Integration patterns
├── ARCHITECTURE.md               ← Technical diagrams
└── QUICKSTART.md                 ← This file
```

---

## 🎓 Next Steps

1. **Test with your data**: Try actual interview questions from your domain
2. **Integrate**: See `INTEGRATION_GUIDE.md` for patterns
3. **Customize**: Adjust feedback thresholds in the code if needed
4. **Deploy**: Add to your Flask/Django app (see integration guide)

---

## 💡 Pro Tips

1. **Batch Processing**: If evaluating many answers, keep the analyzer instance alive (don't reinitialize)
2. **Error Handling**: Always wrap evaluations in try-except for production
3. **Logging**: Log all evaluations with timestamps for later analysis
4. **Thresholds**: Adjust passing scores based on question difficulty
5. **Combine Signals**: Use NLP score + keyword matching + manual review for best results

---

## 📞 Support

- **Documentation**: All `.md` files in this directory
- **Examples**: Run `demo.py` for comprehensive examples
- **Testing**: Run `python ai_engine/nlp_analysis.py` for GUI

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] GUI launches successfully (`python ai_engine/nlp_analysis.py`)
- [ ] Demo runs without errors (`python demo.py`)
- [ ] Can import module (`from ai_engine.nlp_analysis import NLPAnalyzer`)
- [ ] Understand score interpretation (see table above)

---

**Ready to evaluate some answers? Let's go! **

```bash
python ai_engine/nlp_analysis.py
```
