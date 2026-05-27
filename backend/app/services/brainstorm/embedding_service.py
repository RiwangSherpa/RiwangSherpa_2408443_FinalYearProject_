"""Future embedding hooks for Brainstorm RAG workflows."""

from app import models


class EmbeddingService:
    """Placeholder boundary for vector embedding generation."""

    async def embed_chunks(self, chunks: list[models.BrainstormChunk]) -> None:
        """Generate and persist embeddings for chunks when a vector store is added."""
        return None
