"""
Rate limiting middleware using token bucket algorithm
"""

import time
import logging
from typing import Dict, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)


class RateLimitBucket:
    """Token bucket for rate limiting"""
    
    def __init__(self, tokens: int, refill_rate: float):
        self.tokens = float(tokens)
        self.max_tokens = float(tokens)
        self.refill_rate = refill_rate
        self.last_refill = time.time()
    
    def consume(self, tokens: float = 1.0) -> bool:
        """Try to consume tokens, return True if successful"""
        self._refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def _refill(self):
        """Refill tokens based on elapsed time"""
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.max_tokens, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware with different limits per endpoint"""
    
    def __init__(self, app):
        super().__init__(app)
        self.general_buckets: Dict[str, RateLimitBucket] = {}
        self.ai_buckets: Dict[str, RateLimitBucket] = {}
        
        self.general_limit = settings.RATE_LIMIT_REQUESTS_PER_MINUTE
        self.ai_limit = settings.RATE_LIMIT_AI_REQUESTS_PER_HOUR
        self.ai_limit_free = settings.RATE_LIMIT_AI_REQUESTS_PER_HOUR_FREE
    
    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/api/health":
            return await call_next(request)
        
        client_id = await self._get_client_id(request)
        
        is_ai_endpoint = self._is_ai_endpoint(request)
        
        if is_ai_endpoint:
            allowed = self._check_ai_rate_limit(client_id)
            limit = self.ai_limit
        else:
            allowed = self._check_general_rate_limit(client_id)
            limit = self.general_limit
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for client: {client_id}, path: {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": 60 if is_ai_endpoint else 1
                },
                headers={"Retry-After": "60" if is_ai_endpoint else "1"}
            )
        
        response: Response = await call_next(request)
        
        bucket = self.ai_buckets.get(client_id) if is_ai_endpoint else self.general_buckets.get(client_id)
        if bucket:
            remaining = int(bucket.tokens)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Limit"] = str(limit)
        
        return response
    
    async def _get_client_id(self, request: Request) -> str:
        """Get client identifier from token or IP"""
        try:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                return f"token_{hash(token) % 1000000}"
        except:
            pass
        
        client_host = request.client.host if request.client else "unknown"
        return f"ip_{client_host}"
    
    def _is_ai_endpoint(self, request: Request) -> bool:
        """Check if request is to an AI endpoint"""
        ai_paths = ["/api/roadmaps/generate", "/api/quizzes/generate", "/api/ai/explain"]
        return any(request.url.path.startswith(path) for path in ai_paths)
    
    def _check_general_rate_limit(self, client_id: str) -> bool:
        """Check general API rate limit (per minute)"""
        if client_id not in self.general_buckets:
            self.general_buckets[client_id] = RateLimitBucket(
                tokens=self.general_limit,
                refill_rate=self.general_limit / 60.0
            )
        return self.general_buckets[client_id].consume(1.0)
    
    def _check_ai_rate_limit(self, client_id: str) -> bool:
        """Check AI endpoint rate limit (per hour)"""
        if client_id not in self.ai_buckets:
            self.ai_buckets[client_id] = RateLimitBucket(
                tokens=self.ai_limit,
                refill_rate=self.ai_limit / 3600.0
            )
        return self.ai_buckets[client_id].consume(1.0)
