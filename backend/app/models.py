"""
SQLAlchemy database models
"""

from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class Goal(Base):
    """User learning goals"""
    __tablename__ = "goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    learning_style = Column(String(50), default="balanced")
    target_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_completed = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="goals")
    roadmap_steps = relationship("RoadmapStep", back_populates="goal", cascade="all, delete-orphan")
    progress_records = relationship("Progress", back_populates="goal", cascade="all, delete-orphan")
    quiz_results = relationship("QuizResult", back_populates="goal", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="goal", cascade="all, delete-orphan")

class RoadmapStep(Base):
    """Individual steps in a study roadmap"""
    __tablename__ = "roadmap_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    estimated_hours = Column(Float, default=0.0)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    ai_explanation = Column(Text, nullable=True)
    
    goal = relationship("Goal", back_populates="roadmap_steps")

class Progress(Base):
    """Progress tracking records"""
    __tablename__ = "progress"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    date = Column(DateTime, server_default=func.now())
    time_spent_minutes = Column(Float, default=0.0)
    steps_completed = Column(Integer, default=0)
    notes = Column(Text)
    
    goal = relationship("Goal", back_populates="progress_records")

class QuizResult(Base):
    """Quiz attempt results"""
    __tablename__ = "quiz_results"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    topic = Column(String(200), nullable=False)
    questions = Column(JSON)
    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    completed_at = Column(DateTime, server_default=func.now())
    
    goal = relationship("Goal", back_populates="quiz_results")

class ProductivitySession(Base):
    """Pomodoro and productivity sessions"""
    __tablename__ = "productivity_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_type = Column(String(50), default="pomodoro")
    duration_minutes = Column(Integer, nullable=False)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    was_completed = Column(Boolean, default=False)
    notes = Column(Text)
    
    user = relationship("User")

class StudyStreak(Base):
    """Daily study streak tracking"""
    __tablename__ = "study_streaks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    study_time_minutes = Column(Float, default=0.0)
    goals_worked_on = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="study_streaks")

class SubscriptionPlan(str, enum.Enum):
    """Subscription plan types"""
    FREE = "free"
    PRO = "pro"

class User(Base):
    """User accounts"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    subscription_plan = Column(SQLEnum(SubscriptionPlan), default=SubscriptionPlan.FREE)
    subscription_expires_at = Column(DateTime, nullable=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    provider = Column(String(20), default="local")
    avatar_url = Column(String(500), nullable=True)
    theme_preference = Column(String(20), nullable=True, default="light")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    study_streaks = relationship("StudyStreak", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    brainstorm_sessions = relationship("BrainstormSession", back_populates="user", cascade="all, delete-orphan")
    brainstorm_files = relationship("BrainstormFile", back_populates="user", cascade="all, delete-orphan")
    mindmaps = relationship("Mindmap", back_populates="user", cascade="all, delete-orphan")
    flashcard_decks = relationship("FlashcardDeck", back_populates="user", cascade="all, delete-orphan")

class PasswordResetToken(Base):
    """Password reset tokens"""
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="password_reset_tokens")


class UserDailyUsage(Base):
    """Track daily feature usage for free tier limits"""
    __tablename__ = "user_daily_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    feature = Column(String(50), nullable=False)
    date = Column(DateTime, nullable=False)
    count = Column(Integer, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())



class Concept(Base):
    """Learning concepts/knowledge nodes for adaptive learning"""
    __tablename__ = "concepts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    domain = Column(String(100), nullable=True)
    difficulty_level = Column(Integer, default=1)
    
    created_at = Column(DateTime, server_default=func.now())


class UserConceptMastery(Base):
    """Track user's mastery level of individual concepts"""
    __tablename__ = "user_concept_mastery"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    
    mastery_score = Column(Float, default=0.0)
    confidence = Column(Float, default=0.1)
    
    attempts_count = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    
    last_attempt_at = Column(DateTime, nullable=True)
    
    suggested_difficulty = Column(String(20), default="easy")
    
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())


