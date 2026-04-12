"""
Adaptive Learning API Router
Concept mastery tracking and adaptive difficulty
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user
from app.services.adaptive_learning import AdaptiveLearningService

router = APIRouter(prefix="/api/adaptive", tags=["adaptive-learning"])


@router.post("/concepts")
async def create_concept(
    name: str,
    description: str = None,
    domain: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new learning concept"""
    service = AdaptiveLearningService(db)
    concept = service.get_or_create_concept(name, description, domain)
    
    return {
        "success": True,
        "concept": {
            "id": concept.id,
            "name": concept.name,
            "description": concept.description,
            "domain": concept.domain
        }
    }


@router.get("/concepts")
async def get_all_concepts(
    domain: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all learning concepts"""
    query = db.query(models.Concept)
    
    if domain:
        query = query.filter(models.Concept.domain == domain)
    
    concepts = query.all()
    
    return {
        "concepts": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "domain": c.domain,
                "difficulty_level": c.difficulty_level
            }
            for c in concepts
        ]
    }


@router.get("/mastery/goal/{goal_id}")
async def get_goal_mastery(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get concept mastery levels for a specific goal"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = AdaptiveLearningService(db)
    mastery_data = service.get_concept_mastery_for_goal(current_user.id, goal_id)
    
    return {
        "goal_id": goal_id,
        "concepts": mastery_data,
        "overall_mastery": sum(m["mastery_score"] for m in mastery_data) / len(mastery_data) if mastery_data else 0
    }


@router.get("/mastery/weak")
async def get_weak_concepts(
    threshold: float = 0.5,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get concepts where user has low mastery"""
    service = AdaptiveLearningService(db)
    weak_concepts = service.get_weak_concepts(current_user.id, threshold)
    
    return {
        "threshold": threshold,
        "weak_concepts": weak_concepts,
        "count": len(weak_concepts)
    }


@router.post("/mastery/update")
async def update_concept_mastery(
    concept_id: int,
    is_correct: bool,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update mastery based on quiz performance"""
    service = AdaptiveLearningService(db)
    mastery = service.update_concept_mastery(
        user_id=current_user.id,
        concept_id=concept_id,
        is_correct=is_correct
    )
    
    return {
        "success": True,
        "concept_id": concept_id,
        "new_mastery": mastery.mastery_score,
        "confidence": mastery.confidence,
        "suggested_difficulty": mastery.suggested_difficulty,
        "attempts": mastery.attempts_count
    }


@router.get("/recommendations")
async def get_learning_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get personalized learning recommendations"""
    service = AdaptiveLearningService(db)
    recommendations = service.get_learning_recommendations(current_user.id)
    
    return recommendations


@router.post("/link-concept-to-goal")
async def link_concept_to_goal(
    goal_id: int,
    concept_id: int,
    importance: float = 1.0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Link a concept to a goal with importance weight"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = AdaptiveLearningService(db)
    link = service.link_concept_to_goal(goal_id, concept_id, importance)
    
    return {
        "success": True,
        "link_id": link.id,
        "goal_id": goal_id,
        "concept_id": concept_id,
        "importance": importance
    }


@router.get("/goal-readiness/{goal_id}")
async def check_goal_readiness(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Check if user is ready to start or continue a goal"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = AdaptiveLearningService(db)
    readiness = service.calculate_goal_readiness(current_user.id, goal_id)
    
    return readiness


@router.get("/suggested-difficulty/{goal_id}")
async def get_suggested_difficulty(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get suggested difficulty level based on mastery"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = AdaptiveLearningService(db)
    difficulty = service.adapt_roadmap_difficulty(current_user.id, goal_id)
    
    return {
        "goal_id": goal_id,
        "suggested_difficulty": difficulty,
        "rationale": f"Based on your concept mastery, {difficulty} level is recommended"
    }
