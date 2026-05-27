"""PDF extraction service for Brainstorm uploads."""

from dataclasses import dataclass
import asyncio
from pathlib import Path
from typing import Any

import fitz

from app.config import settings


class PDFProcessingError(Exception):
    """Raised when a PDF cannot be parsed safely."""


@dataclass(slots=True)
class PDFExtractResult:
    full_text: str
    pages: list[dict[str, str | int]]
    metadata: dict[str, Any]


class PDFService:
    """Extract text and metadata from PDFs with bounded page processing."""

    async def extract_text(self, pdf_path: str | Path) -> PDFExtractResult:
        return await asyncio.to_thread(self._extract_text_sync, Path(pdf_path))

    def _extract_text_sync(self, pdf_path: Path) -> PDFExtractResult:
        if not pdf_path.exists():
            raise PDFProcessingError("PDF file does not exist.")

        try:
            with fitz.open(pdf_path) as document:
                metadata = dict(document.metadata or {})
                metadata["page_count"] = document.page_count
                metadata["processed_pages"] = min(document.page_count, settings.BRAINSTORM_MAX_PDF_PAGES)

                pages: list[dict[str, str | int]] = []
                for index in range(metadata["processed_pages"]):
                    page = document.load_page(index)
                    text = page.get_text("text").strip()
                    pages.append({"page_number": index + 1, "text": text})

        except Exception as exc:
            raise PDFProcessingError("PDF could not be opened or parsed.") from exc

        full_text = "\n\n".join(
            f"[Page {page['page_number']}]\n{page['text']}"
            for page in pages
            if str(page.get("text") or "").strip()
        ).strip()

        return PDFExtractResult(full_text=full_text, pages=pages, metadata=metadata)
