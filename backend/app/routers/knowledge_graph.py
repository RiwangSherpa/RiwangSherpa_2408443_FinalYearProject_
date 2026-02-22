"""
Knowledge Graph API Router
Visual learning maps and concept relationships
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models
from app.routers.auth import get_current_user
from app.services.knowledge_graph import KnowledgeGraphService

router = APIRouter(prefix="/api/knowledge-graph", tags=["knowledge-graph"])


class CreateNodeRequest(BaseModel):
    label: str
    node_type: str = "concept"  # concept, skill, resource, milestone
    description: str = None
    x_position: float = None
    y_position: float = None


class CreateEdgeRequest(BaseModel):
    source_node_id: int
    target_node_id: int
    edge_type: str = "prerequisite"  # prerequisite, related, sequence
    strength: float = 1.0


@router.post("/goals/{goal_id}/nodes")
async def create_node(
    goal_id: int,
    request: CreateNodeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new knowledge graph node for a goal"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = KnowledgeGraphService(db)
    node = service.create_node(
        goal_id=goal_id,
        label=request.label,
        node_type=request.node_type,
        description=request.description,
        x_position=request.x_position,
        y_position=request.y_position
    )
    
    return {
        "success": True,
        "node": {
            "id": node.id,
            "label": node.label,
            "type": node.node_type,
            "description": node.description,
            "position": {"x": node.x_position, "y": node.y_position},
            "color": node.color
        }
    }


@router.post("/goals/{goal_id}/edges")
async def create_edge(
    goal_id: int,
    request: CreateEdgeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create an edge between nodes in a goal's knowledge graph"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = KnowledgeGraphService(db)
    edge = service.create_edge(
        goal_id=goal_id,
        source_node_id=request.source_node_id,
        target_node_id=request.target_node_id,
        edge_type=request.edge_type,
        strength=request.strength
    )
    
    return {
        "success": True,
        "edge": {
            "id": edge.id,
            "source": edge.source_node_id,
            "target": edge.target_node_id,
            "type": edge.edge_type,
            "strength": edge.strength
        }
    }


@router.get("/goals/{goal_id}")
async def get_graph(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get complete knowledge graph for a goal"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = KnowledgeGraphService(db)
    graph = service.get_graph_for_goal(goal_id)
    
    return graph


@router.post("/goals/{goal_id}/auto-generate")
async def auto_generate_graph(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Auto-generate knowledge graph from roadmap steps"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = KnowledgeGraphService(db)
    graph = service.auto_generate_graph_from_roadmap(goal_id)
    
    return graph


@router.patch("/nodes/{node_id}/mastery")
async def update_node_mastery(
    node_id: int,
    mastery_level: float,  # 0-1
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update mastery level for a knowledge node"""
    # Verify node belongs to user's goal
    node = db.query(models.KnowledgeNode).join(
        models.Goal
    ).filter(
        models.KnowledgeNode.id == node_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    if mastery_level < 0 or mastery_level > 1:
        raise HTTPException(status_code=400, detail="Mastery level must be between 0 and 1")
    
    service = KnowledgeGraphService(db)
    service.update_node_mastery(node_id, mastery_level)
    
    return {
        "success": True,
        "node_id": node_id,
        "new_mastery": mastery_level
    }


@router.get("/goals/{goal_id}/learning-path")
async def get_learning_path(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get recommended learning path based on current mastery"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = KnowledgeGraphService(db)
    path = service.get_learning_path(goal_id, current_user.id)
    
    return {
        "goal_id": goal_id,
        "learning_path": path,
        "recommended_next": path[0] if path else None
    }


@router.get("/goals/{goal_id}/coverage")
async def get_graph_coverage(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get learning coverage statistics for the graph"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = KnowledgeGraphService(db)
    coverage = service.calculate_graph_coverage(goal_id, current_user.id)
    
    return coverage


@router.get("/goals/{goal_id}/unlocked")
async def get_unlocked_nodes(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get nodes that are unlocked (prerequisites met)"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = KnowledgeGraphService(db)
    unlocked = service.get_unlocked_nodes(goal_id, current_user.id)
    
    return {
        "goal_id": goal_id,
        "unlocked_count": len(unlocked),
        "unlocked_nodes": [
            {
                "id": n.id,
                "label": n.label,
                "type": n.node_type,
                "mastery": n.mastery_level
            }
            for n in unlocked
        ]
    }
