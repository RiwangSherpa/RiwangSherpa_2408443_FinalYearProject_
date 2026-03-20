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
    learning_style = Column(String(50), default="balanced")  # visual, text, practice, balanced
    target_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_completed = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="goals")
    roadmap_steps = relationship("RoadmapStep", back_populates="goal", cascade="all, delete-orphan")
    progress_records = relationship("Progress", back_populates="goal", cascade="all, delete-orphan")
    quiz_results = relationship("QuizResult", back_populates="goal", cascade="all, delete-orphan")

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
    
    # AI explanation
    ai_explanation = Column(Text, nullable=True)
    
    # Relationships
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
    
    # Relationships
    goal = relationship("Goal", back_populates="progress_records")

class QuizResult(Base):
    """Quiz attempt results"""
    __tablename__ = "quiz_results"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    topic = Column(String(200), nullable=False)
    questions = Column(JSON)  # Store questions and answers
    score = Column(Float, nullable=False)  # Percentage
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    completed_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    goal = relationship("Goal", back_populates="quiz_results")

class ProductivitySession(Base):
    """Pomodoro and productivity sessions"""
    __tablename__ = "productivity_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_type = Column(String(50), default="pomodoro")  # pomodoro, break, focus
    duration_minutes = Column(Integer, nullable=False)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    was_completed = Column(Boolean, default=False)
    notes = Column(Text)
    
    # Relationships
    user = relationship("User")

class StudyStreak(Base):
    """Daily study streak tracking"""
    __tablename__ = "study_streaks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    study_time_minutes = Column(Float, default=0.0)
    goals_worked_on = Column(JSON)  # List of goal IDs
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
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
    hashed_password = Column(String(255), nullable=True)  # Nullable for Google OAuth users
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    subscription_plan = Column(SQLEnum(SubscriptionPlan), default=SubscriptionPlan.FREE)
    subscription_expires_at = Column(DateTime, nullable=True)
    # OAuth fields
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    provider = Column(String(20), default="local")  # "local" | "google"
    avatar_url = Column(String(500), nullable=True)
    # UI preferences
    theme_preference = Column(String(20), nullable=True, default="light")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    study_streaks = relationship("StudyStreak", back_populates="user", cascade="all, delete-orphan")

class PasswordResetToken(Base):
    """Password reset tokens"""
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")


class UserDailyUsage(Base):
    """Track daily feature usage for free tier limits"""
    __tablename__ = "user_daily_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    feature = Column(String(50), nullable=False)  # "quiz", "explanation", etc.
    date = Column(DateTime, nullable=False)  # Date of usage
    count = Column(Integer, default=0)  # Number of uses today
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ============================================================================
# ADAPTIVE LEARNING & KNOWLEDGE TRACKING MODELS
# ============================================================================

class Concept(Base):
    """Learning concepts/knowledge nodes for adaptive learning"""
    __tablename__ = "concepts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    domain = Column(String(100), nullable=True)  # e.g., "Python", "Mathematics"
    difficulty_level = Column(Integer, default=1)  # 1-10
    
    created_at = Column(DateTime, server_default=func.now())


class UserConceptMastery(Base):
    """Track user's mastery level of individual concepts"""
    __tablename__ = "user_concept_mastery"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    
    # Mastery tracking (0-100%)
    mastery_score = Column(Float, default=0.0)  # Bayesian estimate
    confidence = Column(Float, default=0.1)  # Confidence in estimate
    
    # Performance history
    attempts_count = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    
    # Last interaction
    last_attempt_at = Column(DateTime, nullable=True)
    
    # Adaptive difficulty tracking
    suggested_difficulty = Column(String(20), default="easy")  # easy, medium, hard
    
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())


class ConceptPrerequisite(Base):
    """Prerequisite relationships between concepts (knowledge graph edges)"""
    __tablename__ = "concept_prerequisites"
    
    id = Column(Integer, primary_key=True, index=True)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    prerequisite_concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    strength = Column(Float, default=1.0)  # How strong the prerequisite relationship is
    
    created_at = Column(DateTime, server_default=func.now())


class GoalConcept(Base):
    """Link goals to required concepts"""
    __tablename__ = "goal_concepts"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    importance_weight = Column(Float, default=1.0)  # How important this concept is for the goal
    
    created_at = Column(DateTime, server_default=func.now())


# ============================================================================
# AI CONVERSATION MODELS
# ============================================================================

class ConversationSession(Base):
    """AI tutoring conversation sessions"""
    __tablename__ = "conversation_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    step_id = Column(Integer, ForeignKey("roadmap_steps.id"), nullable=True)
    
    # Session metadata
    title = Column(String(200), nullable=True)  # Auto-generated or user-set
    is_active = Column(Boolean, default=True)
    
    # Context summary for long conversations (to manage token limits)
    context_summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    messages = relationship("ConversationMessage", back_populates="session", cascade="all, delete-orphan", order_by="ConversationMessage.created_at")


