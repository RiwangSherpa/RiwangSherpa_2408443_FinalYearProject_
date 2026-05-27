"""
Abstract AI provider interface.

Providers hide model server details from application services so roadmap,
quiz, tutor, and future multimodal flows can share one stable contract.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class AIProviderError(Exception):
    """Raised when an AI provider cannot complete a request."""


@dataclass(slots=True)
class AICompletion:
    """Normalized completion metadata for truncation handling and telemetry."""

    content: str
    finish_reason: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    reasoning_content: str | None = None
    raw_preview: str | None = None


class AIProvider(ABC):
    """Base interface for all AI providers."""

    name: str
    model: str

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Generate text from a single prompt."""

    @abstractmethod
    async def generate_chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Generate text from native chat messages."""

    @abstractmethod
    async def health_check(self) -> bool:
        """Return whether the configured provider server is reachable."""

    async def analyze_image(
        self,
        image_path: bytes | Path | str,
        prompt: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        """Placeholder for future vision-capable model support."""
        raise NotImplementedError("Image analysis is not implemented for this provider yet.")

    async def analyze_document(
        self,
        text: bytes | Path | str,
        prompt: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        """Placeholder for future PDF/document chat support."""
        raise NotImplementedError("Document analysis is not implemented for this provider yet.")

    async def generate_chat_result(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AICompletion:
        content = await self.generate_chat(messages, temperature=temperature, max_tokens=max_tokens)
        return AICompletion(content=content)

    async def generate_text_result(
        self,
        prompt: str,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AICompletion:
        content = await self.generate_text(prompt, temperature=temperature, max_tokens=max_tokens)
        return AICompletion(content=content)

    def _validate_chat_messages(self, messages: list[dict[str, Any]]) -> list[dict[str, str]]:
        """Normalize chat messages to the role/content shape used by model APIs."""
        normalized: list[dict[str, str]] = []
        for message in messages:
            role = str(message.get("role", "")).strip()
            content = str(message.get("content", "")).strip()
            if role and content:
                normalized.append({"role": role, "content": content})

        if not normalized:
            raise AIProviderError("At least one chat message is required.")

        return normalized
