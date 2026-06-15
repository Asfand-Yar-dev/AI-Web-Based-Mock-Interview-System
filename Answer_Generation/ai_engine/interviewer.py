"""
Interviewer Agent Module for Smart Mock Interview System
==========================================================

This module uses Google's Gemini API to generate technical interview questions
and provide feedback on candidate answers.

Usage (Backend Integration):
    from ai_engine.interviewer import InterviewConductor

    conductor = InterviewConductor(api_key="your_key")
    questions = conductor.generate_questions(
        job_role="Python Developer",
        tech_stack="Python, Django",
        difficulty="Medium"
    )
    feedback = conductor.generate_feedback(question, user_answer)

Dependencies:
    pip install google-generativeai

Author: Smart Mock Interview System Team
Version: 1.0
"""

import logging
import os
import re
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
# import google.generativeai as genai
import openai

# Load environment variables from .env file (project root)
# This makes GEMINI_API_KEY available via os.getenv()
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)


class InterviewConductor:
    """
    A class to conduct technical interviews using Google's Gemini AI.
    
    This class generates relevant technical questions based on the candidate's
    profile and provides constructive feedback on their answers.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the InterviewConductor with Groq API.
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            self.model = None
            logger.warning("No GROQ_API_KEY found. InterviewConductor will not be functional.")
        else:
            self.client = openai.OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=self.api_key,
            )
            self.model = "llama-3.3-70b-versatile"
            logger.info("InterviewConductor initialized successfully with Groq API")

    def _generate_with_retry(self, prompt: str) -> str:
        """
        Generate content using Groq API.
        """
        if not self.model:
            raise RuntimeError("Groq model not initialized. Check your GROQ_API_KEY.")
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as e:
            logger.error(f"Groq API generation failed: {e}")
            raise RuntimeError(f"Groq API Error: {e}")
            
    
    def generate_questions(
        self, 
        job_role: str, 
        tech_stack: str, 
        difficulty: str = "Medium"
    ) -> List[str]:
        """
        Generate technical interview questions based on the candidate's profile.
        
        Args:
            job_role (str): Target job role (e.g., "Full Stack Developer", "Data Scientist")
            tech_stack (str): Technologies the candidate knows (e.g., "React, Node.js, MongoDB")
            difficulty (str): Question difficulty level - "Easy", "Medium", or "Hard"
        
        Returns:
            List[str]: A list of 5 technical interview questions as clean strings
        
        Example:
            >>> conductor = InterviewConductor()
            >>> questions = conductor.generate_questions(
            ...     job_role="Backend Developer",
            ...     tech_stack="Python, Django, PostgreSQL",
            ...     difficulty="Medium"
            ... )
            >>> print(questions[0])
            "Explain how Django's ORM handles database transactions and when you would use atomic blocks."
        """
        # Construct a strict system prompt
        system_prompt = f"""You are a Professional Technical Recruiter conducting a technical interview.

Your task is to generate EXACTLY 5 distinct, high-quality technical interview questions for the following profile:

- Job Role: {job_role}
- Tech Stack: {tech_stack}
- Difficulty Level: {difficulty}

STRICT REQUIREMENTS:
1. Generate exactly 5 questions
2. Questions should be:
   - Conceptual (testing understanding, not just syntax)
   - Scenario-based where appropriate
   - Relevant to the specific tech stack mentioned
   - Progressive in difficulty
   - Distinct from each other (no overlapping topics)

3. Question types to include:
   - Core concepts and fundamentals
   - Real-world problem-solving scenarios
   - Best practices and design patterns
   - Performance and optimization
   - Architecture and system design (for senior roles)

4. OUTPUT FORMAT:
   - Return ONLY the questions, one per line
   - NO numbering (no "1.", "2.", etc.)
   - NO markdown formatting (no *, **, -, etc.)
   - NO additional commentary or explanations
   - Each question should be a complete, grammatically correct sentence

Example output format:
Explain the difference between var, let, and const in JavaScript and when to use each.
How would you optimize a React application that is experiencing performance issues?
Describe a situation where you would use Redux over React Context API.
What are the security considerations when implementing JWT authentication?
How would you design a scalable microservices architecture for an e-commerce platform?

