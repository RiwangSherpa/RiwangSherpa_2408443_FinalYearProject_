
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
from app.middleware.error_handler import setup_exception_handlers

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
app.add_middleware(RateLimitMiddleware)

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
    import requests
    
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
    ai_status = "healthy"
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code != 200:
            ai_status = "unavailable"
    except:
        ai_status = "unavailable"
    
    overall_status = "healthy" if db_status == "healthy" else "degraded"
    
    return {
        "status": overall_status,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": db_status,
            "ai_service": ai_status
        }
    }

