"""
AI Conversation API Router
AI Tutoring sessions with context memory
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models
from app.dependencies import get_current_user, require_pro_subscription
from app.services.conversation_service import AITutorService

router = APIRouter(prefix="/api/tutor", tags=["ai-tutor"])


class SendMessageRequest(BaseModel):
    content: str


class CreateSessionRequest(BaseModel):
    goal_id: Optional[int] = None
    step_id: Optional[int] = None
    title: Optional[str] = None


@router.post("/sessions")
async def create_session(
    request: CreateSessionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_pro_subscription)
):
    """Create a new AI tutoring session"""
    service = AITutorService(db)
    session = service.create_session(
        user_id=current_user.id,
        goal_id=request.goal_id,
        step_id=request.step_id,
        title=request.title
    )
    
    return {
        "success": True,
        "session": {
            "id": session.id,
            "title": session.title,
            "goal_id": session.goal_id,
            "step_id": session.step_id,
            "created_at": session.created_at.isoformat(),
            "is_active": session.is_active
        }
    }


@router.get("/sessions")
async def get_sessions(
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_pro_subscription)
):
    """Get all tutoring sessions for the user"""
    service = AITutorService(db)
    sessions = service.get_user_sessions(current_user.id, active_only)
    
    return {
        "sessions": [
            {
                "id": s.id,
                "title": s.title,
                "goal_id": s.goal_id,
                "step_id": s.step_id,
                "message_count": len(s.messages),
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
                "is_active": s.is_active
            }
            for s in sessions
        ]
    }


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_pro_subscription)
):
    """Get a specific session with all messages"""
    service = AITutorService(db)
    session = service.get_session(session_id, current_user.id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session": {
            "id": session.id,
            "title": session.title,
            "goal_id": session.goal_id,
            "step_id": session.step_id,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
            "is_active": session.is_active,
            "context_summary": session.context_summary,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "model_used": m.model_used,
                    "was_helpful": m.was_helpful,
                    "created_at": m.created_at.isoformat()
                }
                for m in session.messages
            ]
        }
    }


@router.post("/sessions/{session_id}/message")
async def send_message(
    session_id: int,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_pro_subscription)
):
    """Send a message in a tutoring session and get AI response"""
    service = AITutorService(db)
    
    session = service.get_session(session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    goal = None
    step = None
    
    if session.goal_id:
        goal = db.query(models.Goal).filter(
            models.Goal.id == session.goal_id,
            models.Goal.user_id == current_user.id
        ).first()
    
    if session.step_id:
        step = db.query(models.RoadmapStep).filter(
            models.RoadmapStep.id == session.step_id
        ).first()
    
    try:
        ai_response = await service.send_message(
            session_id=session_id,
            user_id=current_user.id,
            content=request.content,
            context_goal=goal,
            context_step=step
        )
        
        return {
            "success": True,
            "user_message": request.content,
            "ai_response": {
                "id": ai_response.id,
                "content": ai_response.content,
                "model_used": ai_response.model_used,
                "created_at": ai_response.created_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI response: {str(e)}"
        )


@router.post("/explain-concept")
async def explain_concept(
    concept_name: str,
    context: str = None,
    difficulty_level: str = "intermediate",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_pro_subscription)
):
    """Get a standalone explanation of a concept"""
    service = AITutorService(db)
    
    try:
        explanation = await service.explain_concept(
            concept_name=concept_name,
            context=context,
            difficulty_level=difficulty_level
        )
        
        return {
            "success": True,
            "concept": concept_name,
            "difficulty": difficulty_level,
            "explanation": explanation
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate explanation: {str(e)}"
        )


@router.post("/messages/{message_id}/rate")
async def rate_response(
    message_id: int,
    was_helpful: bool,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_pro_subscription)
):
    """Rate whether an AI response was helpful"""
    service = AITutorService(db)
    
    message = db.query(models.ConversationMessage).join(
        models.ConversationSession
    ).filter(
        models.ConversationMessage.id == message_id,
        models.ConversationSession.user_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    service.rate_response_helpfulness(message_id, was_helpful)
    
    return {
        "success": True,
        "message_id": message_id,
        "was_helpful": was_helpful
    }


@router.post("/sessions/{session_id}/close")
async def close_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Close a tutoring session"""
    service = AITutorService(db)
    service.close_session(session_id, current_user.id)
    
    return {
        "success": True,
        "message": "Session closed"
    }


@router.get("/stats")
async def get_tutor_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get AI tutoring statistics"""
    service = AITutorService(db)
    stats = service.get_session_stats(current_user.id)
    
    return {
        "stats": stats
    }