Now generate the questions:"""

        try:
            # Generate content using Gemini API
            generated_text = self._generate_with_retry(system_prompt)
            
            # Split by newlines and clean up
            raw_questions = generated_text.split('\n')
            
            # Clean and filter questions
            cleaned_questions = []
            for question in raw_questions:
                # Remove leading/trailing whitespace
                question = question.strip()
                
                # Skip empty lines
                if not question:
                    continue
                
                # Remove numbering patterns (1., 1), a., -, *, etc.)
                question = re.sub(r'^[\d\w][\.\)]\s*', '', question)
                question = re.sub(r'^[-*•]\s*', '', question)
                
                # Remove markdown bold/italic
                question = re.sub(r'\*\*([^*]+)\*\*', r'\1', question)
                question = re.sub(r'\*([^*]+)\*', r'\1', question)
                
                # Final trim
                question = question.strip()
                
                # Only add non-empty questions
                if question:
                    cleaned_questions.append(question)
            
            # Ensure we have exactly 5 questions (take first 5 if more, pad if less)
            if len(cleaned_questions) > 5:
                cleaned_questions = cleaned_questions[:5]
            elif len(cleaned_questions) < 5:
                logger.warning(f"Only {len(cleaned_questions)} questions generated. Expected 5.")
            
            return cleaned_questions
        
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            # STRICT REQUIREMENT: Do not fall back to custom/implemented questions.
            # If Gemini fails, propagate the error so the backend can fail hard.
            raise RuntimeError(f"Gemini question generation failed: {str(e)}")
    
    def generate_soft_skills_questions(self, job_role: str, num_questions: int = 3) -> List[str]:
        """
        Generate soft skills and behavioral interview questions.
        
        Args:
            job_role (str): Target job role (e.g., "Full Stack Developer")
            num_questions (int): Number of soft skills questions to generate (default: 3)
        
        Returns:
            List[str]: List of soft skills/behavioral interview questions
        
        Example:
            >>> conductor = InterviewConductor()
            >>> questions = conductor.generate_soft_skills_questions(
            ...     job_role="Project Manager",
            ...     num_questions=3
            ... )
        """
        soft_skills_prompt = f"""You are a Professional HR Interviewer conducting behavioral and soft skills assessment.

Your task is to generate EXACTLY {num_questions} soft skills and behavioral interview questions for a {job_role} position.

QUESTION CATEGORIES (choose diverse topics):
1. Leadership and Teamwork
   - Leading teams, collaboration, conflict resolution
   - Examples: "Describe a time when you led a team through a challenging project"

2. Communication Skills
   - Presentation, stakeholder management, cross-functional communication
   - Examples: "How do you explain technical concepts to non-technical stakeholders?"

3. Problem-Solving and Adaptability
   - Handling challenges, adapting to change, creative solutions
   - Examples: "Tell me about a time when you had to adapt to a major project change"

4. Time Management and Prioritization
   - Managing deadlines, prioritizing tasks, handling pressure
   - Examples: "How do you prioritize when you have multiple urgent tasks?"

5. Professional Development
   - Learning, growth mindset, handling feedback
   - Examples: "Describe a situation where you received critical feedback and how you responded"

6. Ethics and Integrity
   - Ethical decisions, honesty, professionalism
   - Examples: "Tell me about a time when you had to make a difficult ethical decision"

STRICT REQUIREMENTS:
1. Generate exactly {num_questions} questions
2. Questions should be:
   - Behavioral (using STAR method prompts when appropriate)
   - Relevant to {job_role} responsibilities
   - Open-ended and thought-provoking
   - Diverse across different soft skill categories
   - Professional and clear

3. OUTPUT FORMAT:
   - Return ONLY the questions, one per line
   - NO numbering (no "1.", "2.", etc.)
   - NO markdown formatting (no *, **, -, etc.)
   - NO additional commentary
   - Each question should be a complete sentence

Example output format:
Describe a time when you had to work with a difficult team member and how you handled the situation.
How do you handle pressure and tight deadlines in your work?
Tell me about a situation where you had to learn a new skill quickly to complete a project.

