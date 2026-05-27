"""AI-generated mindmaps and flashcards shared by Brainstorm and Notes."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
import logging
import re
from typing import Any

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models
from app.services.ai_service import ai_service


logger = logging.getLogger(__name__)


class LearningArtifactError(Exception):
    """Domain error with an HTTP-friendly status code."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class LearningArtifactService:
    """Generates and persists visual learning graphs and active-recall cards."""

    SOURCE_TYPES = {"note", "brainstorm_session", "brainstorm_file", "manual"}

    def __init__(self, db: Session) -> None:
        self.db = db

    async def generate_mindmap(
        self,
        user_id: int,
        source_type: str,
        source_id: int | None = None,
        title: str | None = None,
        content: str | None = None,
    ) -> models.Mindmap:
        source = self._resolve_source(user_id, source_type, source_id, content)
        source["content"] = await self._append_image_observations(user_id, source_type, source_id, source["content"])
        prompt = self._mindmap_prompt(source["title"], source["content"])
        completion = await ai_service.generate_text_result(
            prompt,
            temperature=0.2,
            model=ai_service.get_model_name("tutor"),
            max_tokens=2200,
        )
        graph_data = self._parse_mindmap_payload(completion.content)
        graph = self._validate_graph(graph_data)
        mindmap = models.Mindmap(
            user_id=user_id,
            title=self._bounded_title(title or source["title"] or "Learning Mindmap"),
            source_type=source_type,
            source_id=source_id,
            graph_data=graph,
            summary=self._source_summary(source["content"]),
        )
        logger.info(
            "learning_artifact.mindmap.generated source_type=%s source_id=%s nodes=%s edges=%s finish_reason=%s prompt_tokens=%s completion_tokens=%s",
            source_type,
            source_id,
            len(graph["nodes"]),
            len(graph["edges"]),
            completion.finish_reason,
            completion.prompt_tokens,
            completion.completion_tokens,
        )
        self.db.add(mindmap)
        self.db.commit()
        self.db.refresh(mindmap)
        return mindmap

    async def generate_flashcards(
        self,
        user_id: int,
        source_type: str,
        source_id: int | None = None,
        title: str | None = None,
        content: str | None = None,
        count: int = 12,
    ) -> models.FlashcardDeck:
        source = self._resolve_source(user_id, source_type, source_id, content)
        prompt = self._flashcard_prompt(source["title"], source["content"], count)
        completion = await ai_service.generate_text_result(
            prompt,
            temperature=0.25,
            model=ai_service.get_model_name("tutor"),
            max_tokens=2600,
        )
        cards_data = self._parse_flashcard_payload(completion.content)
        cards = self._validate_cards(cards_data, count)
        deck = models.FlashcardDeck(
            user_id=user_id,
            title=self._bounded_title(title or f"{source['title']} Flashcards"),
            description=f"Generated from {source_type.replace('_', ' ')}.",
            source_type=source_type,
            source_id=source_id,
        )
        logger.info(
            "learning_artifact.flashcards.generated source_type=%s source_id=%s cards=%s finish_reason=%s prompt_tokens=%s completion_tokens=%s",
            source_type,
            source_id,
            len(cards),
            completion.finish_reason,
            completion.prompt_tokens,
            completion.completion_tokens,
        )
        self.db.add(deck)
        self.db.flush()

        for index, card in enumerate(cards):
            self.db.add(
                models.Flashcard(
                    deck_id=deck.id,
                    front=card["front"],
                    back=card["back"],
                    card_type=card["card_type"],
                    difficulty=card["difficulty"],
                    tags=card["tags"],
                    position=index,
                )
            )

        self.db.commit()
        self.db.refresh(deck)
        return deck

    def create_deck(self, user_id: int, title: str, description: str | None, cards: list[dict[str, Any]]) -> models.FlashcardDeck:
        deck = models.FlashcardDeck(user_id=user_id, title=self._bounded_title(title), description=description)
        self.db.add(deck)
        self.db.flush()
        for index, card in enumerate(cards):
            self.db.add(
                models.Flashcard(
                    deck_id=deck.id,
                    front=str(card["front"]).strip(),
                    back=str(card["back"]).strip(),
                    card_type=str(card.get("card_type", "concept")).strip()[:40] or "concept",
                    difficulty=str(card.get("difficulty", "medium")).strip()[:20] or "medium",
                    tags=card.get("tags", []),
                    position=index,
                )
            )
        self.db.commit()
        self.db.refresh(deck)
        return deck

    def list_mindmaps(self, user_id: int) -> list[models.Mindmap]:
        return (
            self.db.query(models.Mindmap)
            .filter(models.Mindmap.user_id == user_id)
            .order_by(models.Mindmap.updated_at.desc())
            .all()
        )

    def get_mindmap(self, user_id: int, mindmap_id: int) -> models.Mindmap:
        mindmap = (
            self.db.query(models.Mindmap)
            .filter(models.Mindmap.id == mindmap_id, models.Mindmap.user_id == user_id)
            .first()
        )
        if not mindmap:
            raise LearningArtifactError("Mindmap not found.", status_code=404)
        return mindmap

    def update_mindmap(
        self,
        user_id: int,
        mindmap_id: int,
        title: str | None = None,
        graph_data: dict[str, Any] | None = None,
    ) -> models.Mindmap:
        mindmap = self.get_mindmap(user_id, mindmap_id)
        changed = False

        if title is not None:
            normalized_title = self._bounded_title(title)
            if not normalized_title:
                raise LearningArtifactError("Mindmap title cannot be empty.", status_code=422)
            mindmap.title = normalized_title
            changed = True

        if graph_data is not None:
            mindmap.graph_data = self._validate_graph(graph_data)
            changed = True

        if changed:
            mindmap.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(mindmap)

        return mindmap

    def delete_mindmap(self, user_id: int, mindmap_id: int) -> None:
        self.db.delete(self.get_mindmap(user_id, mindmap_id))
        self.db.commit()

    def list_decks(self, user_id: int) -> list[models.FlashcardDeck]:
        return (
            self.db.query(models.FlashcardDeck)
            .filter(models.FlashcardDeck.user_id == user_id)
            .order_by(models.FlashcardDeck.updated_at.desc())
            .all()
        )

    def get_deck(self, user_id: int, deck_id: int) -> models.FlashcardDeck:
        deck = (
            self.db.query(models.FlashcardDeck)
            .filter(models.FlashcardDeck.id == deck_id, models.FlashcardDeck.user_id == user_id)
            .first()
        )
        if not deck:
            raise LearningArtifactError("Flashcard deck not found.", status_code=404)
        return deck

    def delete_deck(self, user_id: int, deck_id: int) -> None:
        self.db.delete(self.get_deck(user_id, deck_id))
        self.db.commit()

    def review_card(self, user_id: int, card_id: int, rating: str) -> models.Flashcard:
        card = (
            self.db.query(models.Flashcard)
            .join(models.FlashcardDeck)
            .filter(models.Flashcard.id == card_id, models.FlashcardDeck.user_id == user_id)
            .first()
        )
        if not card:
            raise LearningArtifactError("Flashcard not found.", status_code=404)

        now = datetime.utcnow()
        if rating == "known":
            card.review_state = "known"
            card.ease_factor = min(3.0, (card.ease_factor or 2.5) + 0.15)
            card.interval_days = max(1, card.interval_days * 2 or 2)
        elif rating == "difficult":
            card.review_state = "difficult"
            card.ease_factor = max(1.4, (card.ease_factor or 2.5) - 0.15)
            card.interval_days = 1
        else:
            card.review_state = "again"
            card.ease_factor = max(1.3, (card.ease_factor or 2.5) - 0.25)
            card.interval_days = 0
        card.last_reviewed_at = now
        card.due_at = now + timedelta(days=card.interval_days)
        card.deck.review_count = (card.deck.review_count or 0) + 1
        card.deck.updated_at = now
        self.db.commit()
        self.db.refresh(card)
        return card

    def serialize_deck(self, deck: models.FlashcardDeck, include_cards: bool = False) -> dict[str, Any]:
        payload = {
            "id": deck.id,
            "user_id": deck.user_id,
            "title": deck.title,
            "description": deck.description,
            "source_type": deck.source_type,
            "source_id": deck.source_id,
            "review_count": deck.review_count or 0,
            "created_at": deck.created_at,
            "updated_at": deck.updated_at,
            "card_count": len(deck.cards),
        }
        if include_cards:
            payload["cards"] = deck.cards
        return payload

    def _resolve_source(
        self,
        user_id: int,
        source_type: str,
        source_id: int | None,
        content: str | None,
    ) -> dict[str, str]:
        if source_type not in self.SOURCE_TYPES:
            raise LearningArtifactError("Unsupported source type.", status_code=400)

        if source_type == "manual":
            if not content or not content.strip():
                raise LearningArtifactError("Provide content for manual generation.", status_code=400)
            return {"title": "Custom Study Context", "content": self._bounded_context(content)}

        if not source_id:
            raise LearningArtifactError("A source_id is required for this source type.", status_code=400)

        if source_type == "note":
            note = (
                self.db.query(models.Note)
                .filter(models.Note.id == source_id, models.Note.user_id == user_id)
                .first()
            )
            if not note:
                raise LearningArtifactError("Note not found.", status_code=404)
            return {"title": note.title, "content": self._bounded_context(note.content)}

        if source_type == "brainstorm_session":
            session = (
                self.db.query(models.BrainstormSession)
                .filter(models.BrainstormSession.id == source_id, models.BrainstormSession.user_id == user_id)
                .first()
            )
            if not session:
                raise LearningArtifactError("Brainstorm session not found.", status_code=404)
            messages = (
                self.db.query(models.BrainstormMessage)
                .filter(models.BrainstormMessage.session_id == session.id)
                .order_by(desc(models.BrainstormMessage.created_at))
                .limit(10)
                .all()
            )
            files = (
                self.db.query(models.BrainstormFile)
                .filter(models.BrainstormFile.session_id == session.id, models.BrainstormFile.user_id == user_id)
                .all()
            )
            file_context = self._file_context(files)
            message_context = "\n\n".join(
                f"{message.role.title()}: {message.content[:1400]}" for message in reversed(messages)
            )
            return {"title": session.title, "content": self._bounded_context(f"{file_context}\n\n{message_context}")}

        file = (
            self.db.query(models.BrainstormFile)
            .filter(models.BrainstormFile.id == source_id, models.BrainstormFile.user_id == user_id)
            .first()
        )
        if not file:
            raise LearningArtifactError("Brainstorm file not found.", status_code=404)
        return {"title": file.original_filename, "content": self._bounded_context(self._file_context([file]))}

    def _file_context(self, files: list[models.BrainstormFile]) -> str:
        parts: list[str] = []
        for file in files[:6]:
            chunk_summaries = [
                chunk.chunk_summary or chunk.chunk_text[:700]
                for chunk in file.chunks[:8]
                if (chunk.chunk_summary or chunk.chunk_text)
            ]
            extracted = file.extracted_text or ""
            body = "\n".join(chunk_summaries) or extracted[:3000]
            if body:
                parts.append(f"Source file: {file.original_filename}\n{body}")
        return "\n\n".join(parts)

    async def _append_image_observations(
        self,
        user_id: int,
        source_type: str,
        source_id: int | None,
        content: str,
    ) -> str:
        if source_type not in {"brainstorm_session", "brainstorm_file"} or not source_id:
            return content

        query = self.db.query(models.BrainstormFile).filter(models.BrainstormFile.user_id == user_id)
        if source_type == "brainstorm_session":
            query = query.filter(models.BrainstormFile.session_id == source_id)
        else:
            query = query.filter(models.BrainstormFile.id == source_id)

        image_files = [
            file
            for file in query.all()
            if file.file_type in {"png", "jpg", "jpeg", "webp"} and file.upload_status == "ready"
        ]
        if not image_files:
            return content

        observations: list[str] = []
        for file in image_files[:4]:
            try:
                analysis = await ai_service.analyze_image(
                    file.storage_path,
                    prompt=(
                        f'Analyze the uploaded study image "{file.original_filename}" for a concept mindmap. '
                        "Identify visible topics, labels, diagram structure, equations, relationships, and key study concepts. "
                        "Return concise plain text observations."
                    ),
                    temperature=0.25,
                )
                if analysis.strip():
                    observations.append(f"Image source: {file.original_filename}\n{analysis.strip()}")
            except Exception as exc:
                logger.warning(
                    "learning_artifact.mindmap.image_analysis_failed file_id=%s error=%s",
                    file.id,
                    exc,
                )

        if not observations:
            return content
        return self._bounded_context(f"{content}\n\n" + "\n\n".join(observations))

    def _mindmap_prompt(self, title: str, content: str) -> str:
        return f"""Create a clean, readable concept map as strict JSON for an AI learning platform.

Return only this shape:
{{
  "nodes": [
    {{"id":"root","title":"Main topic","description":"short explanation","category":"core","level":0,"color":"#064E3B"}}
  ],
  "edges": [
    {{"source":"root","target":"node-1","label":"includes","relation":"contains"}}
  ]
}}

Rules:
- Use 8-15 nodes total. Do not exceed 15 nodes.
- Include exactly one root node with id "root", level 0, and the source's main topic as its title.
- Put direct branches at level 1 and supporting details at levels 2-3.
- Every non-root node must have a logical path from root through edges.
- Keep titles short: 2-6 words. Keep descriptions one useful sentence.
- Prefer meaningful concepts, processes, causes, examples, or comparisons over random fragments.
- Prefer stronger hierarchy over many tiny fragments.
- Merge redundant or near-duplicate ideas into one node.
- Use stable lowercase ids with hyphens, such as "working-memory" or "retrieval-practice".
- Edges should show hierarchy, prerequisites, or conceptual relationships.
- Edge labels should be brief verbs/phrases like "includes", "depends on", "leads to", "contrasts with".
- No markdown, no prose outside JSON.
- If the source is broad, choose the highest-signal study concepts rather than trying to cover every detail.

Source title: {title}

Condensed source:
{content}"""

    def _flashcard_prompt(self, title: str, content: str, count: int) -> str:
        return f"""Generate active-recall flashcards as strict JSON.

Return only this shape:
{{
  "cards": [
    {{"front":"Question or prompt","back":"Concise answer","card_type":"concept","difficulty":"medium","tags":["topic"]}}
  ]
}}

Rules:
- Generate {count} high-signal cards.
- Mix definitions, concepts, formulas, comparisons, and recall prompts when supported.
- Front should be answerable without seeing the back.
- Back should be concise but complete.
- Prefer plain-language explanations over heavy notation.
- Only include math symbols when they are essential.
- If you mention a formula, keep it compact and explain it in words.
- Avoid trivia and vague questions.
- No markdown outside JSON.

Source title: {title}

Condensed source:
{content}"""

    def _parse_flashcard_payload(self, text: str) -> dict[str, Any]:
        parsed = self._parse_json_like_payload(text, payload_type="flashcards")
        if isinstance(parsed, dict) and isinstance(parsed.get("cards"), list):
            return parsed

        recovered = self._recover_flashcards(text)
        if recovered:
            logger.warning(
                "learning_artifact.flashcards.recovered_heuristically cards=%s",
                len(recovered),
            )
            return {"cards": recovered}

        raise LearningArtifactError(
            "Flashcard generation completed, but the backend could not recover a usable deck from the model output.",
            status_code=502,
        )

    def _parse_mindmap_payload(self, text: str) -> dict[str, Any]:
        try:
            parsed = self._parse_json_like_payload(text, payload_type="mindmap")
            if isinstance(parsed, dict) and isinstance(parsed.get("nodes"), list):
                return parsed
        except LearningArtifactError:
            pass
        recovered = self._recover_mindmap(text)
        if recovered:
            logger.warning(
                "learning_artifact.mindmap.recovered_heuristically nodes=%s edges=%s",
                len(recovered["nodes"]),
                len(recovered["edges"]),
            )
            return recovered
        raise LearningArtifactError(
            "Mindmap generation completed, but the backend could not recover a usable concept graph from the model output.",
            status_code=502,
        )

    def _parse_json_like_payload(self, text: str, payload_type: str) -> Any:
        cleaned = self._clean_json_text(text)
        candidate = self._extract_json_candidate(cleaned)
        attempts = [
            cleaned,
            candidate,
            self._repair_json_text(candidate),
            self._escape_invalid_json_backslashes(self._repair_json_text(candidate)),
            self._normalize_multiline_strings(self._escape_invalid_json_backslashes(self._repair_json_text(candidate))),
        ]

        errors: list[str] = []
        for index, attempt in enumerate(attempts, start=1):
            if not attempt:
                continue
            try:
                parsed = json.loads(attempt)
                logger.info(
                    "learning_artifact.%s.parse_success attempt=%s length=%s",
                    payload_type,
                    index,
                    len(attempt),
                )
                return parsed
            except json.JSONDecodeError as exc:
                errors.append(str(exc))
                logger.warning(
                    "learning_artifact.%s.parse_failed attempt=%s error=%s preview=%s",
                    payload_type,
                    index,
                    exc,
                    self._preview(attempt),
                )

        logger.error(
            "learning_artifact.%s.parse_exhausted errors=%s raw_preview=%s",
            payload_type,
            errors[:4],
            self._preview(text),
        )
        raise LearningArtifactError(
            f"{payload_type.title()} generation succeeded, but response parsing failed after repair attempts.",
            status_code=502,
        )

    def _clean_json_text(self, text: str) -> str:
        cleaned = (text or "").strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        return cleaned

    def _extract_json_candidate(self, text: str) -> str:
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
        repaired = (text or "").strip()
        repaired = repaired.replace("\u201c", '"').replace("\u201d", '"')
        repaired = repaired.replace("\u2018", "'").replace("\u2019", "'")
        repaired = repaired.replace("\r\n", "\n")
        repaired = re.sub(r",\s*([}\]])", r"\1", repaired)
        return repaired

    def _escape_invalid_json_backslashes(self, text: str) -> str:
        valid_escapes = {'"', "\\", "/", "b", "f", "n", "r", "t", "u"}
        result: list[str] = []
        in_string = False
        escape = False

        for index, char in enumerate(text):
            if not in_string:
                result.append(char)
                if char == '"':
                    in_string = True
                continue

            if escape:
                if char not in valid_escapes:
                    result.append("\\")
                result.append(char)
                escape = False
                continue

            if char == "\\":
                result.append(char)
                escape = True
                continue

            if char == '"':
                in_string = False
            result.append(char)

        if escape:
            result.append("\\")
        return "".join(result)

    def _normalize_multiline_strings(self, text: str) -> str:
        result: list[str] = []
        in_string = False
        escape = False

        for char in text:
            if in_string:
                if escape:
                    result.append(char)
                    escape = False
                    continue
                if char == "\\":
                    result.append(char)
                    escape = True
                    continue
                if char == '"':
                    in_string = False
                    result.append(char)
                    continue
                if char == "\n":
                    result.append("\\n")
                    continue
                result.append(char)
                continue

            result.append(char)
            if char == '"':
                in_string = True

        return "".join(result)

    def _recover_flashcards(self, text: str) -> list[dict[str, Any]]:
        pair_pattern = re.compile(
            r'"front"\s*:\s*"(?P<front>(?:[^"\\]|\\.)*)"\s*,\s*"back"\s*:\s*"(?P<back>(?:[^"\\]|\\.)*)"(?:\s*,\s*"card_type"\s*:\s*"(?P<card_type>(?:[^"\\]|\\.)*)")?(?:\s*,\s*"difficulty"\s*:\s*"(?P<difficulty>(?:[^"\\]|\\.)*)")?',
            re.IGNORECASE | re.DOTALL,
        )
        cards: list[dict[str, Any]] = []
        for match in pair_pattern.finditer(text):
            front = self._unescape_relaxed_text(match.group("front"))
            back = self._unescape_relaxed_text(match.group("back"))
            if not front or not back:
                continue
            cards.append(
                {
                    "front": front,
                    "back": back,
                    "card_type": self._unescape_relaxed_text(match.group("card_type") or "concept"),
                    "difficulty": self._normalized_difficulty(match.group("difficulty") or "medium"),
                    "tags": [],
                }
            )
        if cards:
            return cards[:30]

        qa_pattern = re.compile(
            r"(?:^|\n)\s*(?:Q(?:uestion)?|Front)\s*[:\-]\s*(?P<front>.+?)\n\s*(?:A(?:nswer)?|Back)\s*[:\-]\s*(?P<back>.+?)(?=\n\s*(?:Q(?:uestion)?|Front)\s*[:\-]|\Z)",
            re.IGNORECASE | re.DOTALL,
        )
        for match in qa_pattern.finditer(text):
            front = self._collapse_lines(match.group("front"))
            back = self._collapse_lines(match.group("back"))
            if front and back:
                cards.append(
                    {
                        "front": front,
                        "back": back,
                        "card_type": "concept",
                        "difficulty": "medium",
                        "tags": [],
                    }
                )
        return cards[:30]

    def _recover_mindmap(self, text: str) -> dict[str, Any] | None:
        node_pattern = re.compile(
            r'"id"\s*:\s*"(?P<id>(?:[^"\\]|\\.)*)".{0,120}?"title"\s*:\s*"(?P<title>(?:[^"\\]|\\.)*)"(?:.{0,220}?"description"\s*:\s*"(?P<description>(?:[^"\\]|\\.)*)")?(?:.{0,120}?"category"\s*:\s*"(?P<category>(?:[^"\\]|\\.)*)")?(?:.{0,80}?"level"\s*:\s*(?P<level>\d+))?',
            re.IGNORECASE | re.DOTALL,
        )
        edge_pattern = re.compile(
            r'"source"\s*:\s*"(?P<source>(?:[^"\\]|\\.)*)".{0,120}?"target"\s*:\s*"(?P<target>(?:[^"\\]|\\.)*)"(?:.{0,120}?"label"\s*:\s*"(?P<label>(?:[^"\\]|\\.)*)")?(?:.{0,80}?"relation"\s*:\s*"(?P<relation>(?:[^"\\]|\\.)*)")?',
            re.IGNORECASE | re.DOTALL,
        )
        nodes: list[dict[str, Any]] = []
        seen: set[str] = set()
        for match in node_pattern.finditer(text):
            node_id = self._slug(self._unescape_relaxed_text(match.group("id")))
            title = self._unescape_relaxed_text(match.group("title"))
            if not title or node_id in seen:
                continue
            seen.add(node_id)
            nodes.append(
                {
                    "id": node_id,
                    "title": title[:80],
                    "description": self._unescape_relaxed_text(match.group("description") or "")[:260],
                    "category": self._unescape_relaxed_text(match.group("category") or "concept")[:40] or "concept",
                    "level": self._safe_int(match.group("level"), 0, 0, 8),
                    "color": None,
                }
            )
        if len(nodes) < 2:
            return None
        node_ids = {node["id"] for node in nodes}
        edges: list[dict[str, Any]] = []
        for index, match in enumerate(edge_pattern.finditer(text)):
            source = self._slug(self._unescape_relaxed_text(match.group("source")))
            target = self._slug(self._unescape_relaxed_text(match.group("target")))
            if source not in node_ids or target not in node_ids or source == target:
                continue
            edges.append(
                {
                    "id": f"{source}-{target}-{index}",
                    "source": source,
                    "target": target,
                    "label": self._unescape_relaxed_text(match.group("label") or "")[:80],
                    "relation": self._unescape_relaxed_text(match.group("relation") or "related_to")[:40] or "related_to",
                }
            )
        return {"nodes": nodes[:24], "edges": edges[:40]}

    def _unescape_relaxed_text(self, text: str) -> str:
        normalized = (text or "").replace('\\"', '"').replace("\\n", "\n").replace("\\t", "\t")
        normalized = re.sub(r"\\(?![\\\"/bfnrtu])", r"\\", normalized)
        normalized = normalized.replace("\\/", "/")
        return normalized.strip()

    def _collapse_lines(self, text: str) -> str:
        return re.sub(r"\s*\n\s*", " ", (text or "").strip())

    def _normalized_difficulty(self, value: str) -> str:
        difficulty = str(value).strip().lower()
        return difficulty if difficulty in {"easy", "medium", "hard"} else "medium"

    def _preview(self, text: str, max_chars: int = 300) -> str:
        compact = re.sub(r"\s+", " ", (text or "")).strip()
        if len(compact) > max_chars:
            return f"{compact[:max_chars]}...[truncated]"
        return compact

    def _validate_graph(self, data: Any) -> dict[str, Any]:
        if not isinstance(data, dict):
            raise LearningArtifactError("Mindmap generation did not return a graph object.", status_code=502)
        raw_nodes = data.get("nodes") if isinstance(data.get("nodes"), list) else []
        raw_edges = data.get("edges") if isinstance(data.get("edges"), list) else []
        nodes: list[dict[str, Any]] = []
        seen: set[str] = set()
        max_nodes = 18

        for index, item in enumerate(raw_nodes[:max_nodes]):
            if not isinstance(item, dict):
                continue
            title = str(item.get("title", "")).strip()
            if not title:
                continue
            node_id = self._slug(str(item.get("id") or title or f"node-{index}"))
            if node_id in seen:
                node_id = f"{node_id}-{index}"
            seen.add(node_id)
            nodes.append(
                {
                    "id": node_id,
                    "title": title[:80],
                    "description": str(item.get("description", "")).strip()[:260],
                    "category": str(item.get("category", "concept")).strip()[:40] or "concept",
                    "level": self._safe_int(item.get("level"), 0, 0, 8),
                    "color": str(item.get("color", "")).strip()[:24] or None,
                }
            )

        if len(nodes) < 2:
            raise LearningArtifactError("Mindmap generation returned too few usable concepts.", status_code=502)

        root = next((node for node in nodes if node["id"] == "root"), None)
        if not root:
            root = next((node for node in nodes if node["level"] == 0), nodes[0])
            root["level"] = 0
        for node in nodes:
            if node is not root and node["level"] == 0:
                node["level"] = 1

        node_ids = {node["id"] for node in nodes}
        edges: list[dict[str, Any]] = []
        seen_edges: set[tuple[str, str]] = set()
        for index, item in enumerate(raw_edges[:36]):
            if not isinstance(item, dict):
                continue
            source = self._slug(str(item.get("source", "")))
            target = self._slug(str(item.get("target", "")))
            edge_key = (source, target)
            if source not in node_ids or target not in node_ids or source == target or edge_key in seen_edges:
                continue
            seen_edges.add(edge_key)
            edges.append(
                {
                    "id": str(item.get("id") or f"{source}-{target}-{index}"),
                    "source": source,
                    "target": target,
                    "label": str(item.get("label", "")).strip()[:80],
                    "relation": str(item.get("relation", "related_to")).strip()[:40] or "related_to",
                }
            )

        inbound = {edge["target"] for edge in edges}
        for node in nodes:
            if node["id"] == root["id"]:
                continue
            if node["id"] in inbound:
                continue
            edge_key = (root["id"], node["id"])
            if edge_key in seen_edges:
                continue
            seen_edges.add(edge_key)
            edges.append(
                {
                    "id": f"{root['id']}-{node['id']}-auto",
                    "source": root["id"],
                    "target": node["id"],
                    "label": "connects to",
                    "relation": "related_to",
                }
            )

        if not edges:
            raise LearningArtifactError("Mindmap generation returned no usable relationships.", status_code=502)

        logger.info(
            "learning_artifact.mindmap.validation total_nodes=%s total_edges=%s kept_nodes=%s kept_edges=%s",
            len(raw_nodes),
            len(raw_edges),
            len(nodes),
            len(edges),
        )
        return {"nodes": nodes, "edges": edges}

    def _validate_cards(self, data: Any, count: int) -> list[dict[str, Any]]:
        raw_cards = data.get("cards") if isinstance(data, dict) and isinstance(data.get("cards"), list) else []
        cards: list[dict[str, Any]] = []
        skipped = 0
        for item in raw_cards[:count]:
            if not isinstance(item, dict):
                skipped += 1
                continue
            front = str(item.get("front", "")).strip()
            back = str(item.get("back", "")).strip()
            if not front or not back:
                skipped += 1
                continue
            difficulty = self._normalized_difficulty(str(item.get("difficulty", "medium")))
            tags = item.get("tags", [])
            if not isinstance(tags, list):
                tags = []
            cards.append(
                {
                    "front": front[:1000],
                    "back": back[:1400],
                    "card_type": str(item.get("card_type", "concept")).strip()[:40] or "concept",
                    "difficulty": difficulty,
                    "tags": [str(tag).strip()[:32] for tag in tags[:5] if str(tag).strip()],
                }
            )
        logger.info(
            "learning_artifact.flashcards.validation total=%s kept=%s skipped=%s",
            len(raw_cards[:count]),
            len(cards),
            skipped,
        )
        if len(cards) < 3:
            raise LearningArtifactError("Flashcard generation returned too few usable cards.", status_code=502)
        return cards

    def _bounded_context(self, content: str, max_chars: int = 14000) -> str:
        cleaned = re.sub(r"\s+", " ", content or "").strip()
        return cleaned[:max_chars]

    def _source_summary(self, content: str) -> str:
        return self._bounded_context(content, max_chars=420)

    def _bounded_title(self, title: str) -> str:
        normalized = " ".join((title or "Untitled").split())
        return normalized[:160] or "Untitled"

    def _slug(self, value: str) -> str:
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
        return slug or "node"

    def _safe_int(self, value: Any, default: int, minimum: int, maximum: int) -> int:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            parsed = default
        return max(minimum, min(maximum, parsed))
