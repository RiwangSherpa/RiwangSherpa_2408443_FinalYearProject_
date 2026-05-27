"""Factory for selecting the configured AI provider."""

from app.config import settings
from app.services.providers.base import AIProvider
from app.services.providers.lmstudio_provider import LMStudioProvider
from app.services.providers.ollama_provider import OllamaProvider


def get_ai_provider(model: str | None = None) -> AIProvider:
    """Return the provider configured by settings.AI_PROVIDER."""
    provider_name = settings.AI_PROVIDER.lower().strip()

    if provider_name == "lmstudio":
        return LMStudioProvider(model=model or settings.AI_MODEL)

    if provider_name == "ollama":
        return OllamaProvider(model=model or settings.OLLAMA_MODEL)

    raise ValueError(f"Unsupported AI_PROVIDER: {settings.AI_PROVIDER}")
