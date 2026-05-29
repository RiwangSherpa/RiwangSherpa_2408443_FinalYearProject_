"""Application-level AI service.

This module keeps the public AI service methods used by routers stable while
delegating model-server details to provider implementations.
"""

import json
import re
from typing import Any

from app.config import settings
from app.services.prompts import PromptTemplates
from app.services.providers.base import AICompletion, AIProvider
from app.services.providers.provider_factory import get_ai_provider


class AIService:
    """High-level AI workflows for roadmaps, quizzes, explanations, and chat."""

    def __init__(self) -> None:
        self.prompts = PromptTemplates()

    def _provider(self, model: str | None = None) -> AIProvider:
        return get_ai_provider(model=model)

    def get_model_name(self, purpose: str = "default") -> str:
        """Return the configured model for a workflow purpose."""
        models = {
            "roadmap": settings.AI_ROADMAP_MODEL,
            "quiz": settings.AI_QUIZ_MODEL,
            "tutor": settings.AI_TUTOR_MODEL,
            "vision": settings.AI_VISION_MODEL,
            "default": settings.AI_MODEL,
        }
        if settings.AI_PROVIDER.lower().strip() == "ollama":
            return settings.OLLAMA_MODEL
        return models.get(purpose, settings.AI_MODEL)

    async def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        model: str | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Generate text through the configured provider."""
        return await self._provider(model=model).generate_text(
            prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def generate_chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        model: str | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Generate a native chat response through the configured provider."""
        return await self._provider(model=model).generate_chat(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def generate_chat_result(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        model: str | None = None,
        max_tokens: int | None = None,
    ) -> AICompletion:
        """Generate chat text with provider finish/usage metadata."""
        return await self._provider(model=model).generate_chat_result(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def generate_text_result(
        self,
        prompt: str,
        temperature: float = 0.2,
        model: str | None = None,
        max_tokens: int | None = None,
    ) -> AICompletion:
        """Generate prompt text with provider finish/usage metadata."""
        return await self._provider(model=model).generate_text_result(
            prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def analyze_image(
        self,
        image: bytes | str,
        prompt: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        """Placeholder for future multimodal image analysis."""
        return await self._provider(model=self.get_model_name("vision")).analyze_image(
            image,
            prompt=prompt,
            temperature=temperature,
        )

    async def analyze_document(
        self,
        document: bytes | str,
        prompt: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        """Placeholder for future PDF/document analysis."""
        return await self._provider().analyze_document(
            document,
            prompt=prompt,
            temperature=temperature,
        )

    async def generate_roadmap(
        self,
        goal_title: str,
        goal_description: str,
        learning_style: str,
        num_steps: int,
    ) -> dict[str, Any]:
        """Generate and validate a JSON study roadmap."""
        prompt = self.prompts.roadmap_prompt(
            goal_title=goal_title,
            goal_description=goal_description or "",
            learning_style=learning_style or "balanced",
            num_steps=num_steps,
        )

        text = await self.generate_text(
            prompt,
            temperature=0.2,
            model=self.get_model_name("roadmap"),
        )
        parsed = self._load_json_response(text)
        steps = self._validate_roadmap_payload(parsed, num_steps)

        return {
            "steps": steps,
            "confidence_score": 0.9 if len(steps) == num_steps else 0.75,
        }

    async def generate_quiz(
        self,
        goal_title: str,
        topic: str,
        num_questions: int,
        difficulty: str = "medium",
    ) -> dict[str, Any]:
        """Generate and validate JSON quiz questions."""
        prompt = self.prompts.quiz_prompt(
            goal_title=goal_title,
            topic=topic,
            num_questions=num_questions,
            difficulty=difficulty,
        )

        text = await self.generate_text(
            prompt,
            temperature=0.3,
            model=self.get_model_name("quiz"),
        )
        parsed = self._load_json_response(text)
        questions = self._validate_quiz_payload(parsed, num_questions)

        return {
            "questions": questions,
            "confidence_score": 0.9 if len(questions) == num_questions else 0.75,
        }

    async def explain_step(
        self,
        step_title: str,
        step_description: str,
        question: str | None = None,
    ) -> str:
        """Generate an explanation for a roadmap step."""
        prompt = self.prompts.explanation_prompt(
            step_title=step_title,
            step_description=step_description,
            question=question,
        )
        return await self.generate_text(
            prompt,
            temperature=0.4,
            model=self.get_model_name("tutor"),
        )

    def _load_json_response(self, text: str) -> Any:
        """Parse model output after removing common markdown and JSON defects."""
        cleaned = self._clean_json_text(text)
        attempts = [
            cleaned,
            self._extract_json_candidate(cleaned),
            self._repair_json_text(self._extract_json_candidate(cleaned)),
        ]

        errors: list[str] = []
        for candidate in attempts:
            if not candidate:
                continue
            try:
                return json.loads(candidate)
            except json.JSONDecodeError as exc:
                errors.append(str(exc))

        raise ValueError(f"AI response was not valid JSON. Parse errors: {errors[:2]}")

    def _clean_json_text(self, text: str) -> str:
        """Remove markdown fences and extra prose around model JSON output."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        return cleaned

    def _extract_json_candidate(self, text: str) -> str:
        """Extract the first balanced JSON object or array from text."""
        start = next((i for i, ch in enumerate(text) if ch in "[{"), -1)
        if start == -1:
            return text

        opening = text[start]
        closing = "]" if opening == "[" else "}"
        depth = 0
        in_string = False
        escape = False

        for index in range(start, len(text)):
            char = text[index]
            if in_string:
                if escape:
                    escape = False
                elif char == "\\":
                    escape = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
            elif char == opening:
                depth += 1
            elif char == closing:
                depth -= 1
                if depth == 0:
                    return text[start : index + 1]

        return text[start:]

    def _repair_json_text(self, text: str) -> str:
        """Apply conservative JSON repairs for common LLM formatting mistakes."""
        repaired = text.strip()
        repaired = re.sub(r",\s*([}\]])", r"\1", repaired)
        repaired = repaired.replace("\u201c", '"').replace("\u201d", '"')
        repaired = repaired.replace("\u2018", "'").replace("\u2019", "'")
        return repaired

    def _validate_roadmap_payload(self, data: Any, num_steps: int) -> list[dict[str, Any]]:
        """Validate roadmap JSON while preserving the existing response shape."""
        if isinstance(data, dict):
            raw_steps = data.get("steps")
        else:
            raw_steps = None

        if not isinstance(raw_steps, list):
            raise ValueError("Roadmap response must be an object with a steps list.")

        steps: list[dict[str, Any]] = []
        for index, item in enumerate(raw_steps[:num_steps], start=1):
            if not isinstance(item, dict):
                continue

            title = str(item.get("title", "")).strip()
            description = str(item.get("description", "")).strip()
            if not title or not description:
                continue

            try:
                step_number = int(item.get("step_number", index))
            except (TypeError, ValueError):
                step_number = index

            try:
                estimated_hours = float(item.get("estimated_hours", 2.0))
            except (TypeError, ValueError):
                estimated_hours = 2.0

            steps.append(
                {
                    "step_number": step_number,
                    "title": title[:120],
                    "description": description,
                    "estimated_hours": max(0.0, estimated_hours),
                    "ai_explanation": str(item.get("ai_explanation") or description),
                }
            )

        if not steps:
            raise ValueError("Roadmap response did not contain any valid steps.")

        return steps

    def _validate_quiz_payload(self, data: Any, num_questions: int) -> list[dict[str, Any]]:
        """Validate quiz JSON while preserving the existing response shape."""
        if isinstance(data, dict) and isinstance(data.get("questions"), list):
            raw_questions = data["questions"]
        elif isinstance(data, list):
            raw_questions = data
        else:
            raise ValueError("Quiz response must be a question list.")

        questions: list[dict[str, Any]] = []
        for item in raw_questions:
            if len(questions) >= num_questions:
                break
            if not isinstance(item, dict):
                continue

            question = str(item.get("question", "")).strip()
            question, code_snippet = self._normalize_quiz_code(question, item)
            raw_options = item.get("options")
            if not question or not isinstance(raw_options, list):
                continue

            if self._question_requires_code(question) and not code_snippet:
                continue

            options = [str(option).strip() for option in raw_options if str(option).strip()][:4]
            if len(options) != 4:
                continue

            try:
                correct_answer = int(item.get("correct_answer", 0))
            except (TypeError, ValueError):
                correct_answer = 0

            if correct_answer < 0 or correct_answer >= len(options):
                continue

            questions.append(
                {
                    "question": question,
                    "code_snippet": code_snippet,
                    "options": options,
                    "correct_answer": correct_answer,
                    "explanation": str(item.get("explanation", "")).strip(),
                }
            )

        if not questions:
            raise ValueError("Quiz response did not contain any valid questions.")

        return questions

    def _normalize_quiz_code(self, question: str, item: dict[str, Any]) -> tuple[str, str | None]:
        """Support separate code fields and markdown fences without showing duplicate code."""
        code_value = item.get("code_snippet") or item.get("codeBlock") or item.get("code")
        code_snippet = str(code_value).strip() if code_value is not None else ""

        fence_match = re.search(r"```(?:[a-zA-Z0-9_+-]+)?\s*(.*?)```", question, flags=re.DOTALL)
        if fence_match:
            if not code_snippet:
                code_snippet = fence_match.group(1).strip()
            question = re.sub(r"```(?:[a-zA-Z0-9_+-]+)?\s*.*?```", "", question, flags=re.DOTALL).strip()

        if code_snippet and code_snippet.lower() in {"none", "null", "n/a", "[code here]", "code here"}:
            code_snippet = ""

        return question, code_snippet or None

    def _question_requires_code(self, question: str) -> bool:
        lowered = question.lower()
        code_references = [
            "following code",
            "code snippet",
            "program below",
            "following program",
            "given code",
            "output of this code",
            "output of the code",
        ]
        return any(reference in lowered for reference in code_references)


ai_service = AIService()
