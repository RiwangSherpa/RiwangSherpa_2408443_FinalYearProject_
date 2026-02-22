"""
Flashcards API Router - Spaced Repetition System
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user
from app.services.spaced_repetition import SpacedRepetitionService

router = APIRouter(prefix="/api/flashcards", tags=["flashcards"])


@router.post("/create")
async def create_flashcard(
    request: schemas.FlashcardCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new flashcard"""
    service = SpacedRepetitionService(db)
    flashcard = service.create_flashcard(
        user_id=current_user.id,
        front_content=request.front_content,
        back_content=request.back_content,
        goal_id=request.goal_id,
        tags=request.tags
    )
    return {
        "success": True,
        "flashcard": {
            "id": flashcard.id,
            "front": flashcard.front_content,
            "back": flashcard.back_content,
            "next_review": flashcard.next_review_date.isoformat() if flashcard.next_review_date else None
        }
    }


@router.get("/due")
async def get_due_flashcards(
    limit: int = 20,
    goal_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get flashcards due for review"""
    service = SpacedRepetitionService(db)
    flashcards = service.get_due_flashcards(
        user_id=current_user.id,
        limit=limit,
        goal_id=goal_id
    )
    
    return {
        "due_count": len(flashcards),
        "flashcards": [
            {
                "id": fc.id,
                "front": fc.front_content,
                "back": fc.back_content,
                "interval_days": fc.interval_days,
                "ease_factor": fc.ease_factor,
                "repetition_count": fc.repetition_count
            }
            for fc in flashcards
        ]
    }


@router.get("/new")
async def get_new_flashcards(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get new flashcards (never reviewed)"""
    service = SpacedRepetitionService(db)
    flashcards = service.get_new_flashcards(
        user_id=current_user.id,
        limit=limit
    )
    
    return {
        "new_count": len(flashcards),
        "flashcards": [
            {
                "id": fc.id,
                "front": fc.front_content,
                "back": fc.back_content
            }
            for fc in flashcards
        ]
    }


@router.post("/{flashcard_id}/review")
async def submit_review(
    flashcard_id: int,
    request: schemas.ReviewRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Submit a review for a flashcard.
    
    Quality scores (SM-2):
    - 5: Perfect response
    - 4: Correct with hesitation
    - 3: Correct with difficulty
    - 2: Incorrect but remembered
    - 1: Incorrect, familiar
    - 0: Complete blackout
    """
    quality_score = request.quality_score
    if quality_score < 0 or quality_score > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quality score must be between 0 and 5"
        )
    
    service = SpacedRepetitionService(db)
    
    try:
        updated = service.submit_review(
            flashcard_id=flashcard_id,
            user_id=current_user.id,
            quality_score=quality_score
        )
        
        return {
            "success": True,
            "flashcard_id": updated.id,
            "new_interval": updated.interval_days,
            "new_ease_factor": updated.ease_factor,
            "next_review": updated.next_review_date.isoformat() if updated.next_review_date else None,
            "repetition_count": updated.repetition_count
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/stats")
async def get_flashcard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get spaced repetition statistics"""
    service = SpacedRepetitionService(db)
    stats = service.get_stats(current_user.id)
    
    return {
        "stats": stats
    }


@router.get("/all")
async def get_all_flashcards(
    goal_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all flashcards for the user"""
    query = db.query(models.Flashcard).filter(
        models.Flashcard.user_id == current_user.id
    )
    
    if goal_id:
        query = query.filter(models.Flashcard.goal_id == goal_id)
    
    flashcards = query.order_by(models.Flashcard.created_at.desc()).all()
    
    return {
        "total": len(flashcards),
        "flashcards": [
            {
                "id": fc.id,
                "front": fc.front_content,
                "back": fc.back_content,
                "tags": fc.tags,
                "interval_days": fc.interval_days,
                "next_review": fc.next_review_date.isoformat() if fc.next_review_date else None,
                "total_reviews": fc.total_reviews,
                "correct_reviews": fc.correct_reviews
            }
            for fc in flashcards
        ]
    }
