import requests
import json
import re
from typing import Dict, List, Any

from app.services.prompts import PromptTemplates

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "dolphin3:8b"

class AIService:
    def __init__(self):
        self.prompts = PromptTemplates()
    
    async def _call_ollama(self, prompt: str, temperature: float = 0.2) -> str:
        """Make a request to Ollama API and return the full response"""
        try:
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": MODEL,
                    "prompt": prompt,
                    "stream": True,
                    "options": {"temperature": temperature}
                },
                timeout=120
            )
            response.raise_for_status()
            
            text = ""
            for line in response.iter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line.decode())
                    if "response" in data:
                        text += data["response"]
                    if data.get("done", False):
                        break
                except json.JSONDecodeError:
                    continue
            
            return text.strip()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to connect to Ollama: {str(e)}")
        except Exception as e:
            raise Exception(f"AI service error: {str(e)}")

    async def generate_roadmap(
        self,
        goal_title: str,
        goal_description: str,
        learning_style: str | None,
        num_steps: int
    ) -> Dict[str, Any]:
        """Generate a study roadmap using AI"""
        prompt = self.prompts.roadmap_prompt(
            goal_title=goal_title,
            goal_description=goal_description or "",
            learning_style=learning_style or "balanced",
            num_steps=num_steps
        )
        
        text = await self._call_ollama(prompt, temperature=0.2)
        
        # Parse the response
        steps = []
        # Match numbered steps: "1. Title - Description. Estimated: X hours"
        step_pattern = r'(\d+)\.\s+(.+?)(?=\d+\.|$)'
        matches = re.finditer(step_pattern, text, re.MULTILINE | re.DOTALL)
        
        for match in matches:
            step_number = int(match.group(1))
            content = match.group(2).strip()
            
            # Extract estimated hours if present
            hours_match = re.search(r'[Ee]stimated:\s*(\d+(?:\.\d+)?)', content)
            estimated_hours = float(hours_match.group(1)) if hours_match else 2.0
            
            # Remove estimated hours from description
            description = re.sub(r'\s*[Ee]stimated:\s*\d+(?:\.\d+)?\s*hours?\.?', '', content).strip()
            
            # Split title and description (first sentence or up to dash is title)
            if ' - ' in description:
                parts = description.split(' - ', 1)
                title = parts[0].strip()[:120]
                desc = parts[1].strip() if len(parts) > 1 else description
            else:
                # First sentence as title
                sentences = description.split('.')
                title = sentences[0].strip()[:120] if sentences else description[:120]
                desc = description
            
            if step_number <= num_steps:
                steps.append({
                    "step_number": step_number,
                    "title": title,
                    "description": desc,
                    "estimated_hours": estimated_hours,
                    "ai_explanation": desc
                })
        
        # Fallback parsing if regex didn't work
        if not steps:
            raw_steps = re.split(r'\n\s*\d+[\.\)]\s*', text)
            step_number = 1
            for s in raw_steps:
                s = s.strip()
                if not s or step_number > num_steps:
                    break
                
                # Extract hours if present
                hours_match = re.search(r'(\d+(?:\.\d+)?)\s*hours?', s, re.IGNORECASE)
                estimated_hours = float(hours_match.group(1)) if hours_match else 2.0
                
                # Clean description
                desc = re.sub(r'\s*[Ee]stimated?:\s*\d+(?:\.\d+)?\s*hours?\.?', '', s).strip()
                
                # Split title/description
                if ' - ' in desc:
                    parts = desc.split(' - ', 1)
                    title = parts[0].strip()[:120]
                    description = parts[1].strip()
                else:
                    sentences = desc.split('.')
                    title = sentences[0].strip()[:120] if sentences else desc[:120]
                    description = desc
                
                steps.append({
                    "step_number": step_number,
                    "title": title,
                    "description": description,
                    "estimated_hours": estimated_hours,
                    "ai_explanation": description
                })
                step_number += 1
        
        return {
            "steps": steps,
            "confidence_score": 0.85
        }

    async def generate_quiz(
        self,
        goal_title: str,
        topic: str,
        num_questions: int,
        difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """Generate quiz questions using AI"""
        prompt = self.prompts.quiz_prompt(
            goal_title=goal_title,
            topic=topic,
            num_questions=num_questions,
            difficulty=difficulty
        )
        
        text = await self._call_ollama(prompt, temperature=0.3)
        
        # Try to parse JSON response
        questions = []
        try:
            # Clean the response - remove outer markdown code blocks
            cleaned_text = text.strip()
            if cleaned_text.startswith('```'):
                # Remove only the outer JSON wrapper, not inner markdown
                cleaned_text = re.sub(r'```(?:json)?\s*', '', cleaned_text)
                cleaned_text = cleaned_text.rstrip('```').strip()
            
            # Try to parse JSON normally first
            questions_data = json.loads(cleaned_text)
            if isinstance(questions_data, list):
                for q in questions_data:
                    if isinstance(q, dict) and "question" in q and "options" in q:
                        questions.append({
                            "question": q["question"],
                            "options": q["options"][:4],
                            "correct_answer": int(q.get("correct_answer", 0)),
                            "explanation": q.get("explanation", "")
                        })
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            # Use custom parser for malformed JSON with code blocks
            questions = self._parse_quiz_with_code_blocks(text, num_questions)
        
        # Ensure we have the right number of questions
        if len(questions) < num_questions:
            # Generate additional questions if needed
            remaining = num_questions - len(questions)
            # For now, we'll just use what we have or pad with placeholders
            pass
        
        return {
            "questions": questions[:num_questions],
            "confidence_score": 0.85 if questions else 0.5
        }
    
    def _parse_quiz_fallback(self, text: str, num_questions: int) -> List[Dict[str, Any]]:
        """Fallback parser for quiz questions if JSON parsing fails"""
        questions = []
        # This is a simple fallback - in production, you'd want more robust parsing
        # For now, return empty list and let the frontend handle it
        return questions
    
    def _parse_quiz_with_code_blocks(self, text: str, num_questions: int) -> List[Dict[str, Any]]:
        """Custom parser for JSON that contains code blocks with unescaped characters"""
        questions = []
        
        try:
            # Remove outer markdown wrapper
            cleaned_text = text.strip()
            if cleaned_text.startswith('```'):
                cleaned_text = re.sub(r'```(?:json)?\s*', '', cleaned_text)
                cleaned_text = cleaned_text.rstrip('```').strip()
            
            # Find question objects manually
            question_pattern = r'\{\s*"question":\s*"(.*?)",\s*"options":\s*\[(.*?)\],\s*"correct_answer":\s*(\d+),\s*"explanation":\s*"(.*?)"(?:,\s*)?\}'
            
            matches = re.findall(question_pattern, cleaned_text, re.DOTALL)
            
            for match in matches:
                question_text, options_str, correct_answer, explanation = match
                
                # Parse options array
                options = []
                option_pattern = r'"([^"]*)"'
                option_matches = re.findall(option_pattern, options_str)
                options = option_matches[:4]  # Take first 4 options
                
                if len(options) >= 2:  # Need at least 2 options
                    questions.append({
                        "question": question_text.strip(),
                        "options": options,
                        "correct_answer": int(correct_answer),
                        "explanation": explanation.strip()
                    })
                
                if len(questions) >= num_questions:
                    break
                    
        except Exception as e:
            print(f"Custom parsing failed: {e}")
            
        return questions

    async def explain_step(
        self,
        step_title: str,
        step_description: str,
        question: str = None
    ) -> str:
        """Generate an explanation for a roadmap step"""
        prompt = self.prompts.explanation_prompt(
            step_title=step_title,
            step_description=step_description,
            question=question
        )
        
        text = await self._call_ollama(prompt, temperature=0.4)
        return text.strip()

ai_service = AIService()