class ConversationMessage(Base):
    """Individual messages in conversations"""
    __tablename__ = "conversation_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("conversation_sessions.id"), nullable=False)
    
    # Message content
    role = Column(String(20), nullable=False)  # "user", "assistant", "system"
    content = Column(Text, nullable=False)
    
    # AI metadata
    model_used = Column(String(50), nullable=True)  # Which model generated this
    tokens_used = Column(Integer, nullable=True)  # Token count if available
    
    # User feedback
    was_helpful = Column(Boolean, nullable=True)  # User rating
    
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    session = relationship("ConversationSession", back_populates="messages")


# ============================================================================
# GAMIFICATION & ACHIEVEMENT MODELS
# ============================================================================

class Achievement(Base):
    """Achievement definitions"""
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    icon = Column(String(50), nullable=True)  # Icon identifier
    
    # Trigger conditions (stored as JSON for flexibility)
    trigger_condition = Column(JSON, nullable=False)  # e.g., {"type": "quiz_score", "threshold": 100}
    
    # Rewards
    xp_reward = Column(Integer, default=0)
    
    # Category
    category = Column(String(50), default="general")  # study, quiz, streak, etc.
    difficulty = Column(String(20), default="bronze")  # bronze, silver, gold, platinum
    
    is_hidden = Column(Boolean, default=False)  # Secret achievements
    
    created_at = Column(DateTime, server_default=func.now())


class UserAchievement(Base):
    """User's earned achievements"""
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    
    earned_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    achievement = relationship("Achievement")


class UserStats(Base):
    """Aggregated user statistics for gamification"""
    __tablename__ = "user_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # XP and Level
    total_xp = Column(Integer, default=0)
    current_level = Column(Integer, default=1)
    
    # Study statistics
    total_study_sessions = Column(Integer, default=0)
    total_study_hours = Column(Float, default=0.0)
    
    # Quiz statistics
    total_quizzes_taken = Column(Integer, default=0)
    total_questions_answered = Column(Integer, default=0)
    perfect_quiz_count = Column(Integer, default=0)
    
    # Streak tracking
    longest_streak = Column(Integer, default=0)
    
    # Goal statistics
    goals_completed = Column(Integer, default=0)
    roadmap_steps_completed = Column(Integer, default=0)
    
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())


# ============================================================================
# KNOWLEDGE GRAPH MODELS
# ============================================================================

class KnowledgeNode(Base):
    """Nodes in the knowledge graph"""
    __tablename__ = "knowledge_nodes"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    
    # Node content
    label = Column(String(200), nullable=False)
    node_type = Column(String(50), default="concept")  # concept, skill, resource
    description = Column(Text, nullable=True)
    
    # Visual properties
    x_position = Column(Float, nullable=True)
    y_position = Column(Float, nullable=True)
    color = Column(String(7), nullable=True)  # Hex color
    
    # Learning state
    mastery_level = Column(Float, default=0.0)  # 0-1
    is_unlocked = Column(Boolean, default=False)  # Prerequisites met?
    
    created_at = Column(DateTime, server_default=func.now())


class KnowledgeEdge(Base):
    """Edges connecting knowledge nodes"""
    __tablename__ = "knowledge_edges"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    
    source_node_id = Column(Integer, ForeignKey("knowledge_nodes.id"), nullable=False)
    target_node_id = Column(Integer, ForeignKey("knowledge_nodes.id"), nullable=False)
    
    edge_type = Column(String(50), default="prerequisite")  # prerequisite, related, sequence
    strength = Column(Float, default=1.0)  # 0-1 edge strength
    
    created_at = Column(DateTime, server_default=func.now())


# ============================================================================
# AI RESPONSE CACHE & VALIDATION
# ============================================================================

class AIResponseCache(Base):
    """Cache AI responses to reduce API calls"""
    __tablename__ = "ai_response_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(255), nullable=False, index=True)  # Hash of prompt
    prompt_hash = Column(String(64), nullable=False)  # SHA256 of full prompt
    
    # Response data
    response_type = Column(String(50), nullable=False)  # roadmap, quiz, explanation
    response_data = Column(JSON, nullable=False)
    
    # Metadata
    model_used = Column(String(50), nullable=False)
    tokens_used = Column(Integer, nullable=True)
    
    # Cache management
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)  # Optional expiration
    access_count = Column(Integer, default=1)
    last_accessed_at = Column(DateTime, server_default=func.now())


# ============================================================================


