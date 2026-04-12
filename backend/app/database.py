"""
Database configuration and session management
"""

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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
        if "google_id" not in existing_cols:
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users(google_id)"))
            conn.commit()


def _run_hashed_password_nullable_migration():
    """
    Make hashed_password nullable to support Google OAuth users who have no password.
    SQLite doesn't support ALTER COLUMN, so we recreate the table.
    """
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    cols_info = {c["name"]: c for c in inspector.get_columns("users")}
    if "hashed_password" not in cols_info:
        return
    if cols_info["hashed_password"].get("nullable", True):
        return
    with engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        conn.execute(text("""
            CREATE TABLE users_new (
                id INTEGER NOT NULL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                hashed_password VARCHAR(255),
                full_name VARCHAR(255),
                is_active BOOLEAN DEFAULT 1,
                is_verified BOOLEAN DEFAULT 0,
                subscription_plan VARCHAR(10) DEFAULT 'free',
                subscription_expires_at DATETIME,
                google_id VARCHAR(255),
                provider VARCHAR(20) DEFAULT 'local',
                avatar_url VARCHAR(500),
                theme_preference VARCHAR(20) DEFAULT 'light',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("""
            INSERT INTO users_new (id, email, hashed_password, full_name, is_active,
                is_verified, subscription_plan, subscription_expires_at, google_id, provider,
                avatar_url, theme_preference, created_at, updated_at)
            SELECT id, email, hashed_password, full_name, is_active, is_verified,
                subscription_plan, subscription_expires_at, google_id, provider,
                avatar_url, theme_preference, created_at, updated_at FROM users
        """))
        conn.execute(text("DROP TABLE users"))
        conn.execute(text("ALTER TABLE users_new RENAME TO users"))
        conn.execute(text("PRAGMA foreign_keys=ON"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email)"))
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
        UserDailyUsage,
        Concept, UserConceptMastery, ConceptPrerequisite, GoalConcept,
        ConversationSession, ConversationMessage,
        Achievement, UserAchievement, UserStats,
        KnowledgeNode, KnowledgeEdge,
        AIResponseCache
    )
    Base.metadata.create_all(bind=engine)
    _run_user_oauth_migration()
    _run_hashed_password_nullable_migration()

