#  Quick Start Guide - Interviewer Agent Module

Get up and running with the Interviewer Agent in under 5 minutes!

## Prerequisites

- Python 3.8 or higher
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

## Step 1: Install Dependencies

```bash
pip install google-generativeai
```

Or install all dependencies from requirements.txt:

```bash
pip install -r requirements.txt
```

## Step 2: Set Your API Key

### Option A: Environment Variable (Recommended)

**Windows (Command Prompt):**
```cmd
set GEMINI_API_KEY=your_actual_api_key_here
```

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="your_actual_api_key_here"
```

**Linux/Mac:**
```bash
export GEMINI_API_KEY=your_actual_api_key_here
```

### Option B: .env File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

## Step 3: Run the Test

```bash
python ai_engine/interviewer.py
```

This will run the built-in test suite and generate sample questions.

## Step 4: Try the Examples

```bash
python example_usage.py
```

This demonstrates multiple interview scenarios with different roles and difficulty levels.

## Step 5: Use in Your Code

```python
from ai_engine.interviewer import InterviewConductor

# Initialize
conductor = InterviewConductor()

# Generate questions
questions = conductor.generate_questions(
    job_role="Python Developer",
    tech_stack="Python, Django, PostgreSQL",
    difficulty="Medium"
)

# Print questions
for i, q in enumerate(questions, 1):
    print(f"{i}. {q}")

# Get feedback on an answer
feedback = conductor.generate_feedback(
    question=questions[0],
    user_answer="Your answer here..."
)
print(feedback)
```

## 🎉 That's it!

You're now ready to use the Interviewer Agent in your Smart Mock Interview System!

## Next Steps

- Integrate with your existing interview system
- Customize the prompts for your specific needs
- Add more difficulty levels or question types
- Build a GUI for easier interaction

## Troubleshooting

### "API key not found" error
Make sure you've set the `GEMINI_API_KEY` environment variable correctly.

### "Module not found" error
Run `pip install google-generativeai` to install the required library.

### Rate limiting errors
If you're making many requests quickly, you may hit API rate limits. Add delays between requests or upgrade your API plan.

## Need Help?

- Check the [README.md](README.md) for detailed documentation
- Review the [example_usage.py](example_usage.py) for more examples
- Consult the [Google Gemini API documentation](https://ai.google.dev/docs)
