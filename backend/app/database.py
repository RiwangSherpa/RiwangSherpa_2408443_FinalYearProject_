"""
Database configuration and session management
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    from app.models import (
        User, Goal, RoadmapStep, Progress, QuizResult, 
        ProductivitySession, StudyStreak, PasswordResetToken,
        # New models for advanced features
        Flashcard, FlashcardReview,  # Spaced Repetition
        Concept, UserConceptMastery, ConceptPrerequisite, GoalConcept,  # Adaptive Learning
        ConversationSession, ConversationMessage,  # AI Tutor
        Achievement, UserAchievement, UserStats,  # Gamification
        KnowledgeNode, KnowledgeEdge,  # Knowledge Graph
        AIResponseCache  # AI Caching
    )
    Base.metadata.create_all(bind=engine)

