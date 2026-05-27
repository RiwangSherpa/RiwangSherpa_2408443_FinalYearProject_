"""
Notes API router for Obsidian-style knowledge base
"""

import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_user

router = APIRouter()


def parse_note_links(content: str) -> List[str]:
    """Extract [[link]] references from note content"""
    pattern = r'\[\[([^\]]+)\]\]'
    return re.findall(pattern, content)


def update_note_links(db: Session, note: models.Note, linked_titles: List[str]):
    """Update bidirectional links for a note"""
    # Remove existing outgoing links
    db.query(models.NoteLink).filter(
        models.NoteLink.source_note_id == note.id
    ).delete(synchronize_session=False)

    # Create new links
    for title in linked_titles:
        target_note = db.query(models.Note).filter(
            models.Note.user_id == note.user_id,
            func.lower(models.Note.title) == func.lower(title.strip())
        ).first()

        if target_note and target_note.id != note.id:
            link = models.NoteLink(
                source_note_id=note.id,
                target_note_id=target_note.id
            )
            db.add(link)

    db.commit()


@router.post("/", response_model=schemas.NoteResponse)
async def create_note(
    note_data: schemas.NoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new note"""
    # Check if note with same title exists
    existing = db.query(models.Note).filter(
        models.Note.user_id == current_user.id,
        func.lower(models.Note.title) == func.lower(note_data.title)
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Note with this title already exists")

    # Create note
    note = models.Note(
        user_id=current_user.id,
        goal_id=note_data.goal_id,
        title=note_data.title,
        content=note_data.content or "",
        tags=note_data.tags or []
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    # Parse and create links
    linked_titles = parse_note_links(note.content)
    update_note_links(db, note, linked_titles)

    return note


@router.get("/", response_model=List[schemas.NoteResponse])
async def list_notes(
    goal_id: Optional[int] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all notes for current user with optional filtering"""
    query = db.query(models.Note).filter(models.Note.user_id == current_user.id)

    if goal_id:
        query = query.filter(models.Note.goal_id == goal_id)

    if tag:
        query = query.filter(models.Note.tags.contains([tag]))

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Note.title.ilike(search_pattern),
                models.Note.content.ilike(search_pattern)
            )
        )

    notes = query.order_by(models.Note.updated_at.desc()).all()
    return notes


@router.get("/{note_id}", response_model=schemas.NoteWithLinks)
async def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific note with its links"""
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Get outgoing links
    outgoing = [link.target_note for link in note.outgoing_links]
    incoming = [link.source_note for link in note.incoming_links]

    return {
        **note.__dict__,
        "outgoing_links": outgoing,
        "incoming_links": incoming
    }


@router.put("/{note_id}", response_model=schemas.NoteResponse)
async def update_note(
    note_id: int,
    note_data: schemas.NoteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a note"""
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Update fields
    if note_data.title is not None:
        # Check for duplicate title
        existing = db.query(models.Note).filter(
            models.Note.user_id == current_user.id,
            func.lower(models.Note.title) == func.lower(note_data.title),
            models.Note.id != note_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Note with this title already exists")
        note.title = note_data.title

    if note_data.content is not None:
        note.content = note_data.content
        # Update links
        linked_titles = parse_note_links(note.content)
        update_note_links(db, note, linked_titles)

    if note_data.tags is not None:
        note.tags = note_data.tags

    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a note"""
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}


@router.get("/{note_id}/backlinks", response_model=List[schemas.BacklinkInfo])
async def get_backlinks(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all notes that link to this note"""
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    backlinks = []
    for link in note.incoming_links:
        source_note = link.source_note
        preview = source_note.content[:150] + "..." if len(source_note.content) > 150 else source_note.content
        backlinks.append({
            "id": source_note.id,
            "title": source_note.title,
            "preview": preview
        })

    return backlinks


@router.get("/graph/all", response_model=schemas.NoteGraph)
async def get_note_graph(
    goal_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get graph data for visualizing note connections"""
    query = db.query(models.Note).filter(models.Note.user_id == current_user.id)

    if goal_id:
        query = query.filter(models.Note.goal_id == goal_id)

    notes = query.all()

    nodes = []
    edges = []
    note_ids = {note.id for note in notes}

    for note in notes:
        nodes.append({
            "id": note.id,
            "title": note.title,
            "tag_count": len(note.tags)
        })

        for link in note.outgoing_links:
            if link.target_note_id in note_ids:
                edges.append({
                    "source": note.id,
                    "target": link.target_note_id
                })

    return {"nodes": nodes, "edges": edges}


@router.post("/auto-generate")
async def auto_generate_note(
    source_type: str,
    source_id: int,
    title: str,
    content: str,
    goal_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Auto-generate a note from quiz mistakes, roadmap steps, etc."""
    # Check if note already exists
    existing = db.query(models.Note).filter(
        models.Note.user_id == current_user.id,
        models.Note.source_type == source_type,
        models.Note.source_id == source_id
    ).first()

    if existing:
        return existing

    note = models.Note(
        user_id=current_user.id,
        goal_id=goal_id,
        title=title,
        content=content,
        is_auto_generated=True,
        source_type=source_type,
        source_id=source_id,
        tags=["auto-generated"]
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    # Parse and create links
    linked_titles = parse_note_links(note.content)
    update_note_links(db, note, linked_titles)

    return note


@router.get("/search/autocomplete")
async def autocomplete_note_titles(
    query: str = Query(..., min_length=1),
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Autocomplete note titles for [[linking]]"""
    search_pattern = f"%{query}%"
    notes = db.query(models.Note).filter(
        models.Note.user_id == current_user.id,
        models.Note.title.ilike(search_pattern)
    ).limit(limit).all()

    return [{"id": n.id, "title": n.title} for n in notes]
