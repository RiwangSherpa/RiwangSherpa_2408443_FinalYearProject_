"""
Pydantic schemas for request/response validation
Compatible with FastAPI >= 0.110 and Pydantic v2
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Literal

from pydantic import (
    BaseModel,
    Field,
    EmailStr,
    SecretStr,
    StringConstraints,
)
from typing_extensions import Annotated


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


class AIExplanationRequest(BaseModel):
    roadmap_step_id: int
    question: Optional[str] = None


class AIExplanationResponse(BaseModel):
    explanation: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    prompt_used: Optional[str] = None



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


class SubscriptionStatus(BaseModel):
    plan: str
    is_active: bool
    expires_at: Optional[datetime]


class PaymentRequest(BaseModel):
    plan: SubscriptionPlan
    payment_method: str = "demo"


class PaymentResponse(BaseModel):
    success: bool
    message: str
    subscription_status: SubscriptionStatus


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: Optional[str] = ""
    goal_id: Optional[int] = None
    tags: Optional[List[str]] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None
    tags: Optional[List[str]] = None


class NoteResponse(BaseModel):
    id: int
    user_id: int
    goal_id: Optional[int]
    title: str
    content: str
    tags: List[str]
    is_auto_generated: bool
    source_type: Optional[str]
    source_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteWithLinks(NoteResponse):
    outgoing_links: List[NoteResponse]
    incoming_links: List[NoteResponse]


class NoteGraphNode(BaseModel):
    id: int
    title: str
    tag_count: int


class NoteGraphEdge(BaseModel):
    source: int
    target: int


class NoteGraph(BaseModel):
    nodes: List[NoteGraphNode]
    edges: List[NoteGraphEdge]


class NoteSearchResult(BaseModel):
    note: NoteResponse
    relevance_score: float


class BacklinkInfo(BaseModel):
    id: int
    title: str
    preview: str


class BrainstormSessionCreate(BaseModel):
    title: Optional[str] = Field(default="Brainstorm Session", max_length=80)


class BrainstormSessionUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=80)


class BrainstormMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BrainstormFileResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    original_filename: str
    stored_filename: str
    file_type: str
    mime_type: str
    file_size: int
    upload_status: str
    created_at: datetime
    extracted_text_preview: Optional[str] = None
    chunk_count: int = 0

    model_config = {"from_attributes": True}


class BrainstormSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    file_count: int = 0

    model_config = {"from_attributes": True}


class BrainstormSessionDetailResponse(BrainstormSessionResponse):
    messages: List[BrainstormMessageResponse] = Field(default_factory=list)
    files: List[BrainstormFileResponse] = Field(default_factory=list)


class BrainstormUploadResponse(BaseModel):
    success: bool
    files: List[BrainstormFileResponse]


class BrainstormChatRequest(BaseModel):
    session_id: int
    message: str = Field(..., min_length=1, max_length=8000)
    file_ids: Optional[List[int]] = None
    response_length: Literal["short", "balanced", "detailed"] = "balanced"


class BrainstormChatResponse(BaseModel):
    success: bool
    session_id: int
    user_message: BrainstormMessageResponse
    ai_response: BrainstormMessageResponse


class BrainstormSummarizeRequest(BaseModel):
    session_id: int
    file_id: Optional[int] = None
    file_ids: Optional[List[int]] = None
    style: Literal["concise", "detailed", "bullets", "study_notes"] = "concise"
    response_length: Literal["short", "balanced", "detailed"] = "balanced"


class BrainstormGenerateRequest(BaseModel):
    session_id: int
    file_id: Optional[int] = None
    file_ids: Optional[List[int]] = None
    prompt: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    num_questions: int = Field(default=5, ge=1, le=15)
    response_length: Literal["short", "balanced", "detailed"] = "balanced"


class BrainstormArtifactResponse(BaseModel):
    success: bool
    session_id: int
    content: str
    ai_response: BrainstormMessageResponse


ArtifactSourceType = Literal["note", "brainstorm_session", "brainstorm_file", "manual"]


class MindmapNode(BaseModel):
    id: str
    title: str = Field(..., min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=260)
    category: Optional[str] = Field(default="concept", max_length=40)
    level: int = Field(default=0, ge=0, le=8)
    color: Optional[str] = Field(default=None, max_length=24)


class MindmapEdge(BaseModel):
    id: Optional[str] = None
    source: str
    target: str
    label: Optional[str] = Field(default=None, max_length=80)
    relation: Optional[str] = Field(default="related_to", max_length=40)


class MindmapGraph(BaseModel):
    nodes: List[MindmapNode] = Field(default_factory=list)
    edges: List[MindmapEdge] = Field(default_factory=list)


class MindmapGenerateRequest(BaseModel):
    source_type: ArtifactSourceType = "manual"
    source_id: Optional[int] = None
    title: Optional[str] = Field(default=None, max_length=160)
    content: Optional[str] = Field(default=None, max_length=20000)


class MindmapUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    graph_data: Optional[MindmapGraph] = None


class MindmapResponse(BaseModel):
    id: int
    user_id: int
    title: str
    source_type: Optional[str]
    source_id: Optional[int]
    graph_data: Dict[str, Any]
    summary: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FlashcardGenerateRequest(BaseModel):
    source_type: ArtifactSourceType = "manual"
    source_id: Optional[int] = None
    title: Optional[str] = Field(default=None, max_length=160)
    content: Optional[str] = Field(default=None, max_length=20000)
    count: int = Field(default=12, ge=4, le=30)


class FlashcardCreate(BaseModel):
    front: str = Field(..., min_length=1)
    back: str = Field(..., min_length=1)
    card_type: str = Field(default="concept", max_length=40)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    tags: List[str] = Field(default_factory=list)


class FlashcardResponse(BaseModel):
    id: int
    deck_id: int
    front: str
    back: str
    card_type: str
    difficulty: str
    tags: List[str]
    position: int
    review_state: str
    ease_factor: float
    interval_days: int
    due_at: Optional[datetime]
    last_reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FlashcardDeckCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    description: Optional[str] = None
    cards: List[FlashcardCreate] = Field(default_factory=list)


class FlashcardDeckResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    source_type: Optional[str]
    source_id: Optional[int]
    review_count: int
    created_at: datetime
    updated_at: datetime
    card_count: int = 0

    model_config = {"from_attributes": True}


class FlashcardDeckDetailResponse(FlashcardDeckResponse):
    cards: List[FlashcardResponse] = Field(default_factory=list)


class FlashcardReviewRequest(BaseModel):
    rating: Literal["again", "difficult", "known"]
