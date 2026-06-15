# Interviewer Agent Module

A Python module for conducting AI-powered technical interviews using Google's Gemini API.

## Features

- ✅ Generate customized technical interview questions based on job role and tech stack
- ✅ Provide constructive feedback on candidate answers
- ✅ Support for multiple difficulty levels (Easy, Medium, Hard)
- ✅ Clean, production-ready code with comprehensive error handling
- ✅ Extensive testing framework included

## Installation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Or install the main dependency directly:

```bash
pip install google-generativeai
```

### 2. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 3. Set Up Environment Variable

**Windows (Command Prompt):**
```cmd
set GEMINI_API_KEY=your_api_key_here
```

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="your_api_key_here"
```

**Linux/Mac:**
```bash
export GEMINI_API_KEY=your_api_key_here
```

**Or use a .env file (recommended):**
Create a `.env` file in your project root:
```
GEMINI_API_KEY=your_api_key_here
```

## Usage

### Basic Example

```python
from ai_engine.interviewer import InterviewConductor

# Initialize the conductor
conductor = InterviewConductor()

# Generate interview questions
questions = conductor.generate_questions(
    job_role="Full Stack Developer",
    tech_stack="React, Node.js, Express, MongoDB",
    difficulty="Medium"
)

# Print questions
for i, question in enumerate(questions, 1):
    print(f"{i}. {question}")

# Get feedback on an answer
feedback = conductor.generate_feedback(
    question=questions[0],
    user_answer="Your answer here..."
)

print(f"\nFeedback: {feedback}")
```

### Running the Test Suite

```bash
python ai_engine/interviewer.py
```

This will:
1. Check for your API key
2. Generate questions for a "Python Developer" role
3. Generate questions for a "Full Stack Developer" role
4. Provide sample feedback on a test answer

## API Reference

### `InterviewConductor` Class

#### `__init__(api_key: Optional[str] = None)`
Initialize the conductor with Gemini API configuration.

**Parameters:**
- `api_key` (str, optional): Google Gemini API key. Reads from `GEMINI_API_KEY` env var if not provided.

#### `generate_questions(job_role: str, tech_stack: str, difficulty: str = "Medium") -> List[str]`
Generate technical interview questions.

**Parameters:**
- `job_role` (str): Target position (e.g., "Backend Developer")
- `tech_stack` (str): Technologies (e.g., "Python, Django, PostgreSQL")
- `difficulty` (str): "Easy", "Medium", or "Hard"

**Returns:**
- `List[str]`: 5 clean interview questions

#### `generate_feedback(question: str, user_answer: str) -> str`
Evaluate an answer and provide feedback.

**Parameters:**
- `question` (str): The interview question
- `user_answer` (str): Candidate's response

**Returns:**
- `str`: Constructive feedback paragraph

## Project Structure

```
Answer_Generation/
├── ai_engine/
│   └── interviewer.py      # Main module
├── requirements.txt         # Dependencies
└── README.md               # This file
```

## Error Handling

The module includes comprehensive error handling:
- Missing API key detection
- Fallback questions if API fails
- Graceful degradation with user-friendly error messages

## Example Output

### Generated Questions
```
1. Explain Django's ORM and how it handles database migrations.
2. How would you implement caching in a Django application to improve performance?
3. Describe the differences between PostgreSQL and NoSQL databases and when to use each.
4. How do you handle authentication and authorization in a RESTful API?
5. Explain how you would containerize a Django application using Docker.
```

### Sample Feedback
```
Your answer demonstrates a good understanding of the basic concept of closures in JavaScript.
However, you could strengthen your response by explaining lexical scope in more detail and 
providing a practical example of when closures are useful, such as in creating private 
variables or in callback functions. Additionally, mentioning potential memory implications 
and the relationship with the execution context would show a deeper understanding.
```

## Requirements

- Python 3.8+
- google-generativeai >= 0.3.0
- Valid Google Gemini API key

## Troubleshooting

### "API key not found" error
Make sure you've set the `GEMINI_API_KEY` environment variable or passed it to the constructor.

### "Module not found" error
Run `pip install google-generativeai` to install the required library.

### Questions not generating properly
Check your internet connection and ensure your API key is valid and has not exceeded rate limits.

## License

This module is part of the Smart Mock Interview System project.

## Support

For issues or questions, please contact the development team.
