"""
Adaptive Learning Algorithm
Implements Bayesian Knowledge Tracing and adaptive difficulty adjustment
"""

import math
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models


class BayesianKnowledgeTracer:
    """
    Bayesian Knowledge Tracing (BKT) algorithm for estimating student knowledge.
    
    BKT models knowledge as a latent variable that can be inferred from observed
    performance using Bayes' theorem.
    """
    
    def __init__(self, prior_knowledge: float = 0.3, learn_rate: float = 0.1,
                 slip_rate: float = 0.1, guess_rate: float = 0.2):
        """
        Initialize BKT parameters.
        
        Args:
            prior_knowledge: Initial probability of knowing a concept (P(L0))
            learn_rate: Probability of transitioning from not-knowing to knowing (P(T))
            slip_rate: Probability of making a mistake despite knowing (P(S))
            guess_rate: Probability of guessing correctly despite not knowing (P(G))
        """
        self.prior = prior_knowledge
        self.learn_rate = learn_rate
        self.slip_rate = slip_rate
        self.guess_rate = guess_rate
    
    def update_knowledge(self, current_mastery: float, is_correct: bool) -> float:
        """
        Update knowledge estimate based on new evidence.
        
        Args:
            current_mastery: Current probability of knowing the concept
            is_correct: Whether the student answered correctly
            
        Returns:
            Updated mastery probability
        """
        # Calculate probability of observation given knowledge state
        if is_correct:
            # P(correct | knows) * P(knows) + P(correct | doesn't know) * P(doesn't know)
            p_correct = (1 - self.slip_rate) * current_mastery + self.guess_rate * (1 - current_mastery)
            # P(knows | correct)
            posterior = ((1 - self.slip_rate) * current_mastery) / p_correct if p_correct > 0 else current_mastery
        else:
            # P(incorrect | knows) * P(knows) + P(incorrect | doesn't know) * P(doesn't know)
            p_incorrect = self.slip_rate * current_mastery + (1 - self.guess_rate) * (1 - current_mastery)
            # P(knows | incorrect)
            posterior = (self.slip_rate * current_mastery) / p_incorrect if p_incorrect > 0 else current_mastery
        
        # Apply learning (probability of transitioning to known state)
        updated_mastery = posterior + (1 - posterior) * self.learn_rate
        
        return min(1.0, updated_mastery)
    
    def predict_performance(self, mastery: float) -> float:
        """
        Predict probability of correct answer given current mastery.
        
        Args:
            mastery: Current probability of knowing the concept
            
        Returns:
            Probability of correct answer
        """
        return mastery * (1 - self.slip_rate) + (1 - mastery) * self.guess_rate
    
    def suggest_difficulty(self, mastery: float) -> str:
        """
        Suggest question difficulty based on mastery level.
        
        Args:
            mastery: Current mastery probability (0-1)
            
        Returns:
            Difficulty level: 'easy', 'medium', or 'hard'
        """
        if mastery < 0.4:
            return "easy"
        elif mastery < 0.75:
            return "medium"
        else:
            return "hard"