Now generate the soft skills questions:"""

        try:
            # Generate content using Gemini API
            generated_text = self._generate_with_retry(soft_skills_prompt)
            
            # Split by newlines and clean up
            raw_questions = generated_text.split('\n')
            
            # Clean and filter questions
            cleaned_questions = []
            for question in raw_questions:
                # Remove leading/trailing whitespace
                question = question.strip()
                
                # Skip empty lines
                if not question:
                    continue
                
                # Remove numbering patterns
                question = re.sub(r'^[\d\w][\.\)]\s*', '', question)
                question = re.sub(r'^[-*•]\s*', '', question)
                
                # Remove markdown bold/italic
                question = re.sub(r'\*\*([^*]+)\*\*', r'\1', question)
                question = re.sub(r'\*([^*]+)\*', r'\1', question)
                
                # Final trim
                question = question.strip()
                
                # Only add non-empty questions
                if question:
                    cleaned_questions.append(question)
            
            # Ensure we have the requested number of questions
            if len(cleaned_questions) > num_questions:
                cleaned_questions = cleaned_questions[:num_questions]
            elif len(cleaned_questions) < num_questions:
                logger.warning(f"Only {len(cleaned_questions)} soft skills questions generated. Expected {num_questions}.")
            
            return cleaned_questions
        
        except Exception as e:
            logger.error(f"Error generating soft skills questions: {str(e)}")
            # STRICT REQUIREMENT: Do not fall back to custom/implemented questions.
            # If Gemini fails, propagate the error so the backend can fail hard.
            raise RuntimeError(f"Gemini soft-skills question generation failed: {str(e)}")
    
    def generate_feedback(self, question: str, user_answer: str) -> str:
        """
        Evaluate a candidate's answer and provide constructive feedback.
        
        Args:
            question (str): The interview question that was asked
            user_answer (str): The candidate's answer/transcript
        
        Returns:
            str: A constructive feedback paragraph analyzing the answer
        """
        feedback_prompt = f"""You are a Senior Technical Interviewer providing constructive feedback on a candidate's answer.

QUESTION ASKED:
{question}

CANDIDATE'S ANSWER:
{user_answer}

Your task is to evaluate this answer and provide constructive feedback. Analyze the following aspects:

1. **Correctness**: Is the answer technically accurate?
2. **Depth**: Does it demonstrate deep understanding or just surface-level knowledge?
3. **Completeness**: What important concepts or details are missing?
4. **Clarity**: Is the explanation clear and well-structured?


OUTPUT FORMAT:
- Plain text paragraph only
- NO bullet points or numbered lists
- NO markdown formatting
- NO section headers

Generate the feedback now:"""

        try:
            # Generate feedback using Gemini API
            feedback = self._generate_with_retry(feedback_prompt)
            
            # Remove any markdown formatting that might have slipped through
            feedback = re.sub(r'\*\*([^*]+)\*\*', r'\1', feedback)
            feedback = re.sub(r'\*([^*]+)\*', r'\1', feedback)
            feedback = re.sub(r'^[-*•]\s*', '', feedback, flags=re.MULTILINE)
            
            return feedback
        
        except Exception as e:
            logger.error(f"Error generating feedback: {str(e)}")
            return (
                f"Thank you for your answer. While I encountered a technical issue "
                f"analyzing your response in detail, I encourage you to review the key "
                f"concepts related to: {question[:50]}... "
                f"Consider exploring this topic further to strengthen your understanding."
            )

    def evaluate_technical_score(self, question: str, user_answer: str, reference_answer: str = "") -> int:
        """
        Perform high-fidelity technical scoring of the candidate's response.
        Distinguishes between genuine answers, repeated questions, and filler.
        """
        scoring_prompt = f"""You are a Senior Technical Recruiter. Grade this interview answer.

IMPORTANT CONTEXT: The candidate's response below is an automatic speech-to-text transcript.
It may contain minor recognition errors, repeated words, or missing punctuation. Evaluate the
TECHNICAL CONTENT and UNDERSTANDING, not transcription quality. Give benefit of the doubt for
small wording issues if the core idea is correct.

[QUESTION]
{question}

{"[REFERENCE ANSWER]" + chr(10) + reference_answer if reference_answer else ""}

[CANDIDATE RESPONSE — speech transcript]
{user_answer}

[GRADING SCALE]
0   – Empty, silent, or literally just "I don't know" with no attempt.
0   – Candidate only read the question back verbatim with zero added content.
1-20  – Completely wrong or incoherent answer with no relevant technical content.
21-40 – Partial understanding shown; key concepts missing or confused.
41-59 – Basic understanding present; answer is incomplete or lacks important detail.
60-75 – Correct answer, covers the main points but could be more detailed.
76-90 – Strong answer with good technical depth and mostly correct details.
91-100 – Excellent answer: comprehensive, precise, demonstrates real expertise.

IMPORTANT: A correct answer that is simply brief should score at least 60.
Do NOT penalise for speaking style or filler words — only for wrong or missing technical content.

