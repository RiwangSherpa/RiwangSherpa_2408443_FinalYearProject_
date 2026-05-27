"""Text chunking utilities for Brainstorm documents."""

from dataclasses import dataclass
import re

from app.config import settings


@dataclass(slots=True)
class TextChunk:
    chunk_index: int
    chunk_text: str
    page_number: int | None = None


class ChunkingService:
    """Paragraph-aware chunker prepared for later embedding/retrieval work."""

    def __init__(
        self,
        chunk_tokens: int | None = None,
        overlap_tokens: int | None = None,
    ) -> None:
        self.chunk_tokens = chunk_tokens or settings.BRAINSTORM_CHUNK_TOKENS
        self.overlap_tokens = overlap_tokens or settings.BRAINSTORM_CHUNK_OVERLAP_TOKENS

    def chunk_pages(self, pages: list[dict[str, str | int | None]]) -> list[TextChunk]:
        """Chunk page text while preserving paragraph boundaries and page hints."""
        chunks: list[TextChunk] = []
        current_parts: list[str] = []
        current_pages: list[int] = []
        current_tokens = 0

        for page in pages:
            page_number = page.get("page_number")
            text = str(page.get("text") or "")
            paragraphs = self._split_paragraphs(text)

            for paragraph in paragraphs:
                paragraph_tokens = self._count_tokens(paragraph)
                if paragraph_tokens > self.chunk_tokens:
                    chunks.extend(
                        self._flush_chunk(current_parts, current_pages, len(chunks))
                    )
                    current_parts = []
                    current_pages = []
                    current_tokens = 0
                    chunks.extend(self._split_large_paragraph(paragraph, page_number, len(chunks)))
                    continue

                if current_parts and current_tokens + paragraph_tokens > self.chunk_tokens:
                    emitted = self._flush_chunk(current_parts, current_pages, len(chunks))
                    chunks.extend(emitted)
                    overlap = self._tail_words(emitted[-1].chunk_text) if emitted else ""
                    current_parts = [overlap] if overlap else []
                    current_pages = [current_pages[-1]] if current_pages else []
                    current_tokens = self._count_tokens(overlap)

                current_parts.append(paragraph)
                if isinstance(page_number, int):
                    current_pages.append(page_number)
                current_tokens += paragraph_tokens

        chunks.extend(self._flush_chunk(current_parts, current_pages, len(chunks)))
        return chunks

    def chunk_text(self, text: str) -> list[TextChunk]:
        """Chunk plain text that has no page model."""
        return self.chunk_pages([{"page_number": None, "text": text}])

    def _split_paragraphs(self, text: str) -> list[str]:
        normalized = text.replace("\r\n", "\n")
        paragraphs = [part.strip() for part in re.split(r"\n\s*\n+", normalized)]
        return [paragraph for paragraph in paragraphs if paragraph]

    def _split_large_paragraph(
        self,
        paragraph: str,
        page_number: int | str | None,
        start_index: int,
    ) -> list[TextChunk]:
        words = paragraph.split()
        chunks: list[TextChunk] = []
        step = max(self.chunk_tokens - self.overlap_tokens, 1)
        index = 0
        while index < len(words):
            piece = " ".join(words[index : index + self.chunk_tokens]).strip()
            if piece:
                chunks.append(
                    TextChunk(
                        chunk_index=start_index + len(chunks),
                        chunk_text=piece,
                        page_number=page_number if isinstance(page_number, int) else None,
                    )
                )
            index += step
        return chunks

    def _flush_chunk(
        self,
        parts: list[str],
        page_numbers: list[int],
        chunk_index: int,
    ) -> list[TextChunk]:
        text = "\n\n".join(part for part in parts if part).strip()
        if not text:
            return []
        unique_pages = sorted(set(page_numbers))
        page_number = unique_pages[0] if len(unique_pages) == 1 else None
        return [TextChunk(chunk_index=chunk_index, chunk_text=text, page_number=page_number)]

    def _tail_words(self, text: str) -> str:
        if self.overlap_tokens <= 0:
            return ""
        words = text.split()
        return " ".join(words[-self.overlap_tokens:])

    def _count_tokens(self, text: str) -> int:
        # Good enough for local context budgeting; future embeddings can replace this.
        return max(1, len(text.split()))
