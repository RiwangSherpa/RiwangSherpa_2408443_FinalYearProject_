"""Central orchestrator for the multimodal Brainstorm workspace."""

from datetime import datetime
from pathlib import Path
import asyncio
import logging
import re
import time

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.services.ai_service import ai_service
from app.services.brainstorm.chunking_service import ChunkingService
from app.services.brainstorm.file_service import FileService, FileStorageError
from app.services.brainstorm.image_service import ImageService
from app.services.brainstorm.pdf_service import PDFProcessingError, PDFService
from app.services.brainstorm.retrieval_service import RetrievalService


logger = logging.getLogger(__name__)


class BrainstormServiceError(Exception):
    """Service error with an HTTP-compatible status code for routers."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        partial_content: str | None = None,
        debug_context: dict[str, str | int | None] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.partial_content = partial_content
        self.debug_context = debug_context or {}


class BrainstormService:
    """Owns sessions, uploads, processing, chat, and study artifact generation."""

    IMAGE_TYPES = {"png", "jpg", "jpeg", "webp"}
    RESPONSE_PROFILES = {
        "short": {
            "max_tokens": 800,
            "reserved_output_tokens": 1000,
            "retrieval_limit": 3,
            "instruction": (
                "SHORT MODE: produce a fast scan. Use 3-5 bullets or one tiny section. "
                "Prioritize only the key ideas, direct answer, and next step. Avoid examples unless essential. "
                "Target roughly 20-30% of a normal answer."
            ),
        },
        "balanced": {
            "max_tokens": 2200,
            "reserved_output_tokens": 2600,
            "retrieval_limit": 5,
            "instruction": (
                "BALANCED MODE: produce the default high-quality study response. Use clear headings and bullets, "
                "include key concepts, concise explanations, relationships, and actionable takeaways. "
                "Keep paragraphs short, prefer bullets over dense prose, and use formulas only when they truly clarify the idea. "
                "Be informative without becoming an essay."
            ),
        },
        "detailed": {
            "max_tokens": 4200,
            "reserved_output_tokens": 5000,
            "retrieval_limit": 7,
            "instruction": (
                "DETAILED MODE: produce deeper study material. Use expanded sections, definitions, examples, "
                "relationships between ideas, caveats, and a short review checklist when useful. "
                "Keep the writing digestible with short subsections and do not overload the response with equations or repetitive theory. "
                "Aim for about 2-3x the coverage of balanced mode while staying organized and non-repetitive."
            ),
        },
    }

    def __init__(self, db: Session) -> None:
        self.db = db
        self.file_service = FileService()
        self.pdf_service = PDFService()
        self.image_service = ImageService()
        self.chunking_service = ChunkingService()
        self.retrieval_service = RetrievalService()

    def create_session(self, user_id: int, title: str | None = None) -> models.BrainstormSession:
        session = models.BrainstormSession(
            user_id=user_id,
            title=self._normalize_session_title(title),
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def update_session_title(
        self,
        session_id: int,
        user_id: int,
        title: str,
    ) -> models.BrainstormSession:
        session = self._require_session(session_id, user_id)
        session.title = self._normalize_session_title(title)
        session.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(session)
        return session

    def delete_session(self, session_id: int, user_id: int) -> None:
        session = self._require_session(session_id, user_id)
        for file in list(session.files):
            self.file_service.delete_file_safely(file.storage_path)
        self.db.delete(session)
        self.db.commit()

    def get_user_sessions(self, user_id: int) -> list[models.BrainstormSession]:
        return (
            self.db.query(models.BrainstormSession)
            .filter(models.BrainstormSession.user_id == user_id)
            .order_by(models.BrainstormSession.updated_at.desc())
            .all()
        )

    def get_session(self, session_id: int, user_id: int) -> models.BrainstormSession | None:
        return (
            self.db.query(models.BrainstormSession)
            .filter(
                models.BrainstormSession.id == session_id,
                models.BrainstormSession.user_id == user_id,
            )
            .first()
        )

    def get_session_files(self, session_id: int, user_id: int) -> list[models.BrainstormFile]:
        self._require_session(session_id, user_id)
        return (
            self.db.query(models.BrainstormFile)
            .filter(
                models.BrainstormFile.session_id == session_id,
                models.BrainstormFile.user_id == user_id,
            )
            .order_by(models.BrainstormFile.created_at.desc())
            .all()
        )

    def get_file(self, file_id: int, user_id: int) -> models.BrainstormFile:
        file = (
            self.db.query(models.BrainstormFile)
            .filter(models.BrainstormFile.id == file_id, models.BrainstormFile.user_id == user_id)
            .first()
        )
        if not file:
            raise BrainstormServiceError("File not found", status_code=404)
        return file

    async def upload_files(
        self,
        user_id: int,
        session_id: int,
        uploads,
        image_only: bool = False,
    ) -> list[models.BrainstormFile]:
        self._require_session(session_id, user_id)
        if not uploads:
            raise BrainstormServiceError("At least one file is required.")

        saved_files: list[models.BrainstormFile] = []
        for upload in uploads:
            try:
                stored = await self.file_service.save_upload(upload, image_only=image_only)
            except FileStorageError as exc:
                raise BrainstormServiceError(str(exc), status_code=400) from exc

            file_record = models.BrainstormFile(
                session_id=session_id,
                user_id=user_id,
                original_filename=stored.original_filename,
                stored_filename=stored.stored_filename,
                file_type=stored.file_type,
                mime_type=stored.mime_type,
                file_size=stored.file_size,
                storage_path=stored.storage_path,
                upload_status="processing",
            )
            self.db.add(file_record)
            self._touch_session(session_id)
            self.db.commit()
            self.db.refresh(file_record)

            try:
                await self._process_file(file_record)
            except Exception as exc:
                file_record.upload_status = "failed"
                file_record.extracted_text = f"Processing failed: {exc}"
                self.db.commit()
                self.db.refresh(file_record)

            saved_files.append(file_record)

        return saved_files

    async def chat(
        self,
        user_id: int,
        session_id: int,
        message: str,
        file_ids: list[int] | None = None,
        response_length: str = "balanced",
    ) -> tuple[models.BrainstormMessage, models.BrainstormMessage]:
        session = self._require_session(session_id, user_id)
        user_message = self._store_message(session.id, "user", message)
        files = self._select_context_files(session.id, user_id, file_ids)
        ai_content = await self._generate_contextual_response(
            session=session,
            user_prompt=message,
            files=files,
            exclude_message_id=user_message.id,
            response_length=response_length,
        )
        assistant_message = self._store_message(session.id, "assistant", ai_content)
        return user_message, assistant_message

    async def summarize(
        self,
        user_id: int,
        session_id: int,
        style: str = "concise",
        file_id: int | None = None,
        file_ids: list[int] | None = None,
        response_length: str = "balanced",
    ) -> models.BrainstormMessage:
        session = self._require_session(session_id, user_id)
        prompt = self._summary_prompt(style)
        files = self._select_context_files(session.id, user_id, file_ids or ([file_id] if file_id else None))
        self._store_message(session.id, "user", prompt)
        content = await self._generate_from_files(prompt, files, response_length=response_length)
        return self._store_message(session.id, "assistant", content)

    async def generate_artifact(
        self,
        user_id: int,
        session_id: int,
        artifact_type: str,
        file_id: int | None = None,
        file_ids: list[int] | None = None,
        prompt: str | None = None,
        topic: str | None = None,
        difficulty: str = "medium",
        num_questions: int = 5,
        response_length: str = "balanced",
    ) -> models.BrainstormMessage:
        session = self._require_session(session_id, user_id)
        files = self._select_context_files(session.id, user_id, file_ids or ([file_id] if file_id else None))
        artifact_prompt = self._artifact_prompt(
            artifact_type=artifact_type,
            prompt=prompt,
            topic=topic,
            difficulty=difficulty,
            num_questions=num_questions,
        )
        user_message = self._store_message(session.id, "user", artifact_prompt)
        content = ""
        try:
            content = await self._generate_contextual_response(
                session=session,
                user_prompt=artifact_prompt,
                files=files,
                exclude_message_id=user_message.id,
                response_length=response_length,
            )
            return self._store_message(session.id, "assistant", content)
        except BrainstormServiceError:
            raise
        except Exception as exc:
            logger.exception(
                "brainstorm.generate_artifact.failed stage=post_generation artifact_type=%s",
                artifact_type,
            )
            if content.strip():
                raise BrainstormServiceError(
                    "The model generated content, but the backend could not finalize it cleanly.",
                    status_code=500,
                    partial_content=self._sanitize_message_content(content),
                    debug_context={"artifact_type": artifact_type},
                ) from exc
            raise

    def delete_file(self, file_id: int, user_id: int) -> None:
        file = self.get_file(file_id, user_id)
        self.file_service.delete_file_safely(file.storage_path)
        session_id = file.session_id
        self.db.delete(file)
        self._touch_session(session_id)
        self.db.commit()

    def serialize_file(self, file: models.BrainstormFile) -> dict:
        extracted = file.extracted_text or ""
        return {
            "id": file.id,
            "session_id": file.session_id,
            "user_id": file.user_id,
            "original_filename": file.original_filename,
            "stored_filename": file.stored_filename,
            "file_type": file.file_type,
            "mime_type": file.mime_type,
            "file_size": file.file_size,
            "upload_status": file.upload_status,
            "created_at": file.created_at,
            "extracted_text_preview": extracted[:240] if extracted else None,
            "chunk_count": len(file.chunks),
        }

    def serialize_session(self, session: models.BrainstormSession, include_detail: bool = False) -> dict:
        payload = {
            "id": session.id,
            "user_id": session.user_id,
            "title": session.title,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": len(session.messages),
            "file_count": len(session.files),
        }
        if include_detail:
            payload["messages"] = session.messages
            payload["files"] = [self.serialize_file(file) for file in session.files]
        return payload

    async def _process_file(self, file: models.BrainstormFile) -> None:
        file_path = Path(file.storage_path)
        chunks = []

        if file.file_type in self.IMAGE_TYPES:
            metadata = await self.image_service.inspect_image(file_path)
            file.extracted_text = (
                f"Image metadata: {metadata.width}x{metadata.height}, "
                f"format {metadata.format}, mode {metadata.mode}. OCR is not enabled yet."
            )
        elif file.file_type == "pdf":
            try:
                result = await self.pdf_service.extract_text(file_path)
            except PDFProcessingError as exc:
                raise BrainstormServiceError(str(exc), status_code=400) from exc
            file.extracted_text = result.full_text
            chunks = self.chunking_service.chunk_pages(result.pages)
        else:
            text = await self.file_service.extract_plain_document_text(file_path, file.file_type)
            file.extracted_text = text
            chunks = self.chunking_service.chunk_text(text)

        self.db.query(models.BrainstormChunk).filter(
            models.BrainstormChunk.file_id == file.id
        ).delete(synchronize_session=False)

        for chunk in chunks:
            self.db.add(
                models.BrainstormChunk(
                    file_id=file.id,
                    chunk_index=chunk.chunk_index,
                    chunk_text=chunk.chunk_text,
                    chunk_summary=self._extractive_chunk_summary(chunk.chunk_text),
                    page_number=chunk.page_number,
                )
            )

        file.upload_status = "ready"
        self._touch_session(file.session_id)
        self.db.commit()
        self.db.refresh(file)

    async def _generate_contextual_response(
        self,
        session: models.BrainstormSession,
        user_prompt: str,
        files: list[models.BrainstormFile],
        exclude_message_id: int | None = None,
        response_length: str = "balanced",
    ) -> str:
        profile = self._response_profile(response_length)
        started_at = time.perf_counter()
        budget = self._context_budget(profile)
        retrieved_chunks = await self.retrieval_service.retrieve_relevant_chunks(
            query=user_prompt,
            files=files,
            limit=int(profile["retrieval_limit"]),
        )
        text_context = self._build_chunk_context(retrieved_chunks, token_budget=budget["chunk_tokens"])
        image_observations = await self._build_image_observations(files, user_prompt)
        messages = self._build_ai_messages(
            session_id=session.id,
            user_prompt=user_prompt,
            text_context=text_context,
            image_observations=image_observations,
            exclude_message_id=exclude_message_id,
            response_instruction=profile["instruction"],
            history_token_budget=budget["history_tokens"],
        )
        self._log_context_plan(
            operation="chat",
            response_length=response_length,
            files=files,
            chunks=retrieved_chunks,
            budget=budget,
            messages=messages,
        )
        content = await self._complete_with_continuation(
            messages=messages,
            max_tokens=int(profile["max_tokens"]),
            temperature=0.3,
            operation="chat",
        )
        logger.info(
            "brainstorm.chat.completed duration_ms=%s output_tokens_est=%s",
            round((time.perf_counter() - started_at) * 1000),
            self._estimate_tokens(content),
        )
        return content

    async def _complete_with_continuation(
        self,
        messages: list[dict[str, str]],
        max_tokens: int,
        temperature: float,
        operation: str,
        max_continuations: int = 1,
    ) -> str:
        """Generate and continue once if provider/heuristics indicate truncation."""
        completion = await asyncio.wait_for(
            ai_service.generate_chat_result(
                messages,
                temperature=temperature,
                model=ai_service.get_model_name("tutor"),
                max_tokens=max_tokens,
            ),
            timeout=settings.AI_TIMEOUT_SECONDS,
        )
        content = completion.content
        logger.info(
            "brainstorm.%s.generation finish_reason=%s prompt_tokens=%s completion_tokens=%s max_tokens=%s",
            operation,
            completion.finish_reason,
            completion.prompt_tokens,
            completion.completion_tokens,
            max_tokens,
        )

        continuation_count = 0
        while continuation_count < max_continuations and self._looks_truncated(content, completion.finish_reason):
            continuation_count += 1
            logger.warning(
                "brainstorm.%s.truncation_detected continuation=%s finish_reason=%s output_tokens_est=%s",
                operation,
                continuation_count,
                completion.finish_reason,
                self._estimate_tokens(content),
            )
            continuation_messages = [
                *messages,
                {"role": "assistant", "content": content},
                {
                    "role": "user",
                    "content": (
                        "Continue exactly from where the previous response ended. "
                        "Do not restart, recap, or repeat completed sections. Finish cleanly."
                    ),
                },
            ]
            completion = await asyncio.wait_for(
                ai_service.generate_chat_result(
                    continuation_messages,
                    temperature=temperature,
                    model=ai_service.get_model_name("tutor"),
                    max_tokens=max(700, min(1600, max_tokens // 2)),
                ),
                timeout=settings.AI_TIMEOUT_SECONDS,
            )
            content = self._append_continuation(content, completion.content)

        return content

    async def _generate_from_files(
        self,
        prompt: str,
        files: list[models.BrainstormFile],
        response_length: str = "balanced",
    ) -> str:
        if not files:
            raise BrainstormServiceError("Upload or select a file before generating this.", status_code=400)

        profile = self._response_profile(response_length)
        started_at = time.perf_counter()
        text_context = await self._build_map_reduce_context(
            prompt=prompt,
            files=files,
            response_length=response_length,
        )
        image_observations = await self._build_image_observations(files, prompt)
        combined_context = "\n\n".join(part for part in [text_context, image_observations] if part).strip()

        if not combined_context:
            raise BrainstormServiceError("No readable content is available for the selected file(s).", status_code=400)

        budget = self._context_budget(profile)
        messages = [
            {
                "role": "system",
                "content": (
                    "You are Study Buddy Brainstorm. Generate complete, structured study output from condensed context. "
                    "Use the provided summaries and selected evidence only. Avoid filler and avoid repeating instructions. "
                    f"{profile['instruction']}"
                ),
            },
            {"role": "system", "content": f"Condensed source context:\n\n{combined_context}"},
            {"role": "user", "content": prompt},
        ]
        self._log_context_plan(
            operation="artifact",
            response_length=response_length,
            files=files,
            chunks=[],
            budget=budget,
            messages=messages,
        )
        content = await self._complete_with_continuation(
            messages=messages,
            max_tokens=int(profile["max_tokens"]),
            temperature=0.25,
            operation="artifact",
            max_continuations=2 if response_length == "detailed" else 1,
        )
        logger.info(
            "brainstorm.artifact.completed duration_ms=%s output_tokens_est=%s",
            round((time.perf_counter() - started_at) * 1000),
            self._estimate_tokens(content),
        )
        return content

    async def _build_image_observations(self, files: list[models.BrainstormFile], prompt: str) -> str:
        image_files = [file for file in files if file.file_type in self.IMAGE_TYPES and file.upload_status == "ready"]
        observations: list[str] = []

        for file in image_files[:4]:
            image_path = await self.image_service.prepare_for_vision(file.storage_path)
            image_prompt = f"""Analyze the uploaded image "{file.original_filename}" for a study workspace.