OUTPUT: Return ONLY the integer score (0-100). No explanation."""
        
        try:
            result = self._generate_with_retry(scoring_prompt)
            logger.info(f"Technical Scoring Raw Output: '{result}'")
            
            # Robust extraction: find the first number in the response
            numbers = re.findall(r'\d+', result)
            if numbers:
                # Take the most likely score (usually the first number)
                score = int(numbers[0])
                # Safety check for multi-number responses (like "Score: 80/100")
                if score == 100 and len(numbers) > 1 and int(numbers[1]) == 100:
                   score = 100
                elif score > 100:
                    score = 100
                
                logger.info(f"Final Assigned Score: {score}")
                return score
            
            logger.warning("LLM didn't return a score number. Defaulting to 10 (effort detected).")
            return 10
        except Exception as e:
            logger.error(f"Scoring engine error: {e}")
            return 50 # Standard fallback for system errors

    def generate_vetting_question(self, profile: dict, conversation: List[dict]) -> str:
        history_str = ""
        for msg in conversation:
            history_str += f"{msg['role'].capitalize()}: {msg['content']}\n"

        prompt = f"""You are the Intervexa AI Vetting Assistant. Your job is to conduct a professional chat interview to verify a new expert who wants to join our mock interview platform as an interviewer.

Interviewer Profile under review:
- Domains: {", ".join(profile.get("domains", []))}
- Roles: {", ".join(profile.get("roles", []))}
- Skills: {", ".join(profile.get("skills", []))}
- Bio: {profile.get("bio", "No bio provided.")}

Here is the conversation history so far:
{history_str}

STRICT INSTRUCTIONS:
1. Generate the next logical question to ask the candidate.
2. Ask a mix of short or medium length technical, conceptual, and situational questions. Make sure the questions specifically test their technical depth and evaluation mindset in the skills and domains they listed.
3. Do NOT repeat questions already asked.
4. Keep it conversational, warm, and highly professional.
5. Limit the question to exactly 1 or 2 sentences.
6. Return ONLY the question. Do not include any greeting, introduction, meta-commentary, or markdown formatting.

Next question:"""
        return self._generate_with_retry(prompt)

    def evaluate_live_interview(self, role: str, domain: str, skills: List[str],
                                 transcript: str, interviewer_score: int) -> dict:
        """
        Evaluate a live human mock interview from the full Q&A transcript.

        The interviewer pastes the questions they asked and the candidate's
        answers. The AI evaluates each Q-A pair for technical correctness,
        communication, confidence, and problem-solving ability, then returns
        structured dimension scores identical in shape to the free-interview
        analysis pipeline.

        Args:
            role:              Job role being interviewed for.
            domain:            Domain/industry (e.g. "software", "data science").
            skills:            List of skills/topics the interview covered.
            transcript:        Full Q&A transcript (Q: ... A: ... format).
            interviewer_score: The human interviewer's manual score (0-100).

        Returns:
            dict with keys: technical_score, communication_score,
            confidence_score, problem_solving_score, overall_score,
            questions_evaluated, strengths, improvements, summary
        """
        skills_str = ", ".join(skills) if skills else "general software engineering"

        prompt = f"""You are an expert technical interview evaluator at a top technology company.

A human interviewer conducted a live mock interview and has provided the full transcript below.
Your job is to evaluate the CANDIDATE's performance across 4 dimensions.

═══ INTERVIEW CONTEXT ═══
Role:              {role}
Domain:            {domain}
Skills Covered:    {skills_str}
Human Interviewer Score: {interviewer_score}/100

═══ FULL Q&A TRANSCRIPT ═══
{transcript}

═══ EVALUATION INSTRUCTIONS ═══
Read every Question-Answer pair in the transcript carefully. Then score the candidate:

1. technical_score (0-100)
   — Are the candidate's answers technically correct?
   — Do they show genuine depth of knowledge (not just buzzwords)?
   — Do they use specific examples, data structures, algorithms, patterns?

2. communication_score (0-100)
   — Are answers clear, well-structured, and easy to follow?
   — Does the candidate explain complex ideas in plain language?
   — Are answers focused (not rambling or off-topic)?

3. confidence_score (0-100)
   — Does the candidate seem composed and assertive in their answers?
   — Do they answer directly or hedge excessively?
   — Do they defend their reasoning when appropriate?

