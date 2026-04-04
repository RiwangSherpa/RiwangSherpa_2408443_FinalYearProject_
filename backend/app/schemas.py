"""
Pydantic schemas for request/response validation
Compatible with FastAPI >= 0.110 and Pydantic v2
"""

from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import (
    BaseModel,
    Field,
    EmailStr,
    SecretStr,
    StringConstraints,
)
from typing_extensions import Annotated

# -------------------------------------------------
# Common constrained types (Pydantic v2 style)
# -------------------------------------------------

LearningStyle = Annotated[
    str,
    StringConstraints(pattern="^(visual|text|practice|balanced)$")
]

DifficultyLevel = Annotated[
    str,
    StringConstraints(pattern="^(easy|medium|hard)$")
]

SessionType = Annotated[
    str,
    StringConstraints(pattern="^(pomodoro|break|focus)$")
]

SubscriptionPlan = Annotated[
    str,
    StringConstraints(pattern="^(free|pro)$")
]

# -------------------------------------------------
# Goal Schemas
# -------------------------------------------------

class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    learning_style: LearningStyle = "balanced"
    target_date: Optional[datetime] = None


class GoalResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    learning_style: str
    target_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    is_completed: bool

    model_config = {"from_attributes": True}


# -------------------------------------------------
# Roadmap Schemas
# -------------------------------------------------

class RoadmapStepCreate(BaseModel):
    step_number: int
    title: str
    description: str
    estimated_hours: float = Field(default=0.0, ge=0.0)
    ai_explanation: Optional[str] = None


class RoadmapStepResponse(BaseModel):
    id: int
    goal_id: int
    step_number: int
    title: str
    description: str
    estimated_hours: float
    is_completed: bool
    completed_at: Optional[datetime]
    ai_explanation: Optional[str]

    model_config = {"from_attributes": True}


# Batch response schema - defined after RoadmapStepResponse
class GoalWithRoadmapResponse(BaseModel):
    goal: GoalResponse
    roadmap: List[RoadmapStepResponse]

    model_config = {"from_attributes": True}


class RoadmapGenerateRequest(BaseModel):
    goal_id: int
    num_steps: int = Field(default=10, ge=5, le=20)


class RoadmapGenerateResponse(BaseModel):
    success: bool
    steps: List[RoadmapStepResponse]
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    prompt_used: Optional[str] = None

# -------------------------------------------------
# Quiz Schemas
# -------------------------------------------------

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int
    explanation: Optional[str] = None


class QuizGenerateRequest(BaseModel):
    goal_id: int
    topic: str
    num_questions: int = Field(default=3, ge=1, le=10)
    difficulty: DifficultyLevel = "medium"


class QuizGenerateResponse(BaseModel):
    success: bool
    questions: List[QuizQuestion]
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    prompt_used: Optional[str] = None


class QuizSubmitRequest(BaseModel):
    quiz_id: Optional[int] = None
    answers: List[int]


class QuizSubmitResponse(BaseModel):
    score: float
    correct_answers: int
    total_questions: int
    feedback: List[Dict[str, Any]]

# -------------------------------------------------
# Progress Schemas
# -------------------------------------------------

class ProgressCreate(BaseModel):
    goal_id: int
    time_spent_minutes: float = Field(default=0.0, ge=0.0)
    steps_completed: int = Field(default=0, ge=0)
    notes: Optional[str] = None


class ProgressResponse(BaseModel):
    id: int
    goal_id: int
    date: datetime
    time_spent_minutes: float
    steps_completed: int
    notes: Optional[str]

    model_config = {"from_attributes": True}

# -------------------------------------------------
# Productivity Schemas
# -------------------------------------------------

class ProductivitySessionCreate(BaseModel):
    session_type: SessionType = "pomodoro"
    duration_minutes: int = Field(..., ge=1, le=120)


class ProductivitySessionResponse(BaseModel):
    id: int
    session_type: str
    duration_minutes: int
    started_at: datetime
    completed_at: Optional[datetime]
    was_completed: bool

    model_config = {"from_attributes": True}

# -------------------------------------------------
# AI Explanation Schemas
# -------------------------------------------------

class AIExplanationRequest(BaseModel):
    roadmap_step_id: int
    question: Optional[str] = None


class AIExplanationResponse(BaseModel):
    explanation: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    prompt_used: Optional[str] = None


# -------------------------------------------------
# Analytics Schemas
# -------------------------------------------------

class AnalyticsResponse(BaseModel):
    total_study_time_minutes: float
    total_goals: int
    completed_goals: int
    current_streak_days: int
    average_quiz_score: float
    total_quizzes: int
    best_quiz_score: float
    weak_topics: List[str]
    strong_topics: List[str]

class UserRegister(BaseModel):
    email: EmailStr
    password: SecretStr
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: SecretStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    is_active: bool
    subscription_plan: str
    subscription_expires_at: Optional[datetime]
    provider: str = "local"
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: SecretStr


class PasswordResetResponse(BaseModel):
    message: str

# -------------------------------------------------
# Subscription Schemas
# -------------------------------------------------

class SubscriptionStatus(BaseModel):
    plan: str  # Changed from SubscriptionPlan to str to match .value output
    is_active: bool
    expires_at: Optional[datetime]


class PaymentRequest(BaseModel):
    plan: SubscriptionPlan
    payment_method: str = "demo"


class PaymentResponse(BaseModel):
    success: bool
    message: str
    subscription_status: SubscriptionStatus
