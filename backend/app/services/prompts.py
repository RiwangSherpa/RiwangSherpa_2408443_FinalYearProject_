"""
Centralized AI prompt templates for consistent, high-quality outputs
"""

class PromptTemplates:
    """Centralized prompt templates for AI interactions"""
    
    @staticmethod
    def roadmap_prompt(
        goal_title: str,
        goal_description: str,
        learning_style: str,
        num_steps: int
    ) -> str:
        """Generate a detailed roadmap generation prompt"""
        style_guidance = {
            "visual": "Focus on visual learning methods: diagrams, charts, videos, infographics, and visual representations.",
            "text": "Emphasize reading, note-taking, written exercises, and textual resources.",
            "practice": "Prioritize hands-on practice, coding exercises, projects, and practical applications.",
            "balanced": "Use a mix of visual, textual, and practical learning approaches."
        }
        
        return f"""You are an expert educational consultant creating a comprehensive study roadmap.

GOAL: {goal_title}
DESCRIPTION: {goal_description or "No specific description provided"}
LEARNING STYLE: {learning_style or "balanced"}
STYLE GUIDANCE: {style_guidance.get(learning_style or "balanced", style_guidance["balanced"])}

TASK: Create a {num_steps}-step study roadmap that guides the learner from beginner to mastery.

REQUIREMENTS:
1. Each step should be progressive, building on previous knowledge
2. Steps should be specific and actionable
3. Include estimated time commitments (in hours) for each step
4. Provide clear, concise descriptions (2-3 sentences per step)
5. Steps should be numbered sequentially (1, 2, 3, ...)
6. Make steps practical and achievable

OUTPUT FORMAT:
Return ONLY the numbered steps in this exact format:
1. [Step Title] - [Brief description of what to learn and how. Estimated: X hours]
2. [Step Title] - [Brief description of what to learn and how. Estimated: X hours]
...

Do not include any introductory text, explanations, or conclusions. Only return the numbered steps."""

    @staticmethod
    def quiz_prompt(
        goal_title: str,
        topic: str,
        num_questions: int,
        difficulty: str
    ) -> str:
        """Generate a detailed quiz generation prompt"""
        difficulty_guidance = {
            "easy": "Focus on fundamental concepts, basic definitions, and introductory knowledge. Questions should test recall and basic understanding.",
            "medium": "Test application of concepts, moderate problem-solving, and connecting related ideas. Mix of recall and application.",
            "hard": "Require deep understanding, critical thinking, analysis, and synthesis. Challenge the learner with complex scenarios."
        }
        
        return f"""You are an expert educator creating a comprehensive quiz to assess understanding.

CONTEXT:
- Learning Goal: {goal_title}
- Topic: {topic}
- Difficulty Level: {difficulty}
- Number of Questions: {num_questions}

DIFFICULTY GUIDANCE: {difficulty_guidance.get(difficulty, difficulty_guidance["medium"])}

TASK: Generate {num_questions} multiple-choice questions about {topic} related to {goal_title}.

REQUIREMENTS:
1. Each question must have exactly 4 options (A, B, C, D)
2. Only one correct answer per question
3. Distractors (wrong answers) should be plausible but clearly incorrect
4. Questions should test understanding, not just memorization
5. Include a brief explanation for why the correct answer is right
6. Questions should be progressive in difficulty within the quiz
7. For coding questions, include the code snippet in the question text using proper formatting

SPECIAL INSTRUCTIONS FOR CODE QUESTIONS:
- If the question involves code, INCLUDE THE ACTUAL CODE SNIPPET in the question text
- Format code snippets using triple backticks with the appropriate language (e.g., ```python```)
- IMPORTANT: Keep code snippets on ONE LINE to ensure valid JSON format
- Example format: "What is the output of the following Python code snippet? ```python x = 5; y = 10; print(x + y) ```"
- Use semicolons to separate statements instead of newlines
- The code snippet MUST be included in the question text, not referenced separately

OUTPUT FORMAT:
Return a JSON array with this exact structure. CRITICAL: Ensure all strings are valid JSON strings - no unescaped newlines or quotes inside strings.
[
  {{
    "question": "Question text here? Include code snippets if applicable using proper markdown formatting on single lines.",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "Brief explanation of why this answer is correct and what it demonstrates about understanding."
  }},
  ...
]

Return ONLY the JSON array, no additional text or formatting."""

    @staticmethod
    def explanation_prompt(
        step_title: str,
        step_description: str,
        question: str = None
    ) -> str:
        """Generate an explanation prompt for roadmap steps"""
        base_prompt = f"""You are a patient, expert tutor explaining a learning concept.

STEP: {step_title}
DESCRIPTION: {step_description}

TASK: Provide a clear, comprehensive explanation that helps the learner understand this step.

REQUIREMENTS:
1. Start with a brief overview of what this step covers
2. Break down complex concepts into digestible parts
3. Use analogies or examples when helpful
4. Explain why this step is important in the learning journey
5. Provide actionable guidance on how to approach this step
6. Keep the explanation concise but thorough (3-5 sentences)

"""
        
        if question:
            base_prompt += f"\nSPECIFIC QUESTION: {question}\n\nPlease address this specific question in your explanation."
        
        base_prompt += "\nOUTPUT: Provide only the explanation text, no formatting or labels."
        
        return base_prompt

