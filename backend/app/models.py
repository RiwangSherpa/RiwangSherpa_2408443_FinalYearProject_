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
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    subscription_plan = Column(SQLEnum(SubscriptionPlan), default=SubscriptionPlan.FREE)
    subscription_expires_at = Column(DateTime, nullable=True)
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

