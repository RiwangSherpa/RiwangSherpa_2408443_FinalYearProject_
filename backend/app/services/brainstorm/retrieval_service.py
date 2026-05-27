"""Lightweight retrieval for Brainstorm RAG workflows."""

from collections import Counter
import math
import re

from app import models


class RetrievalService:
    """Keyword retrieval boundary that can later be swapped for vector search."""

    STOPWORDS = {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
        "i", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
        "was", "what", "when", "where", "which", "with", "you", "your",
        "summary", "summarize", "notes", "explain", "study",
    }

    async def retrieve_relevant_chunks(
        self,
        query: str,
        files: list[models.BrainstormFile],
        limit: int = 5,
    ) -> list[models.BrainstormChunk]:
        """Return top chunks using lexical relevance and source ordering."""
        chunks = [
            chunk
            for file in files
            if file.upload_status == "ready"
            for chunk in file.chunks
        ]
        if not chunks:
            return []

        query_terms = self._terms(query)
        if not query_terms:
            return chunks[:limit]

        document_terms = [self._terms(chunk.chunk_text) for chunk in chunks]
        doc_count = len(document_terms)
        document_frequency: Counter[str] = Counter()
        for terms in document_terms:
            document_frequency.update(set(terms))

        scored: list[tuple[float, int, models.BrainstormChunk]] = []
        for index, (chunk, terms) in enumerate(zip(chunks, document_terms)):
            term_counts = Counter(terms)
            score = 0.0
            for term in query_terms:
                if term not in term_counts:
                    continue
                idf = math.log((doc_count + 1) / (document_frequency[term] + 1)) + 1.0
                score += (1.0 + math.log(term_counts[term])) * idf

            title = (chunk.file.original_filename if chunk.file else "").lower()
            if any(term in title for term in query_terms):
                score += 1.5

            # Keep source order stable as a tie breaker.
            scored.append((score, -index, chunk))

        relevant = [chunk for score, _, chunk in sorted(scored, reverse=True) if score > 0]
        return (relevant or chunks)[:limit]

    def _terms(self, text: str) -> list[str]:
        terms = re.findall(r"[a-zA-Z][a-zA-Z0-9_-]{2,}", text.lower())
        return [term for term in terms if term not in self.STOPWORDS]