4. problem_solving_score (0-100)
   — Does the candidate break down problems methodically?
   — Do they consider edge cases, trade-offs, and alternatives?
   — Do they ask clarifying questions when needed?

Also provide:
- questions_evaluated: count of Q-A pairs you found in the transcript
- 3-5 specific strengths (based on actual answers in the transcript)
- 3-5 specific areas for improvement (based on actual weaknesses spotted)
- summary: 2-3 sentence paragraph summarising the overall performance

SCORING GUIDE:
90-100 = Exceptional — expert-level answers throughout
75-89  = Strong — mostly correct with good depth
60-74  = Good — correct but could be more detailed
45-59  = Average — shows understanding but notable gaps
30-44  = Below average — surface-level or partially incorrect answers
0-29   = Poor — mostly incorrect or very incomplete

CRITICAL OUTPUT RULES:
- Return ONLY raw JSON. NO markdown, NO ```json fences, NO extra text.
- overall_score = round((technical_score + communication_score + confidence_score + problem_solving_score) / 4)

Expected JSON structure:
{{
  "technical_score": <0-100>,
  "communication_score": <0-100>,
  "confidence_score": <0-100>,
  "problem_solving_score": <0-100>,
  "overall_score": <0-100>,
  "questions_evaluated": <integer>,
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "improvements": ["specific area 1", "specific area 2", "specific area 3"],
  "summary": "<2-3 sentence overall assessment>"
}}

Now evaluate and return ONLY the JSON:"""

        import json as _json
        import re as _re

        raw = self._generate_with_retry(prompt)
        logger.info(f"evaluate_live_interview raw output (first 200): {raw[:200]}")

        # Robust extraction — find the outermost JSON object
        match = _re.search(r'\{[\s\S]+\}', raw)
        if not match:
            raise RuntimeError(f"AI did not return valid JSON. Raw output: {raw[:300]}")

        result = _json.loads(match.group())

        # Validate and clamp all numeric fields
        for field in ('technical_score', 'communication_score', 'confidence_score',
                      'problem_solving_score', 'overall_score'):
            val = result.get(field, 0)
            result[field] = max(0, min(100, int(val)))

        # Recompute overall_score from dimensions (don't trust the model's arithmetic)
        result['overall_score'] = round(
            (result['technical_score'] + result['communication_score'] +
             result['confidence_score'] + result['problem_solving_score']) / 4
        )

        # Ensure list fields exist
        result.setdefault('strengths', [])
        result.setdefault('improvements', [])
        result.setdefault('summary', '')
        result.setdefault('questions_evaluated', 0)

        return result

    def evaluate_vetting(self, profile: dict, conversation: List[dict]) -> str:
        history_str = ""
        for msg in conversation:
            history_str += f"{msg['role'].capitalize()}: {msg['content']}\n"

        prompt = f"""You are the Intervexa AI Vetting Evaluator. Review this chat interview between our AI Vetting Assistant and a candidate applying to be an interviewer on our platform.

Interviewer Profile under review:
- Domains: {", ".join(profile.get("domains", []))}
- Roles: {", ".join(profile.get("roles", []))}
- Skills: {", ".join(profile.get("skills", []))}
- Bio: {profile.get("bio", "No bio provided.")}

Conversation Transcript:
{history_str}

CRITICAL GRADING INSTRUCTIONS:
1. Be extremely strict and rigorous. We only verify top-tier experts.
2. The vetting chat consists of 10 rounds of questions. Check how many questions the candidate actually answered. If they skipped questions, left them blank, gave extremely brief/lazy responses (e.g. 'skip', 'yes', 'no', 'i don't know'), or only answered a few questions, they MUST fail. Set their score between 0 and 50 and set the decision to 'rejected'.
3. Evaluate their technical depth. Do they demonstrate genuine technical expertise? If their technical explanations are surface-level, shallow, or generic, penalize them heavily.
4. Empathy & Communication: Do they show a coaching, supportive mindset for mock interviewing?

STRICT OUTPUT REQUIREMENT:
You must output a single JSON object. Do NOT wrap the JSON in markdown formatting (like ```json). Return ONLY the raw JSON string.

Expected JSON format:
{{
  "score": <integer from 0 to 100>,
  "feedback": "<detailed feedback paragraph outlining their strengths and advice for areas of improvement>",
  "decision": "approved" or "rejected" (use "approved" only if score is 70 or higher, else "rejected")
}}

Now, generate the JSON output:"""
        return self._generate_with_retry(prompt)
