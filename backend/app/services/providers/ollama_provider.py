"""Ollama AI provider."""

from typing import Any
from pathlib import Path

import httpx

from app.config import settings
from app.services.providers.base import AICompletion, AIProvider, AIProviderError


class OllamaProvider(AIProvider):
    """Provider for Ollama's local generate/chat API."""

    name = "ollama"

    def __init__(
        self,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: int | None = None,
    ) -> None:
        self.model = model or settings.OLLAMA_MODEL
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.timeout_seconds = timeout_seconds or settings.AI_TIMEOUT_SECONDS

    async def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Call Ollama's /api/generate endpoint."""
        options: dict[str, Any] = {"temperature": temperature}
        if max_tokens:
            options["num_predict"] = max_tokens
        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": options,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as exc:
            raise AIProviderError(f"Ollama request timed out after {self.timeout_seconds}s") from exc
        except httpx.ConnectError as exc:
            raise AIProviderError(f"Could not connect to Ollama at {self.base_url}") from exc
        except httpx.HTTPStatusError as exc:
            raise AIProviderError(
                f"Ollama returned HTTP {exc.response.status_code}: {exc.response.text}"
            ) from exc
        except httpx.HTTPError as exc:
            raise AIProviderError(f"Ollama request failed: {exc}") from exc
        except ValueError as exc:
            raise AIProviderError("Ollama returned a non-JSON response") from exc

        content = data.get("response")
        if not isinstance(content, str) or not content.strip():
            raise AIProviderError("Ollama returned an empty response")

        return content.strip()

    async def generate_chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Call Ollama's /api/chat endpoint when native chat is available."""
        return (
            await self.generate_chat_result(
                messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        ).content

    async def generate_chat_result(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AICompletion:
        """Call Ollama chat and return completion metadata."""
        normalized_messages = self._validate_chat_messages(messages)
        options: dict[str, Any] = {"temperature": temperature}
        if max_tokens:
            options["num_predict"] = max_tokens
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": normalized_messages,
            "stream": False,
            "options": options,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as exc:
            raise AIProviderError(f"Ollama chat request timed out after {self.timeout_seconds}s") from exc
        except httpx.ConnectError as exc:
            raise AIProviderError(f"Could not connect to Ollama at {self.base_url}") from exc
        except httpx.HTTPStatusError as exc:
            raise AIProviderError(
                f"Ollama chat returned HTTP {exc.response.status_code}: {exc.response.text}"
            ) from exc
        except httpx.HTTPError as exc:
            raise AIProviderError(f"Ollama chat request failed: {exc}") from exc
        except ValueError as exc:
            raise AIProviderError("Ollama chat returned a non-JSON response") from exc

        message = data.get("message")
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str) or not content.strip():
            raise AIProviderError("Ollama chat returned an empty response")

        return AICompletion(
            content=content.strip(),
            finish_reason=data.get("done_reason") if isinstance(data.get("done_reason"), str) else None,
            prompt_tokens=data.get("prompt_eval_count"),
            completion_tokens=data.get("eval_count"),
            total_tokens=(
                data.get("prompt_eval_count") + data.get("eval_count")
                if isinstance(data.get("prompt_eval_count"), int) and isinstance(data.get("eval_count"), int)
                else None
            ),
        )

    async def analyze_document(
        self,
        text: bytes | Path | str,
        prompt: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        """Analyze extracted document text with Ollama text generation."""
        if isinstance(text, bytes):
            document_text = text.decode("utf-8", errors="replace")
        elif isinstance(text, Path):
            document_text = text.read_text(encoding="utf-8", errors="replace")
        else:
            document_text = str(text)

        if not document_text.strip():
            raise AIProviderError("Document text is empty.")

        bounded_text = document_text[: settings.BRAINSTORM_MAX_CONTEXT_CHARS]
        if len(document_text) > len(bounded_text):
            bounded_text += "\n\n[Document truncated to fit the model context.]"

        return await self.generate_text(
            f"{prompt or 'Analyze this document for a student.'}\n\nDocument text:\n{bounded_text}",
            temperature=temperature,
        )

    async def health_check(self) -> bool:
        """Check whether Ollama is available."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except httpx.HTTPError:
            return False