Student request:
{prompt}

Focus on visible text, diagrams, charts, code, handwriting, UI state, and anything that helps answer the student's request.
Return concise markdown observations."""
            analysis = await ai_service.analyze_image(
                str(image_path),
                prompt=image_prompt,
                temperature=0.35,
            )
            observations.append(f"### Image: {file.original_filename}\n{analysis}")

        return "\n\n".join(observations).strip()

    def _build_ai_messages(
        self,
        session_id: int,
        user_prompt: str,
        text_context: str,
        image_observations: str,
        exclude_message_id: int | None = None,
        response_instruction: str = "",
        history_token_budget: int = 900,
    ) -> list[dict[str, str]]:
        messages = [
            {
                "role": "system",
                "content": (
                "You are Study Buddy Brainstorm, a focused AI workspace for ideation and contextual learning. "
                "Help students explore ideas, break down concepts, make study plans, and turn context into notes. "
                "Use clear markdown, meaningful headings, and high-signal bullets. "
                "Prefer readable study-note formatting over textbook prose. Keep paragraphs compact. "
                "Use math notation only when necessary, and briefly explain symbols in plain language. "
                "Do not generate quizzes or full roadmaps here. "
                "Cite filenames and page numbers when context includes them. "
                "When evidence is missing, say what is uncertain and suggest the next useful step. "
                f"{response_instruction}"
            ),
            }
        ]

        if text_context:
            messages.append({"role": "system", "content": f"Uploaded document context:\n\n{text_context}"})
        if image_observations:
            messages.append({"role": "system", "content": f"Vision observations:\n\n{image_observations}"})

        history_query = (
            self.db.query(models.BrainstormMessage)
            .filter(models.BrainstormMessage.session_id == session_id)
        )
        if exclude_message_id:
            history_query = history_query.filter(models.BrainstormMessage.id != exclude_message_id)
        recent_history = (
            history_query.order_by(desc(models.BrainstormMessage.created_at))
            .limit(8)
            .all()
        )
        recent_ids = [message.id for message in recent_history]
        older_query = history_query
        if recent_ids:
            older_query = older_query.filter(~models.BrainstormMessage.id.in_(recent_ids))
        older_history = (
            older_query.order_by(desc(models.BrainstormMessage.created_at))
            .limit(8)
            .all()
        )
        memory = self._compress_history_memory(list(reversed(older_history)))
        memory_tokens = self._estimate_tokens(memory)
        if memory and memory_tokens < max(180, history_token_budget // 3):
            messages.append({"role": "system", "content": f"Compact conversation memory:\n{memory}"})

        history_tokens = 0
        for message in reversed(recent_history):
            estimated = self._estimate_tokens(message.content)
            if history_tokens + estimated > history_token_budget:
                continue
            history_tokens += estimated
            messages.append({"role": message.role, "content": message.content})

        messages.append({"role": "user", "content": user_prompt})
        return messages

    async def _build_map_reduce_context(
        self,
        prompt: str,
        files: list[models.BrainstormFile],
        response_length: str,
    ) -> str:
        """Build condensed source context for summary/notes without raw stuffing."""
        chunks = [
            chunk
            for file in files
            if file.upload_status == "ready" and file.file_type not in self.IMAGE_TYPES
            for chunk in file.chunks
        ]
        if not chunks:
            return self._build_text_context(files, budget=4500)

        profile = self._response_profile(response_length)
        budget = self._context_budget(profile)
        chunk_summaries = []
        summaries_added = False
        for chunk in chunks:
            if not chunk.chunk_summary:
                chunk.chunk_summary = self._extractive_chunk_summary(chunk.chunk_text)
                summaries_added = True
            block = self._chunk_summary_block(chunk)
            if block:
                chunk_summaries.append(block)
        if summaries_added:
            self.db.commit()
        summary_context = self._fit_blocks_to_token_budget(chunk_summaries, budget["chunk_tokens"])

        # For small files, add a few full chunks as evidence. For larger files, map-reduce summaries carry coverage.
        retrieved = await self.retrieval_service.retrieve_relevant_chunks(
            query=prompt,
            files=files,
            limit=min(5, int(profile["retrieval_limit"])),
        )
        evidence_context = self._build_chunk_context(
            retrieved,
            token_budget=max(900, budget["chunk_tokens"] // 3),
            prefer_summary=False,
        )

        if len(chunks) <= 8:
            return "\n\n".join(part for part in [evidence_context, summary_context] if part).strip()

        reduced = await self._reduce_chunk_summaries(
            prompt=prompt,
            summary_context=summary_context,
            response_length=response_length,
        )
        return "\n\n".join(part for part in [reduced, evidence_context] if part).strip()

    async def _reduce_chunk_summaries(
        self,
        prompt: str,
        summary_context: str,
        response_length: str,
    ) -> str:
        """Reduce many chunk summaries into a compact source briefing."""
        if not summary_context:
            return ""

        profile = self._response_profile(response_length)
        reduce_tokens = 900 if response_length == "short" else 1400 if response_length == "balanced" else 2200
        messages = [
            {
                "role": "system",
                "content": (
                    "Condense source chunk summaries into a compact briefing for a later final answer. "
                    "Preserve key concepts, definitions, relationships, and source/page hints. "
                    "Do not write the final answer yet."
                ),
            },
            {"role": "system", "content": f"Chunk summaries:\n\n{summary_context}"},
            {"role": "user", "content": f"Prepare source briefing for this task: {prompt}\n{profile['instruction']}"},
        ]
        logger.info(
            "brainstorm.map_reduce.reduce summaries_tokens_est=%s max_tokens=%s",
            self._estimate_tokens(summary_context),
            reduce_tokens,
        )
        return await self._complete_with_continuation(
            messages=messages,
            max_tokens=reduce_tokens,
            temperature=0.2,
            operation="map_reduce",
            max_continuations=0,
        )

    def _build_chunk_context(
        self,
        chunks: list[models.BrainstormChunk],
        token_budget: int,
        prefer_summary: bool = False,
    ) -> str:
        blocks: list[str] = []
        used_tokens = 0
        for chunk in chunks:
            file_name = chunk.file.original_filename if chunk.file else "uploaded file"
            page = f", page {chunk.page_number}" if chunk.page_number else ""
            body = chunk.chunk_summary if prefer_summary and chunk.chunk_summary else chunk.chunk_text
            block = f"### {file_name}{page}, chunk {chunk.chunk_index + 1}\n{body}"
            block_tokens = self._estimate_tokens(block)
            if used_tokens + block_tokens > token_budget:
                continue
            used_tokens += block_tokens
            blocks.append(block)
        return "\n\n".join(blocks).strip()

    def _chunk_summary_block(self, chunk: models.BrainstormChunk) -> str:
        summary = chunk.chunk_summary or self._extractive_chunk_summary(chunk.chunk_text)
        if not summary:
            return ""
        file_name = chunk.file.original_filename if chunk.file else "uploaded file"
        page = f", page {chunk.page_number}" if chunk.page_number else ""
        return f"### {file_name}{page}, chunk {chunk.chunk_index + 1}\n{summary}"

    def _fit_blocks_to_token_budget(self, blocks: list[str], token_budget: int) -> str:
        fitted: list[str] = []
        used_tokens = 0
        for block in blocks:
            block_tokens = self._estimate_tokens(block)
            if used_tokens + block_tokens > token_budget:
                break
            fitted.append(block)
            used_tokens += block_tokens
        return "\n\n".join(fitted).strip()

    def _compress_history_memory(self, messages: list[models.BrainstormMessage]) -> str:
        """Deterministically compress older turns into a tiny memory note."""
        if not messages:
            return ""
        bullets: list[str] = []
        for message in messages:
            content = " ".join(message.content.split())
            if not content:
                continue
            first_sentence = re.split(r"(?<=[.!?])\s+", content)[0][:180].strip()
            if first_sentence:
                bullets.append(f"- {message.role}: {first_sentence}")
            if len(bullets) >= 5:
                break
        return "\n".join(bullets)

    def _build_text_context(self, files: list[models.BrainstormFile], budget: int | None = None) -> str:
        budget = budget or settings.BRAINSTORM_MAX_CONTEXT_CHARS
        sections: list[str] = []
        current_size = 0

        for file in files:
            if file.file_type in self.IMAGE_TYPES or file.upload_status != "ready":
                continue

            if file.chunks:
                selected_chunks = list(file.chunks[:12])
                if len(file.chunks) > 12:
                    selected_chunks.extend(file.chunks[-3:])
                seen_chunk_ids: set[int] = set()
                for chunk in selected_chunks:
                    if chunk.id in seen_chunk_ids:
                        continue
                    seen_chunk_ids.add(chunk.id)
                    page = f", page {chunk.page_number}" if chunk.page_number else ""
                    piece = f"### {file.original_filename}{page}, chunk {chunk.chunk_index + 1}\n{chunk.chunk_text}"
                    if current_size + len(piece) > budget:
                        return "\n\n".join(sections).strip()
                    sections.append(piece)
                    current_size += len(piece) + 2
            elif file.extracted_text:
                piece = f"### {file.original_filename}\n{file.extracted_text}"
                if len(piece) > budget:
                    piece = piece[:budget] + "\n\n[Context truncated]"
                sections.append(piece)

        return "\n\n".join(sections).strip()

    def _normalize_session_title(self, title: str | None) -> str:
        normalized = " ".join((title or "Brainstorm Session").strip().split())
        if not normalized:
            raise BrainstormServiceError("Session title cannot be empty.", status_code=422)
        return normalized[:80]

    def _response_profile(self, response_length: str) -> dict[str, int | str]:
        return self.RESPONSE_PROFILES.get(response_length, self.RESPONSE_PROFILES["balanced"])

    def _context_budget(self, profile: dict[str, int | str]) -> dict[str, int]:
        context_window = settings.BRAINSTORM_MODEL_CONTEXT_TOKENS
        reserved_output = int(profile["reserved_output_tokens"])
        fixed_prompt = 900
        usable_input = max(1800, context_window - reserved_output - fixed_prompt)
        history_tokens = min(900, max(250, usable_input // 5))
        chunk_tokens = max(1000, usable_input - history_tokens)
        return {
            "context_window": context_window,
            "reserved_output_tokens": reserved_output,
            "fixed_prompt_tokens": fixed_prompt,
            "usable_input_tokens": usable_input,
            "history_tokens": history_tokens,
            "chunk_tokens": chunk_tokens,
        }

    def _estimate_tokens(self, text: str) -> int:
        if not text:
            return 0
        # Conservative estimate for local OpenAI-compatible servers without tokenizer access.
        return max(1, int(len(text.split()) * 1.35))

    def _sanitize_message_content(self, content: str) -> str:
        if content is None:
            return ""
        normalized = str(content).replace("\x00", "").replace("\r\n", "\n").strip()
        return normalized.encode("utf-8", errors="replace").decode("utf-8")

    def _looks_truncated(self, content: str, finish_reason: str | None = None) -> bool:
        if finish_reason in {"length", "max_tokens"}:
            return True
        stripped = content.rstrip()
        if not stripped:
            return False
        if stripped.endswith(("...", "…")):
            return True
        if stripped[-1] not in ".!?)`]}'\"":
            tail = stripped[-120:].lower()
            if not any(marker in tail for marker in ("end", "summary", "checklist", "takeaway", "next step")):
                return True
        open_fences = stripped.count("```")
        return open_fences % 2 == 1

    def _append_continuation(self, content: str, continuation: str) -> str:
        if not continuation:
            return content
        continuation = re.sub(r"^(continue|continuation)[:\-\s]+", "", continuation.strip(), flags=re.IGNORECASE)
        if content.endswith("-") or content.endswith("/"):
            return content + continuation
        return f"{content.rstrip()}\n{continuation}"

    def _extractive_chunk_summary(self, text: str, max_words: int = 90) -> str:
        cleaned = " ".join(text.split())
        if not cleaned:
            return ""
        sentences = re.split(r"(?<=[.!?])\s+", cleaned)
        summary_parts: list[str] = []
        word_count = 0
        for sentence in sentences:
            words = sentence.split()
            if not words:
                continue
            if word_count + len(words) > max_words and summary_parts:
                break
            summary_parts.append(sentence)
            word_count += len(words)
        summary = " ".join(summary_parts).strip()
        return summary or " ".join(cleaned.split()[:max_words])

    def _log_context_plan(
        self,
        operation: str,
        response_length: str,
        files: list[models.BrainstormFile],
        chunks: list[models.BrainstormChunk],
        budget: dict[str, int],
        messages: list[dict[str, str]],
    ) -> None:
        message_tokens = sum(self._estimate_tokens(message.get("content", "")) for message in messages)
        logger.info(
            "brainstorm.%s.context_plan mode=%s files=%s total_file_chunks=%s retrieved_chunks=%s input_tokens_est=%s budget=%s",
            operation,
            response_length,
            len(files),
            sum(len(file.chunks) for file in files),
            [
                {
                    "file_id": chunk.file_id,
                    "chunk_index": chunk.chunk_index,
                    "page": chunk.page_number,
                    "tokens_est": self._estimate_tokens(chunk.chunk_text),
                }
                for chunk in chunks
            ],
            message_tokens,
            budget,
        )

    def _select_context_files(
        self,
        session_id: int,
        user_id: int,
        file_ids: list[int] | None = None,
    ) -> list[models.BrainstormFile]:
        query = self.db.query(models.BrainstormFile).filter(
            models.BrainstormFile.session_id == session_id,
            models.BrainstormFile.user_id == user_id,
        )
        if file_ids:
            query = query.filter(models.BrainstormFile.id.in_(file_ids))
        files = query.order_by(models.BrainstormFile.created_at.desc()).all()
        if file_ids and len(files) != len(set(file_ids)):
            raise BrainstormServiceError("One or more selected files were not found.", status_code=404)
        return files

    def _store_message(self, session_id: int, role: str, content: str) -> models.BrainstormMessage:
        safe_content = self._sanitize_message_content(content)
        if not safe_content:
            raise BrainstormServiceError("Generated content was empty after normalization.", status_code=502)
        message = models.BrainstormMessage(session_id=session_id, role=role, content=safe_content)
        self.db.add(message)
        self._touch_session(session_id)
        try:
            self.db.commit()
            self.db.refresh(message)
        except Exception as exc:
            self.db.rollback()
            logger.exception(
                "brainstorm.store_message.failed role=%s session_id=%s content_len=%s",
                role,
                session_id,
                len(safe_content),
            )
            raise BrainstormServiceError(
                "The model generated content, but storing the response failed.",
                status_code=500,
                partial_content=safe_content,
                debug_context={"role": role, "session_id": session_id},
            ) from exc
        return message

    def _require_session(self, session_id: int, user_id: int) -> models.BrainstormSession:
        session = self.get_session(session_id, user_id)
        if not session:
            raise BrainstormServiceError("Brainstorm session not found.", status_code=404)
        return session

    def _touch_session(self, session_id: int) -> None:
        session = self.db.query(models.BrainstormSession).filter(models.BrainstormSession.id == session_id).first()
        if session:
            session.updated_at = datetime.utcnow()

    def _summary_prompt(self, style: str) -> str:
        styles = {
            "concise": (
                "Create a compact markdown summary of the selected upload(s). Include the core thesis, "
                "3-5 key ideas, and the most useful study takeaway."
            ),
            "detailed": (
                "Create a strong structured markdown summary of the selected upload(s). Include: "
                "1) a concise overview, 2) key concepts, 3) important insights/details, "
                "4) relationships between ideas, 5) why this matters for studying, and 6) open questions or next steps."
            ),
            "bullets": (
                "Create a bullet-point markdown summary with key ideas, definitions, important facts, "
                "relationships, and useful review prompts."
            ),
            "study_notes": (
                "Turn the selected upload(s) into focused study notes with headings, key terms, definitions, "
                "examples, topic relationships, concise explanations, and review prompts."
            ),
        }
        return styles.get(style, styles["concise"])

    def _artifact_prompt(
        self,
        artifact_type: str,
        prompt: str | None,
        topic: str | None,
        difficulty: str,
        num_questions: int,
    ) -> str:
        if artifact_type == "notes":
            return f"""Generate polished markdown study notes from the selected Brainstorm context.

Topic focus: {topic or "the uploaded material"}

Include:
- A brief orientation summary
- Key concepts and definitions
- Important details and concise explanations
- Relationships between topics
- Examples or applications where the source supports them
- Common confusions or watch-outs
- A compact revision checklist

Formatting guidance:
- Keep sections scannable and student-friendly
- Prefer bullets and short paragraphs over long textbook blocks
- Use formulas only when they add real value
- When using math, pair it with a plain-language explanation

{prompt or ""}""".strip()

        return prompt or "Brainstorm helpful study ideas from the selected context."
