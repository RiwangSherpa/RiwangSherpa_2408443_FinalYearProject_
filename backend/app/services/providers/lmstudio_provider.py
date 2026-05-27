"""LM Studio OpenAI-compatible AI provider."""

import base64
import logging
import mimetypes
from pathlib import Path
import json
from typing import Any

import httpx

from app.config import settings
from app.services.providers.base import AICompletion, AIProvider, AIProviderError


logger = logging.getLogger(__name__)


class LMStudioProvider(AIProvider):
    """Provider for LM Studio's OpenAI-compatible local server."""

    name = "lmstudio"

    def __init__(
        self,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: int | None = None,
    ) -> None:
        self.model = model or settings.AI_MODEL
        self.base_url = (base_url or settings.AI_BASE_URL or settings.LM_STUDIO_BASE_URL).rstrip("/")
        self.timeout_seconds = timeout_seconds or settings.AI_TIMEOUT_SECONDS

    async def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Generate text by wrapping a single prompt in a user chat message."""
        return await self.generate_chat(
            [{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def generate_chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Call LM Studio's OpenAI-compatible chat completions endpoint."""
        normalized_messages = self._validate_chat_messages(messages)
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": normalized_messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        return (await self._post_chat_completion_result(payload)).content

    async def generate_chat_result(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AICompletion:
        """Call LM Studio and return finish/usage metadata when available."""
        normalized_messages = self._validate_chat_messages(messages)
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": normalized_messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        return await self._post_chat_completion_result(payload)

    async def analyze_image(
        self,
        image_path: bytes | Path | str,
        prompt: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        """Analyze an image using OpenAI-compatible multimodal chat messages."""
        image_url = self._image_to_data_url(image_path)
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                            or "Analyze this image for a student. Describe visible text, concepts, diagrams, and useful study insights.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url},
                        },
                    ],
                }
            ],
            "temperature": temperature,
        }
        return (await self._post_chat_completion_result(payload)).content

    async def analyze_document(
        self,
        text: bytes | Path | str,
        prompt: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        """Analyze extracted document text through the configured chat model."""
        document_text = self._coerce_document_text(text)
        if not document_text.strip():
            raise AIProviderError("Document text is empty.")

        bounded_text = document_text[: settings.BRAINSTORM_MAX_CONTEXT_CHARS]
        if len(document_text) > len(bounded_text):
            bounded_text += "\n\n[Document truncated to fit the model context.]"

        analysis_prompt = f"""{prompt or "Analyze this document for a student."}

Document text:
{bounded_text}"""
        return await self.generate_text(analysis_prompt, temperature=temperature)

    async def _post_chat_completion(self, payload: dict[str, Any]) -> str:
        """Post to LM Studio and extract the assistant message content."""
        return (await self._post_chat_completion_result(payload)).content

    async def _post_chat_completion_result(self, payload: dict[str, Any]) -> AICompletion:
        """Post to LM Studio and extract assistant content plus metadata."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(f"{self.base_url}/chat/completions", json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as exc:
            raise AIProviderError(f"LM Studio request timed out after {self.timeout_seconds}s") from exc
        except httpx.ConnectError as exc:
            raise AIProviderError(f"Could not connect to LM Studio at {self.base_url}") from exc
        except httpx.HTTPStatusError as exc:
            raise AIProviderError(
                f"LM Studio returned HTTP {exc.response.status_code}: {exc.response.text}"
            ) from exc
        except httpx.HTTPError as exc:
            raise AIProviderError(f"LM Studio request failed: {exc}") from exc
        except ValueError as exc:
            raise AIProviderError("LM Studio returned a non-JSON response") from exc

        self._log_response_debug(data)
        usage = data.get("usage") if isinstance(data, dict) else {}
        choice = self._get_primary_choice(data)
        finish_reason = self._safe_get(choice, "finish_reason")
        message = self._extract_message(choice, data)
        reasoning_content = self._extract_reasoning_content(choice, message, data)
        content = self._extract_content(choice, message, data)

        if not content.strip():
            if reasoning_content.strip():
                logger.warning("lmstudio.empty_content_fallback reasoning_only_response=True")
                content = reasoning_content
            else:
                raise AIProviderError("LM Studio returned an empty assistant response")

        return AICompletion(
            content=self._normalize_text(content),
            finish_reason=str(finish_reason) if finish_reason else None,
            prompt_tokens=usage.get("prompt_tokens") if isinstance(usage, dict) else None,
            completion_tokens=usage.get("completion_tokens") if isinstance(usage, dict) else None,
            total_tokens=usage.get("total_tokens") if isinstance(usage, dict) else None,
            reasoning_content=self._normalize_text(reasoning_content) if reasoning_content else None,
            raw_preview=self._truncate_preview(data),
        )

    def _log_response_debug(self, data: Any) -> None:
        preview = self._truncate_preview(data)
        top_level_keys = list(data.keys())[:20] if isinstance(data, dict) else []
        choice = self._get_primary_choice(data)
        choice_keys = list(choice.keys())[:20] if isinstance(choice, dict) else []
        message = self._extract_message(choice, data)
        message_keys = list(message.keys())[:20] if isinstance(message, dict) else []
        usage = data.get("usage") if isinstance(data, dict) else None
        logger.info(
            "lmstudio.response schema_keys=%s choice_keys=%s message_keys=%s usage=%s preview=%s",
            top_level_keys,
            choice_keys,
            message_keys,
            usage,
            preview,
        )

    def _get_primary_choice(self, data: Any) -> dict[str, Any]:
        if isinstance(data, dict):
            choices = data.get("choices")
            if isinstance(choices, list) and choices:
                return choices[0] if isinstance(choices[0], dict) else {}
        return {}

    def _extract_message(self, choice: dict[str, Any], data: Any) -> dict[str, Any]:
        message = choice.get("message") if isinstance(choice, dict) else None
        if isinstance(message, dict):
            return message
        if isinstance(message, str):
            return {"content": message}
        if isinstance(data, dict) and isinstance(data.get("message"), dict):
            return data["message"]
        return {}

    def _extract_content(self, choice: dict[str, Any], message: dict[str, Any], data: Any) -> str:
        candidates = [
            message.get("content"),
            choice.get("text"),
            data.get("content") if isinstance(data, dict) else None,
            data.get("response") if isinstance(data, dict) else None,
        ]
        for candidate in candidates:
            text = self._coerce_content(candidate)
            if text.strip():
                return text
        return ""

    def _extract_reasoning_content(self, choice: dict[str, Any], message: dict[str, Any], data: Any) -> str:
        candidates = [
            message.get("reasoning_content"),
            choice.get("reasoning_content"),
            data.get("reasoning_content") if isinstance(data, dict) else None,
        ]
        for candidate in candidates:
            text = self._coerce_content(candidate)
            if text.strip():
                return text
        return ""

    def _coerce_content(self, value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        if isinstance(value, list):
            parts: list[str] = []
            for item in value:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict):
                    text_candidate = item.get("text") or item.get("content") or item.get("reasoning_content")
                    if isinstance(text_candidate, str):
                        parts.append(text_candidate)
            return "\n".join(part for part in parts if part)
        if isinstance(value, dict):
            for key in ("text", "content", "value"):
                nested = value.get(key)
                if isinstance(nested, str):
                    return nested
            return ""
        return str(value)

    def _truncate_preview(self, data: Any, max_chars: int = 1200) -> str:
        try:
            rendered = json.dumps(data, ensure_ascii=False, default=str)
        except TypeError:
            rendered = str(data)
        if len(rendered) > max_chars:
            return f"{rendered[:max_chars]}...[truncated]"
        return rendered

    def _safe_get(self, value: Any, key: str) -> Any:
        return value.get(key) if isinstance(value, dict) else None

    def _normalize_text(self, value: str) -> str:
        normalized = value.replace("\x00", "").replace("\r\n", "\n").strip()
        return normalized.encode("utf-8", errors="replace").decode("utf-8")

    def _image_to_data_url(self, image_path: bytes | Path | str) -> str:
        if isinstance(image_path, bytes):
            raw_bytes = image_path
            mime_type = "image/png"
        else:
            path = Path(image_path)
            if not path.exists() or not path.is_file():
                raise AIProviderError(f"Image file was not found: {path}")
            try:
                raw_bytes = path.read_bytes()
            except OSError as exc:
                raise AIProviderError(f"Image file could not be read: {path}") from exc
            mime_type = mimetypes.guess_type(path.name)[0] or "image/png"

        encoded = base64.b64encode(raw_bytes).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    def _coerce_document_text(self, text: bytes | Path | str) -> str:
        if isinstance(text, bytes):
            return text.decode("utf-8", errors="replace")
        if isinstance(text, Path):
            return text.read_text(encoding="utf-8", errors="replace")
        if "\n" not in text and len(text) < 512:
            try:
                possible_path = Path(text)
                if possible_path.exists() and possible_path.is_file():
                    return possible_path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                pass
        return str(text)

    async def health_check(self) -> bool:
        """Check whether LM Studio's OpenAI-compatible server is available."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/models")
                return response.status_code == 200
        except httpx.HTTPError:
            return False
