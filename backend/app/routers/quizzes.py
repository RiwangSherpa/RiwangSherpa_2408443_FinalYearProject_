"""
Quizzes API router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.services.ai_service import ai_service
from app.services.gamification import GamificationService
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
    topic = quiz_data.get("topic", "")
    
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
    
    # If topic is empty, use goal title
    if not topic:
        topic = goal.title
    
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
    
    # Save quiz result to database and update gamification
    new_achievements = []
    level_up_info = None
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
            
            # Update gamification stats and check achievements
            gamification_service = GamificationService(db)
            
            # Get level before
            old_level = gamification_service.get_level_progress(current_user.id)["current_level"]
            
            # Update quiz stats
            gamification_service.update_stats_from_activity(
                current_user.id, 
                "quiz_completed", 
                len(questions)  # value is questions answered
            )
            
            # Check for perfect quiz (100% score)
            is_perfect = score == 100.0 and correct_count == len(questions)
            if is_perfect:
                gamification_service.update_stats_from_activity(current_user.id, "perfect_quiz")
            
            # Check for new achievements
            new_achievements = gamification_service.check_and_award_achievements(current_user.id)
            
            # Check for level up
            new_level_progress = gamification_service.get_level_progress(current_user.id)
            if new_level_progress["current_level"] > old_level:
                level_up_info = {
                    "old_level": old_level,
                    "new_level": new_level_progress["current_level"]
                }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save quiz result: {str(e)}")
    
    return {
        "score": score,
        "correct_answers": correct_count,
        "total_questions": len(questions),
        "feedback": feedback,
        "new_achievements": new_achievements,
        "level_up": level_up_info
    }

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

@router.get("/{quiz_id}")
async def get_quiz_by_id(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a single quiz result with full details"""
    # Get the quiz
    quiz = db.query(models.QuizResult).filter(models.QuizResult.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == quiz.goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "id": quiz.id,
        "goal_id": quiz.goal_id,
        "topic": quiz.topic,
        "score": quiz.score,
        "total_questions": quiz.total_questions,
        "correct_answers": quiz.correct_answers,
        "questions": quiz.questions,
        "completed_at": quiz.completed_at
    }

@router.get("/my-quizzes", response_model=List[dict])
async def get_my_quizzes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all quiz results for current user across all goals"""
    results = db.query(models.QuizResult).join(
        models.Goal, models.QuizResult.goal_id == models.Goal.id
    ).filter(
        models.Goal.user_id == current_user.id
    ).order_by(models.QuizResult.completed_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "goal_id": r.goal_id,
            "topic": r.topic,
            "score": r.score,
            "total_questions": r.total_questions,
            "correct_answers": r.correct_answers,
            "completed_at": r.completed_at
        }
        for r in results
    ]


@router.delete("/{quiz_id}")
async def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a quiz result"""
    # Verify quiz belongs to user through goal
    quiz = db.query(models.QuizResult).filter(models.QuizResult.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == quiz.goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        db.delete(quiz)
        db.commit()
        return {"message": "Quiz deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete quiz: {str(e)}")

