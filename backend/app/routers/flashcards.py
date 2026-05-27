"""Flashcard API for AI-generated active recall decks."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.services.learning_artifact_service import LearningArtifactError, LearningArtifactService


router = APIRouter(prefix="/api/flashcards", tags=["flashcards"])


def _service_error(exc: LearningArtifactError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


@router.get("/decks", response_model=list[schemas.FlashcardDeckResponse])
async def list_decks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    return [service.serialize_deck(deck) for deck in service.list_decks(current_user.id)]


@router.get("/decks/{deck_id}", response_model=schemas.FlashcardDeckDetailResponse)
async def get_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    try:
        return service.serialize_deck(service.get_deck(current_user.id, deck_id), include_cards=True)
    except LearningArtifactError as exc:
        raise _service_error(exc) from exc


@router.post("/decks", response_model=schemas.FlashcardDeckDetailResponse)
async def create_deck(
    request: schemas.FlashcardDeckCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    deck = service.create_deck(
        user_id=current_user.id,
        title=request.title,
        description=request.description,
        cards=[card.model_dump() for card in request.cards],
    )
    return service.serialize_deck(deck, include_cards=True)


@router.post("/generate", response_model=schemas.FlashcardDeckDetailResponse)
async def generate_deck(
    request: schemas.FlashcardGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    try:
        deck = await service.generate_flashcards(
            user_id=current_user.id,
            source_type=request.source_type,
            source_id=request.source_id,
            title=request.title,
            content=request.content,
            count=request.count,
        )
        return service.serialize_deck(deck, include_cards=True)
    except LearningArtifactError as exc:
        raise _service_error(exc) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Flashcard generation failed: {exc}") from exc


@router.patch("/cards/{card_id}/review", response_model=schemas.FlashcardResponse)
async def review_card(
    card_id: int,
    request: schemas.FlashcardReviewRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    try:
        return service.review_card(current_user.id, card_id, request.rating)
    except LearningArtifactError as exc:
        raise _service_error(exc) from exc


@router.delete("/decks/{deck_id}")
async def delete_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    try:
        service.delete_deck(current_user.id, deck_id)
        return {"success": True}
    except LearningArtifactError as exc:
        raise _service_error(exc) from exc
