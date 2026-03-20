"""
Database configuration and session management
"""

from sqlalchemy import create_engine, inspect, text
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


def _run_user_oauth_migration():
    """
    Add OAuth columns to users table if they don't exist.
    Required for Google Sign-In - the table may have been created before OAuth was added.
    """
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    existing_cols = {c["name"] for c in inspector.get_columns("users")}
    migrations = []
    if "google_id" not in existing_cols:
        migrations.append("ADD COLUMN google_id VARCHAR(255)")
    if "provider" not in existing_cols:
        migrations.append("ADD COLUMN provider VARCHAR(20) DEFAULT 'local'")
    if "avatar_url" not in existing_cols:
        migrations.append("ADD COLUMN avatar_url VARCHAR(500)")
    if not migrations:
        return
    with engine.connect() as conn:
        for stmt in migrations:
            conn.execute(text(f"ALTER TABLE users {stmt}"))
        conn.commit()
        # Create unique index on google_id if column was just added
        if "google_id" not in existing_cols:
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users(google_id)"))
            conn.commit()


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
        UserDailyUsage,  # For tracking free tier limits
        # New models for advanced features
        Concept, UserConceptMastery, ConceptPrerequisite, GoalConcept,  # Adaptive Learning
        ConversationSession, ConversationMessage,  # AI Tutor
        Achievement, UserAchievement, UserStats,  # Gamification
        KnowledgeNode, KnowledgeEdge,  # Knowledge Graph
        AIResponseCache  # AI Caching
    )
    Base.metadata.create_all(bind=engine)
    _run_user_oauth_migration()

