"""
Knowledge Graph Service
Manages knowledge nodes and relationships for visual learning maps
"""

import math
import random
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from app import models


class KnowledgeGraphService:
    """Service for building and managing knowledge graphs"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_node(
        self,
        goal_id: int,
        label: str,
        node_type: str = "concept",
        description: str = None,
        x_position: float = None,
        y_position: float = None
    ) -> models.KnowledgeNode:
        """Create a new knowledge graph node"""
        
        if x_position is None or y_position is None:
            existing_count = self.db.query(models.KnowledgeNode).filter(
                models.KnowledgeNode.goal_id == goal_id
            ).count()
            angle = (existing_count * 2 * math.pi) / 8
            radius = 150 + (existing_count // 8) * 100
            x_position = 400 + radius * math.cos(angle)
            y_position = 300 + radius * math.sin(angle)
        
        node = models.KnowledgeNode(
            goal_id=goal_id,
            label=label,
            node_type=node_type,
            description=description,
            x_position=x_position,
            y_position=y_position,
            color=self._get_node_color(node_type)
        )
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        return node
    
    def _get_node_color(self, node_type: str) -> str:
        """Get color for node type"""
        colors = {
            "concept": "#4F46E5",
            "skill": "#059669",
            "resource": "#DC2626",
            "milestone": "#D97706",
        }
        return colors.get(node_type, "#6B7280")
    
    def create_edge(
        self,
        goal_id: int,
        source_node_id: int,
        target_node_id: int,
        edge_type: str = "prerequisite",
        strength: float = 1.0
    ) -> models.KnowledgeEdge:
        """Create an edge between nodes"""
        edge = models.KnowledgeEdge(
            goal_id=goal_id,
            source_node_id=source_node_id,
            target_node_id=target_node_id,
            edge_type=edge_type,
            strength=strength
        )
        self.db.add(edge)
        self.db.commit()
        self.db.refresh(edge)
        return edge
    
    def get_graph_for_goal(self, goal_id: int) -> Dict:
        """Get complete knowledge graph for a goal"""
        nodes = self.db.query(models.KnowledgeNode).filter(
            models.KnowledgeNode.goal_id == goal_id
        ).all()
        
        edges = self.db.query(models.KnowledgeEdge).filter(
            models.KnowledgeEdge.goal_id == goal_id
        ).all()
        
        return {
            "goal_id": goal_id,
            "nodes": [
                {
                    "id": node.id,
                    "label": node.label,
                    "type": node.node_type,
                    "description": node.description,
                    "position": {"x": node.x_position, "y": node.y_position},
                    "color": node.color,
                    "mastery": node.mastery_level,
                    "unlocked": node.is_unlocked
                }
                for node in nodes
            ],
            "edges": [
                {
                    "id": edge.id,
                    "source": edge.source_node_id,
                    "target": edge.target_node_id,
                    "type": edge.edge_type,
                    "strength": edge.strength
                }
                for edge in edges
            ]
        }
    
    def update_node_mastery(self, node_id: int, mastery_level: float) -> None:
        """Update mastery level for a node"""
        node = self.db.query(models.KnowledgeNode).filter(
            models.KnowledgeNode.id == node_id
        ).first()
        
        if node:
            node.mastery_level = min(1.0, max(0.0, mastery_level))
            
            if node.mastery_level >= 0.8:
                node.color = "#059669"
            elif node.mastery_level >= 0.5:
                node.color = "#D97706"
            else:
                node.color = "#6B7280"
            
            self.db.commit()
    
    def unlock_node(self, node_id: int) -> None:
        """Unlock a node (prerequisites met)"""
        node = self.db.query(models.KnowledgeNode).filter(
            models.KnowledgeNode.id == node_id
        ).first()
        
        if node:
            node.is_unlocked = True
            self.db.commit()
    
    def get_unlocked_nodes(self, goal_id: int, user_id: int) -> List[models.KnowledgeNode]:
        """Get nodes that should be unlocked based on mastery"""
        all_nodes = self.db.query(models.KnowledgeNode).filter(
            models.KnowledgeNode.goal_id == goal_id
        ).all()
        
        unlocked = []
        
        for node in all_nodes:
            prerequisites = self.db.query(models.KnowledgeEdge).filter(
                models.KnowledgeEdge.target_node_id == node.id,
                models.KnowledgeEdge.edge_type == "prerequisite"
            ).all()
            
            if not prerequisites:
                unlocked.append(node)
            else:
                all_mastered = True
                for prereq in prerequisites:
                    prereq_node = self.db.query(models.KnowledgeNode).filter(
                        models.KnowledgeNode.id == prereq.source_node_id
                    ).first()
                    if not prereq_node or prereq_node.mastery_level < 0.7:
                        all_mastered = False
                        break
                
                if all_mastered:
                    unlocked.append(node)
        
        return unlocked
    
    def auto_generate_graph_from_roadmap(self, goal_id: int) -> Dict:
        """
        Auto-generate a knowledge graph from roadmap steps.
        Creates nodes from steps and links them sequentially.
        """
        steps = self.db.query(models.RoadmapStep).filter(
            models.RoadmapStep.goal_id == goal_id
        ).order_by(models.RoadmapStep.step_number).all()
        
        if not steps:
            return {"error": "No roadmap found for this goal"}
        
        nodes = []
        previous_node_id = None
        
        for i, step in enumerate(steps):
            node = self.create_node(
                goal_id=goal_id,
                label=step.title,
                node_type="skill",
                description=step.description,
                x_position=200 + (i * 200),
                y_position=300
            )
            nodes.append(node)
            
            if previous_node_id:
                self.create_edge(
                    goal_id=goal_id,
                    source_node_id=previous_node_id,
                    target_node_id=node.id,
                    edge_type="sequence",
                    strength=1.0
                )
            
            previous_node_id = node.id
        
        return self.get_graph_for_goal(goal_id)
    
    def get_learning_path(self, goal_id: int, user_id: int) -> List[Dict]:
        """
        Get recommended learning path based on current mastery.
        Returns nodes in optimal order to study.
        """
        unlocked = self.get_unlocked_nodes(goal_id, user_id)
        not_mastered = [n for n in unlocked if n.mastery_level < 0.8]
        
        def prereq_count(node):
            return self.db.query(models.KnowledgeEdge).filter(
                models.KnowledgeEdge.target_node_id == node.id
            ).count()
        
        sorted_nodes = sorted(not_mastered, key=prereq_count)
        
        return [
            {
                "node_id": node.id,
                "label": node.label,
                "mastery": node.mastery_level,
                "description": node.description
            }
            for node in sorted_nodes
        ]
    
    def calculate_graph_coverage(self, goal_id: int, user_id: int) -> Dict:
        """Calculate learning coverage statistics for the graph"""
        nodes = self.db.query(models.KnowledgeNode).filter(
            models.KnowledgeNode.goal_id == goal_id
        ).all()
        
        if not nodes:
            return {"error": "No nodes found"}
        
        total = len(nodes)
        unlocked = sum(1 for n in nodes if n.is_unlocked)
        mastered = sum(1 for n in nodes if n.mastery_level >= 0.8)
        in_progress = sum(1 for n in nodes if 0.1 <= n.mastery_level < 0.8)
        
        total_mastery = sum(n.mastery_level for n in nodes)
        avg_mastery = total_mastery / total if total > 0 else 0
        
        return {
            "total_nodes": total,
            "unlocked_nodes": unlocked,
            "mastered_nodes": mastered,
            "in_progress_nodes": in_progress,
            "locked_nodes": total - unlocked,
            "completion_percentage": round((mastered / total) * 100, 1),
            "average_mastery": round(avg_mastery * 100, 1)
        }
