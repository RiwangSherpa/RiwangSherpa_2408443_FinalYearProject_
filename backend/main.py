
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
from app.middleware.error_handler import setup_exception_handlers
from app.services.providers.provider_factory import get_ai_provider

from app.database import init_db
from app.routers import (
    auth,
    google_auth,
    subscriptions,
    users,
    analytics,
    progress,
    goals,
    quizzes,
    roadmaps,
    productivity,
    adaptive_learning,
    tutor,
    gamification,
    knowledge_graph,
    predictions,
    notes,
    brainstorm,
    mindmaps,
    flashcards,
)

app = FastAPI(
    title="Study Buddy API",
    description="AI-Powered Virtual Study Buddy Backend",
    version="1.0.0",
)

# Setup exception handlers
setup_exception_handlers(app)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting middleware (must be after security, before CORS)
# DISABLED FOR DEVELOPMENT - Re-enable for production
# app.add_middleware(RateLimitMiddleware)

# Initialize database
init_db()

# CORS middleware - restrictive for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    max_age=3600,
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(google_auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(quizzes.router, prefix="/api/quizzes", tags=["quizzes"])
app.include_router(roadmaps.router, prefix="/api/roadmaps", tags=["roadmaps"])
app.include_router(productivity.router, prefix="/api/productivity", tags=["productivity"])

# New feature routers
app.include_router(adaptive_learning.router)  # Adaptive Learning
app.include_router(tutor.router)  # AI Tutor
app.include_router(gamification.router)  # Gamification
app.include_router(knowledge_graph.router)  # Knowledge Graph
app.include_router(predictions.router)  # Predictive Analytics
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])  # Obsidian-style Notes
app.include_router(brainstorm.router)  # Multimodal Brainstorm workspace
app.include_router(mindmaps.router)
app.include_router(flashcards.router)


@app.get("/")
async def root():
    return {
        "message": "AI-Powered Virtual Study Buddy API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/api/health")
async def health_check():
    """Comprehensive health check endpoint"""
    # Check database
    db_status = "healthy"
    try:
        from app.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check AI service
    ai_available = False
    ai_status = "unavailable"
    provider_name = settings.AI_PROVIDER
    model_name = settings.AI_MODEL
    provider_base_url = None
    try:
        provider = get_ai_provider()
        provider_name = provider.name
        model_name = provider.model
        provider_base_url = getattr(provider, "base_url", None)
        ai_available = await provider.health_check()
        ai_status = "healthy" if ai_available else "unavailable"
    except Exception as e:
        ai_status = f"unavailable: {str(e)}"
    
    overall_status = "healthy" if db_status == "healthy" and ai_available else "degraded"
    
    return {
        "status": overall_status,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": db_status,
            "ai_service": {
                "status": ai_status,
                "provider": provider_name,
                "model": model_name,
                "base_url": provider_base_url,
                "available": ai_available
            }
        }
    }