class ConceptPrerequisite(Base):
    """Prerequisite relationships between concepts (knowledge graph edges)"""
    __tablename__ = "concept_prerequisites"
    
    id = Column(Integer, primary_key=True, index=True)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    prerequisite_concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    strength = Column(Float, default=1.0)
    
    created_at = Column(DateTime, server_default=func.now())


class GoalConcept(Base):
    """Link goals to required concepts"""
    __tablename__ = "goal_concepts"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    importance_weight = Column(Float, default=1.0)
    
    created_at = Column(DateTime, server_default=func.now())



class ConversationSession(Base):
    """AI tutoring conversation sessions"""
    __tablename__ = "conversation_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    step_id = Column(Integer, ForeignKey("roadmap_steps.id"), nullable=True)
    
    title = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    
    context_summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    messages = relationship("ConversationMessage", back_populates="session", cascade="all, delete-orphan", order_by="ConversationMessage.created_at")


class ConversationMessage(Base):
    """Individual messages in conversations"""
    __tablename__ = "conversation_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("conversation_sessions.id"), nullable=False)
    
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    
    model_used = Column(String(50), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    
    was_helpful = Column(Boolean, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    session = relationship("ConversationSession", back_populates="messages")


class BrainstormSession(Base):
    """Multimodal brainstorming workspace session."""
    __tablename__ = "brainstorm_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(80), nullable=False, default="Brainstorm Session")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="brainstorm_sessions")
    messages = relationship(
        "BrainstormMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="BrainstormMessage.created_at",
    )
    files = relationship(
        "BrainstormFile",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="BrainstormFile.created_at.desc()",
    )


class BrainstormMessage(Base):
    """Individual chat messages inside a Brainstorm session."""
    __tablename__ = "brainstorm_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("brainstorm_sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("BrainstormSession", back_populates="messages")


class BrainstormFile(Base):
    """Uploaded files attached to a Brainstorm session."""
    __tablename__ = "brainstorm_files"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("brainstorm_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    mime_type = Column(String(120), nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String(1000), nullable=False)

    extracted_text = Column(Text, nullable=True)
    upload_status = Column(String(30), default="processing", nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("BrainstormSession", back_populates="files")
    user = relationship("User", back_populates="brainstorm_files")
    chunks = relationship(
        "BrainstormChunk",
        back_populates="file",
        cascade="all, delete-orphan",
        order_by="BrainstormChunk.chunk_index",
    )


class BrainstormChunk(Base):
    """Text chunk prepared for future retrieval and vector search."""
    __tablename__ = "brainstorm_chunks"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("brainstorm_files.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    chunk_summary = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    file = relationship("BrainstormFile", back_populates="chunks")



class Achievement(Base):
    """Achievement definitions"""
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    icon = Column(String(50), nullable=True)
    
    trigger_condition = Column(JSON, nullable=False)
    
    xp_reward = Column(Integer, default=0)
    
    category = Column(String(50), default="general")
    difficulty = Column(String(20), default="bronze")
    
    is_hidden = Column(Boolean, default=False)
    
    created_at = Column(DateTime, server_default=func.now())


class UserAchievement(Base):
    """User's earned achievements"""
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    
    earned_at = Column(DateTime, server_default=func.now())
    
    achievement = relationship("Achievement")


class UserStats(Base):
    """Aggregated user statistics for gamification"""
    __tablename__ = "user_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    total_xp = Column(Integer, default=0)
    current_level = Column(Integer, default=1)
    
    total_study_sessions = Column(Integer, default=0)
    total_study_hours = Column(Float, default=0.0)
    
    total_quizzes_taken = Column(Integer, default=0)
    total_questions_answered = Column(Integer, default=0)
    perfect_quiz_count = Column(Integer, default=0)
    
    longest_streak = Column(Integer, default=0)
    
    goals_completed = Column(Integer, default=0)
    roadmap_steps_completed = Column(Integer, default=0)
    
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())



class KnowledgeNode(Base):
    """Nodes in the knowledge graph"""
    __tablename__ = "knowledge_nodes"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    
    label = Column(String(200), nullable=False)
    node_type = Column(String(50), default="concept")
    description = Column(Text, nullable=True)
    
    x_position = Column(Float, nullable=True)
    y_position = Column(Float, nullable=True)
    color = Column(String(7), nullable=True)
    
    mastery_level = Column(Float, default=0.0)
    is_unlocked = Column(Boolean, default=False)
    
    created_at = Column(DateTime, server_default=func.now())


class KnowledgeEdge(Base):
    """Edges connecting knowledge nodes"""
    __tablename__ = "knowledge_edges"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    
    source_node_id = Column(Integer, ForeignKey("knowledge_nodes.id"), nullable=False)
    target_node_id = Column(Integer, ForeignKey("knowledge_nodes.id"), nullable=False)
    
    edge_type = Column(String(50), default="prerequisite")
    strength = Column(Float, default=1.0)
    
    created_at = Column(DateTime, server_default=func.now())



class Note(Base):
    """Obsidian-style notes with bidirectional linking"""
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)

    title = Column(String(200), nullable=False)
    content = Column(Text, default="")
    tags = Column(JSON, default=list)

    is_auto_generated = Column(Boolean, default=False)
    source_type = Column(String(50), nullable=True)
    source_id = Column(Integer, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="notes")
    goal = relationship("Goal", back_populates="notes")
    outgoing_links = relationship("NoteLink", foreign_keys="NoteLink.source_note_id", back_populates="source_note", cascade="all, delete-orphan")
    incoming_links = relationship("NoteLink", foreign_keys="NoteLink.target_note_id", back_populates="target_note", cascade="all, delete-orphan")


class NoteLink(Base):
    """Bidirectional links between notes"""
    __tablename__ = "note_links"

    id = Column(Integer, primary_key=True, index=True)
    source_note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    target_note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    source_note = relationship("Note", foreign_keys=[source_note_id], back_populates="outgoing_links")
    target_note = relationship("Note", foreign_keys=[target_note_id], back_populates="incoming_links")


class Mindmap(Base):
    """AI-generated concept graph from notes, brainstorms, or uploaded context."""
    __tablename__ = "mindmaps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(160), nullable=False)
    source_type = Column(String(50), nullable=True)
    source_id = Column(Integer, nullable=True)
    graph_data = Column(JSON, nullable=False, default=dict)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="mindmaps")


class FlashcardDeck(Base):
    """A persistent deck of active-recall flashcards."""
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(160), nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String(50), nullable=True)
    source_id = Column(Integer, nullable=True)
    review_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="flashcard_decks")
    cards = relationship(
        "Flashcard",
        back_populates="deck",
        cascade="all, delete-orphan",
        order_by="Flashcard.position",
    )


class Flashcard(Base):
    """Single recall prompt inside a flashcard deck."""
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id"), nullable=False)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    card_type = Column(String(40), default="concept")
    difficulty = Column(String(20), default="medium")
    tags = Column(JSON, default=list)
    position = Column(Integer, default=0)
    review_state = Column(String(30), default="new")
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=0)
    due_at = Column(DateTime, nullable=True)
    last_reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    deck = relationship("FlashcardDeck", back_populates="cards")


class AIResponseCache(Base):
    """Cache AI responses to reduce API calls"""
    __tablename__ = "ai_response_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(255), nullable=False, index=True)
    prompt_hash = Column(String(64), nullable=False)
    
    response_type = Column(String(50), nullable=False)
    response_data = Column(JSON, nullable=False)
    
    model_used = Column(String(50), nullable=False)
    tokens_used = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)
    access_count = Column(Integer, default=1)
    last_accessed_at = Column(DateTime, server_default=func.now())




