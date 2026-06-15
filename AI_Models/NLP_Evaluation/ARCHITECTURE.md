# NLP Answer Evaluation Module - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Smart Mock Interview System                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              NLP Answer Evaluation Module                   │ │
│  │                  (nlp_analysis.py)                          │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │              NLPAnalyzer Class                        │  │ │
│  │  │                                                       │  │ │
│  │  │  ┌─────────────────────────────────────────────┐     │  │ │
│  │  │  │  __init__()                                 │     │  │ │
│  │  │  │  • Load Sentence-BERT model                 │     │  │ │
│  │  │  │  • Model: all-MiniLM-L6-v2                  │     │  │ │
│  │  │  └─────────────────────────────────────────────┘     │  │ │
│  │  │                                                       │  │ │
│  │  │  ┌─────────────────────────────────────────────┐     │  │ │
│  │  │  │  evaluate_answer(user_ans, ref_ans)         │     │  │ │
│  │  │  │  ┌────────────────────────────────────┐     │     │  │ │
│  │  │  │  │ 1. Validate inputs                 │     │     │  │ │
│  │  │  │  │ 2. Generate embeddings (384-dim)   │     │     │  │ │
│  │  │  │  │ 3. Calculate cosine similarity     │     │     │  │ │
│  │  │  │  │ 4. Convert to percentage (0-100)   │     │     │  │ │
│  │  │  │  │ 5. Generate feedback               │     │     │  │ │
│  │  │  │  └────────────────────────────────────┘     │     │  │ │
│  │  │  │  Returns: (score, feedback)                 │     │  │ │
│  │  │  └─────────────────────────────────────────────┘     │  │ │
│  │  │                                                       │  │ │
│  │  │  ┌─────────────────────────────────────────────┐     │  │ │
│  │  │  │  _generate_feedback(score)                  │     │  │ │
│  │  │  │  • Score >= 90: Excellent                   │     │  │ │
│  │  │  │  • Score 80-89: Very Good                   │     │  │ │
│  │  │  │  • Score 70-79: Good                        │     │  │ │
│  │  │  │  • Score 60-69: Satisfactory                │     │  │ │
│  │  │  │  • Score 50-59: Partial                     │     │  │ │
│  │  │  │  • Score 30-49: Weak                        │     │  │ │
│  │  │  │  • Score < 30: Off-topic                    │     │  │ │
│  │  │  └─────────────────────────────────────────────┘     │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │         NLPTesterGUI Class (Testing)                 │  │ │
│  │  │  • Reference Answer Input (TextArea)                 │  │ │
│  │  │  • User Answer Input (TextArea)                      │  │ │
│  │  │  • Analyze Button                                    │  │ │
│  │  │  • Results Display (Score + Feedback)                │  │ │
│  │  │  • Color-coded results                               │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────┐
│ User Answer  │
│ (Text Input) │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Input Validation    │
│ • Check non-empty   │
│ • Trim whitespace   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────┐         ┌──────────────────────┐
│ Sentence-BERT Encoder       │◄────────┤ Reference Answer     │
│ Model: all-MiniLM-L6-v2     │         │ (Text Input)         │
│                             │         └──────────────────────┘
│ • Tokenize text             │
│ • Generate embeddings       │
│   (384-dimensional vectors) │
└──────┬──────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ User Answer Embedding      │
│ [0.12, -0.34, 0.56, ...]   │
│ (384 dimensions)           │
└──────┬─────────────────────┘
       │
       │  ┌──────────────────────────┐
       │  │ Reference Embedding      │
       └─►│ [0.15, -0.31, 0.58, ...] │
          │ (384 dimensions)         │
          └──────┬───────────────────┘
                 │
                 ▼
       ┌──────────────────────┐
       │ Cosine Similarity    │
       │                      │
       │    A · B             │
       │ ─────────────        │
       │  ||A|| × ||B||       │
       │                      │
       │ Result: 0.0 to 1.0   │
       └──────┬───────────────┘
              │
              ▼
       ┌─────────────────┐
       │ Convert to %    │
       │ Score = sim×100 │
       └──────┬──────────┘
              │
              ▼
       ┌──────────────────────┐
       │ Feedback Generation  │
       │ Based on thresholds  │
       └──────┬───────────────┘
              │
              ▼
       ┌─────────────────┐
       │ Return Results  │
       │ • Score: 82.5%  │
       │ • Feedback: ... │
       └─────────────────┘
```

## Embedding Similarity Visualization

```
High Similarity (Score ≥ 80%)
─────────────────────────────
Reference: "Python is a programming language"
User:      "Python is a coding language"

Vector Space Representation:
    ┌─────────────────────┐
    │         ●───●       │  ← Vectors very close
    │      Ref   User     │
    │                     │
    └─────────────────────┘
    Cosine Similarity: ~0.85
    Score: 85%


Medium Similarity (Score 50-79%)
─────────────────────────────────
Reference: "Machine learning uses algorithms to learn from data"
User:      "AI helps computers make decisions"

Vector Space Representation:
    ┌─────────────────────┐
    │    ●                │
    │   Ref               │
    │         ●           │  ← Moderate distance
    │        User         │
    └─────────────────────┘
    Cosine Similarity: ~0.65
    Score: 65%