class AdaptiveLearningService:
    """Service for adaptive learning and concept mastery tracking"""
    
    def __init__(self, db: Session):
        self.db = db
        self.bkt = BayesianKnowledgeTracer()
    
    def get_or_create_concept(self, name: str, description: str = None, 
                              domain: str = None) -> models.Concept:
        """Get existing concept or create new one"""
        concept = self.db.query(models.Concept).filter(
            models.Concept.name == name
        ).first()
        
        if not concept:
            concept = models.Concept(
                name=name,
                description=description,
                domain=domain
            )
            self.db.add(concept)
            self.db.commit()
            self.db.refresh(concept)
        
        return concept
    
    def get_user_mastery(self, user_id: int, concept_id: int) -> models.UserConceptMastery:
        """Get or create user mastery record for a concept"""
        mastery = self.db.query(models.UserConceptMastery).filter(
            models.UserConceptMastery.user_id == user_id,
            models.UserConceptMastery.concept_id == concept_id
        ).first()
        
        if not mastery:
            mastery = models.UserConceptMastery(
                user_id=user_id,
                concept_id=concept_id,
                mastery_score=0.0,
                confidence=0.1
            )
            self.db.add(mastery)
            self.db.commit()
            self.db.refresh(mastery)
        
        return mastery
    
    def update_concept_mastery(self, user_id: int, concept_id: int, 
                               is_correct: bool) -> models.UserConceptMastery:
        """
        Update mastery based on quiz performance.
        
        Args:
            user_id: User ID
            concept_id: Concept ID
            is_correct: Whether the answer was correct
            
        Returns:
            Updated mastery record
        """
        mastery = self.get_user_mastery(user_id, concept_id)
        
        # Update using BKT
        new_mastery = self.bkt.update_knowledge(
            mastery.mastery_score,
            is_correct
        )
        
        mastery.mastery_score = round(new_mastery, 3)
        mastery.attempts_count += 1
        if is_correct:
            mastery.correct_count += 1
        mastery.last_attempt_at = datetime.utcnow()
        
        # Update confidence based on number of attempts
        mastery.confidence = min(0.95, 0.1 + (mastery.attempts_count * 0.05))
        
        # Update suggested difficulty
        mastery.suggested_difficulty = self.bkt.suggest_difficulty(new_mastery)
        
        self.db.commit()
        self.db.refresh(mastery)
        
        return mastery
    
    def get_concept_mastery_for_goal(self, user_id: int, goal_id: int) -> List[Dict]:
        """Get mastery levels for all concepts related to a goal"""
        goal_concepts = self.db.query(models.GoalConcept).filter(
            models.GoalConcept.goal_id == goal_id
        ).all()
        
        result = []
        for gc in goal_concepts:
            concept = self.db.query(models.Concept).filter(
                models.Concept.id == gc.concept_id
            ).first()
            
            if concept:
                mastery = self.get_user_mastery(user_id, concept.id)
                result.append({
                    "concept_id": concept.id,
                    "name": concept.name,
                    "domain": concept.domain,
                    "mastery_score": mastery.mastery_score,
                    "confidence": mastery.confidence,
                    "suggested_difficulty": mastery.suggested_difficulty,
                    "attempts": mastery.attempts_count,
                    "importance": gc.importance_weight
                })
        
        return sorted(result, key=lambda x: x["mastery_score"])
    
    def get_weak_concepts(self, user_id: int, threshold: float = 0.5) -> List[Dict]:
        """Get concepts where user has low mastery"""
        weak_mastery = self.db.query(models.UserConceptMastery).filter(
            models.UserConceptMastery.user_id == user_id,
            models.UserConceptMastery.mastery_score < threshold
        ).order_by(models.UserConceptMastery.mastery_score).all()
        
        result = []
        for mastery in weak_mastery:
            concept = self.db.query(models.Concept).filter(
                models.Concept.id == mastery.concept_id
            ).first()
            if concept:
                result.append({
                    "concept_id": concept.id,
                    "name": concept.name,
                    "mastery_score": mastery.mastery_score,
                    "suggested_difficulty": mastery.suggested_difficulty
                })
        
        return result
    
    def get_learning_recommendations(self, user_id: int) -> Dict:
        """
        Generate personalized learning recommendations.
        
        Returns:
            Dict with weak concepts, suggested difficulty, and study focus areas
        """
        # Get all user mastery records
        all_mastery = self.db.query(models.UserConceptMastery).filter(
            models.UserConceptMastery.user_id == user_id
        ).all()
        
        if not all_mastery:
            return {
                "weak_concepts": [],
                "strong_concepts": [],
                "recommendations": ["Start by creating a learning goal to get personalized recommendations"],
                "suggested_difficulty": "easy"
            }
        
        # Categorize concepts
        weak = []
        strong = []
        
        for mastery in all_mastery:
            concept = self.db.query(models.Concept).filter(
                models.Concept.id == mastery.concept_id
            ).first()
            
            if concept:
                concept_data = {
                    "id": concept.id,
                    "name": concept.name,
                    "mastery": mastery.mastery_score
                }
                
                if mastery.mastery_score < 0.5:
                    weak.append(concept_data)
                elif mastery.mastery_score > 0.8:
                    strong.append(concept_data)
        
        # Generate recommendations
        recommendations = []
        
        if weak:
            weak_names = [c["name"] for c in weak[:3]]
            recommendations.append(f"Focus on strengthening: {', '.join(weak_names)}")
        
        if len(strong) > len(weak):
            recommendations.append("Great progress! Consider tackling more advanced topics")
        
        # Calculate suggested difficulty based on average mastery
        avg_mastery = sum(m.mastery_score for m in all_mastery) / len(all_mastery)
        suggested_difficulty = self.bkt.suggest_difficulty(avg_mastery)
        
        return {
            "weak_concepts": weak,
            "strong_concepts": strong,
            "recommendations": recommendations,
            "suggested_difficulty": suggested_difficulty,
            "overall_mastery": round(avg_mastery * 100, 1)
        }
    
    def link_concept_to_goal(self, goal_id: int, concept_id: int, 
                            importance: float = 1.0) -> models.GoalConcept:
        """Link a concept to a goal"""
        existing = self.db.query(models.GoalConcept).filter(
            models.GoalConcept.goal_id == goal_id,
            models.GoalConcept.concept_id == concept_id
        ).first()
        
        if existing:
            return existing
        
        link = models.GoalConcept(
            goal_id=goal_id,
            concept_id=concept_id,
            importance_weight=importance
        )
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link
    
    def add_concept_prerequisite(self, concept_id: int, prerequisite_concept_id: int,
                                strength: float = 1.0) -> models.ConceptPrerequisite:
        """Add a prerequisite relationship between concepts"""
        prereq = models.ConceptPrerequisite(
            concept_id=concept_id,
            prerequisite_concept_id=prerequisite_concept_id,
            strength=strength
        )
        self.db.add(prereq)
        self.db.commit()
        self.db.refresh(prereq)
        return prereq
    
    def calculate_goal_readiness(self, user_id: int, goal_id: int) -> Dict:
        """
        Calculate how ready a user is to start or continue a goal based on
        prerequisite concept mastery.
        
        Returns:
            Dict with readiness score and missing prerequisites
        """
        # Get all concepts for this goal
        goal_concepts = self.db.query(models.GoalConcept).filter(
            models.GoalConcept.goal_id == goal_id
        ).all()
        
        if not goal_concepts:
            return {
                "readiness_score": 1.0,
                "ready": True,
                "missing_prerequisites": []
            }
        
        # Get mastery for each concept
        concept_mastery = []
        weighted_score = 0
        total_weight = 0
        
        for gc in goal_concepts:
            mastery = self.get_user_mastery(user_id, gc.concept_id)
            concept = self.db.query(models.Concept).filter(
                models.Concept.id == gc.concept_id
            ).first()
            
            if concept:
                concept_mastery.append({
                    "concept": concept.name,
                    "mastery": mastery.mastery_score,
                    "importance": gc.importance_weight
                })
                weighted_score += mastery.mastery_score * gc.importance_weight
                total_weight += gc.importance_weight
        
        readiness_score = weighted_score / total_weight if total_weight > 0 else 1.0
        
        # Identify missing prerequisites
        missing = [
            cm for cm in concept_mastery 
            if cm["mastery"] < 0.4 and cm["importance"] > 0.5
        ]
        
        return {
            "readiness_score": round(readiness_score, 2),
            "ready": readiness_score >= 0.6,
            "missing_prerequisites": missing,
            "concept_breakdown": concept_mastery
        }
    
    def adapt_roadmap_difficulty(self, user_id: int, goal_id: int) -> str:
        """
        Suggest overall roadmap difficulty based on user's concept mastery.
        
        Returns:
            Suggested difficulty: 'beginner', 'intermediate', or 'advanced'
        """
        mastery_data = self.get_concept_mastery_for_goal(user_id, goal_id)
        
        if not mastery_data:
            return "beginner"
        
        avg_mastery = sum(m["mastery_score"] for m in mastery_data) / len(mastery_data)
        
        if avg_mastery < 0.3:
            return "beginner"
        elif avg_mastery < 0.7:
            return "intermediate"
        else:
            return "advanced"
