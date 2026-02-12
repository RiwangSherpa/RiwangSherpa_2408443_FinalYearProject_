
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import (
    auth,
    subscriptions,
    users,
    analytics,
    progress,
    goals,
    quizzes,
    roadmaps,
    productivity,
)

app = FastAPI(
    title="Study Buddy API",
    description="AI-Powered Virtual Study Buddy Backend",
    version="1.0.0",
)

# Initialize database
init_db()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(quizzes.router, prefix="/api/quizzes", tags=["quizzes"])
app.include_router(roadmaps.router, prefix="/api/roadmaps", tags=["roadmaps"])
app.include_router(productivity.router, prefix="/api/productivity", tags=["productivity"])


@app.get("/")
async def root():
    return {
        "message": "AI-Powered Virtual Study Buddy API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