Low Similarity (Score < 50%)
─────────────────────────────
Reference: "Binary search tree is a data structure"
User:      "Python is used for web development"

Vector Space Representation:
    ┌─────────────────────┐
    │  ●                  │  ← Vectors far apart
    │ Ref                 │
    │                   ● │
    │                User │
    └─────────────────────┘
    Cosine Similarity: ~0.20
    Score: 20%
```

## Model Architecture: all-MiniLM-L6-v2

```
┌───────────────────────────────────────────────────────────┐
│              Sentence-BERT (all-MiniLM-L6-v2)             │
│                                                            │
│  Input: "Object-oriented programming uses objects"        │
│                          │                                 │
│                          ▼                                 │
│         ┌────────────────────────────┐                    │
│         │      Tokenization          │                    │
│         │  [CLS] Object oriented ... │                    │
│         └────────────┬───────────────┘                    │
│                      │                                     │
│                      ▼                                     │
│         ┌────────────────────────────┐                    │
│         │   BERT Encoder (6 Layers)  │                    │
│         │   • Self-attention         │                    │
│         │   • Feed-forward           │                    │
│         │   • Layer normalization    │                    │
│         └────────────┬───────────────┘                    │
│                      │                                     │
│                      ▼                                     │
│         ┌────────────────────────────┐                    │
│         │    Mean Pooling            │                    │
│         │  (Aggregate token vectors) │                    │
│         └────────────┬───────────────┘                    │
│                      │                                     │
│                      ▼                                     │
│         Output: [0.12, -0.34, 0.56, ... ]                 │
│                 384-dimensional vector                     │
│                                                            │
│  Model Stats:                                              │
│  • Parameters: ~22M                                        │
│  • Embedding Size: 384                                     │
│  • Max Sequence Length: 512 tokens                         │
│  • Speed: ~2000 sentences/second (CPU)                     │
└───────────────────────────────────────────────────────────┘
```

## Workflow for Interview System Integration

```
┌──────────────────┐
│  Interview Start │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ Initialize NLPAnalyzer  │  ← Load model once
│ (Application Startup)   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Present Question to     │
│ Candidate               │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Candidate Provides      │
│ Answer (Text/Speech)    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Call evaluate_answer()  │
│ • Pass user answer      │
│ • Pass reference answer │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Receive Results         │
│ • Score (0-100%)        │
│ • Feedback (string)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Store in Database       │
│ • Question ID           │
│ • User answer           │
│ • Score                 │
│ • Timestamp             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Display to Candidate    │
│ • Show score            │
│ • Show feedback         │
│ • Next question button  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ More questions?         │
│ Yes → Loop back         │
│ No  → Generate report   │
└─────────────────────────┘
```

## Performance Considerations

```
┌────────────────────────────────────────────────────┐
│              Performance Metrics                    │
├────────────────────────────────────────────────────┤
│                                                     │
│  Model Loading Time (First run):                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5-10 seconds    │
│                                                     │
│  Model Loading Time (Cached):                      │
│  ━━━━━━━━━━ 1-2 seconds                            │
│                                                     │
│  Single Evaluation (Short text):                   │
│  ━ ~50-100ms                                        │
│                                                     │
│  Single Evaluation (Long text):                    │
│  ━━━ ~100-300ms                                     │
│                                                     │
│  Batch Evaluation (10 answers):                    │
│  ━━━━━━ ~500-800ms                                 │
│                                                     │
├────────────────────────────────────────────────────┤
│              Memory Usage                           │
├────────────────────────────────────────────────────┤
│                                                     │
│  Model in Memory: ~250MB                            │
│  Per Evaluation: ~5-10MB (temporary)                │
│  Recommended RAM: 1GB+ available                    │
│                                                     │
└────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌──────────────────┐
│ User Input       │
└────────┬─────────┘
         │
         ▼
    ┌────────────┐
    │ Empty?     │───Yes──► Return (0, "No answer provided")
    └─────┬──────┘
          │ No
          ▼
    ┌──────────────┐
    │ Encode Text  │
    └─────┬────────┘
          │
          ▼
    ┌──────────────┐
    │ Success?     │───No──► Return (0, "Error: {message}")
    └─────┬────────┘
          │ Yes
          ▼
    ┌──────────────────┐
    │ Calculate Similarity │
    └─────┬──────────────┘
          │
          ▼
    ┌───────────────┐
    │ Return Results │
    └───────────────┘
```

## File Structure

```
NLP_Evaluation/
│
├── ai_engine/
│   └── nlp_analysis.py          # Main module
│       ├── NLPAnalyzer           # Core class
│       └── NLPTesterGUI          # Testing interface
│
├── demo.py                       # Usage examples
├── requirements.txt              # Dependencies
├── README.md                     # Documentation
├── INTEGRATION_GUIDE.md          # Integration patterns
└── ARCHITECTURE.md               # This file
```

## Dependencies Graph

```
┌─────────────────────────────────────────────────┐
│            nlp_analysis.py                      │
└────────┬────────────────────────────────────────┘
         │
         ├──► sentence-transformers
         │    └──► transformers
         │         └──► torch
         │              └──► numpy
         │
         ├──► scikit-learn
         │    └──► numpy
         │         └──► scipy
         │
         └──► tkinter (GUI)
              └──► (Built-in with Python)
```
