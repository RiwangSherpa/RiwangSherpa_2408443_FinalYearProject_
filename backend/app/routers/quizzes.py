"""
Quizzes API router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.services.ai_service import ai_service
from app.routers.auth import get_current_user

router = APIRouter()

@router.post("/generate", response_model=schemas.QuizGenerateResponse)
async def generate_quiz(
    request: schemas.QuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate quiz questions using AI"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == request.goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    try:
        # Call AI service
        ai_result = await ai_service.generate_quiz(
            goal_title=goal.title,
            topic=request.topic,
            num_questions=request.num_questions,
            difficulty=request.difficulty or "medium"
        )
        
        questions = [
            schemas.QuizQuestion(**q) for q in ai_result["questions"]
        ]
        
        return schemas.QuizGenerateResponse(
            success=True,
            questions=questions,
            confidence_score=ai_result.get("confidence_score", 0.85),
            prompt_used=None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

@router.post("/submit", response_model=schemas.QuizSubmitResponse)
async def submit_quiz(
    request: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submit quiz answers and get results"""
    quiz_data = request.get("quiz_data", {})
    answers_data = request.get("answers", {})
    
    questions = quiz_data.get("questions", [])
    answers = answers_data.get("answers", [])
    goal_id = quiz_data.get("goal_id") or answers_data.get("quiz_id")
    topic = quiz_data.get("topic", "General")
    
    if not goal_id:
        raise HTTPException(
            status_code=400,
            detail="Goal ID is required"
        )
    
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if len(answers) != len(questions):
        raise HTTPException(
            status_code=400, 
            detail="Number of answers must match number of questions"
        )
    
    correct_count = 0
    feedback = []
    
    for i, question in enumerate(questions):
        correct_answer = question.get("correct_answer", 0)
        is_correct = answers[i] == correct_answer
        if is_correct:
            correct_count += 1
        
        feedback.append({
            "question_index": i,
            "is_correct": is_correct,
            "selected_answer": answers[i],
            "correct_answer": correct_answer,
            "explanation": question.get("explanation")
        })
    
    score = (correct_count / len(questions)) * 100 if questions else 0
    
    # Save quiz result to database
    try:
        if questions:
            quiz_result = models.QuizResult(
                goal_id=goal_id,
                topic=topic,
                questions=questions,
                score=score,
                total_questions=len(questions),
                correct_answers=correct_count
            )
            db.add(quiz_result)
            db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save quiz result: {str(e)}")
    
    return schemas.QuizSubmitResponse(
        score=score,
        correct_answers=correct_count,
        total_questions=len(questions),
        feedback=feedback
    )

@router.get("/results/{goal_id}", response_model=List[dict])
async def get_quiz_results(
    goal_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get quiz results for a goal"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    results = db.query(models.QuizResult).filter(
        models.QuizResult.goal_id == goal_id
    ).order_by(models.QuizResult.completed_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "topic": r.topic,
            "score": r.score,
            "total_questions": r.total_questions,
            "correct_answers": r.correct_answers,
            "completed_at": r.completed_at
        }
        for r in results
    ]

