
@router.get("/my-roadmaps", response_model=List[schemas.RoadmapStepResponse])
async def get_my_roadmaps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all roadmap steps for current user across all goals"""
    steps = db.query(models.RoadmapStep).join(
        models.Goal, models.RoadmapStep.goal_id == models.Goal.id
    ).filter(
        models.Goal.user_id == current_user.id
    ).order_by(models.Goal.created_at.desc(), models.RoadmapStep.step_number).all()
    
    return steps
