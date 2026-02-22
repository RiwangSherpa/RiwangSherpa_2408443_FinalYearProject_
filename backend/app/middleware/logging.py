"""
Structured logging middleware with request tracing
"""

import uuid
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests with correlation IDs"""
    
    async def dispatch(self, request: Request, call_next):
        # Generate correlation ID
        request_id = str(uuid.uuid4())[:12]
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request {request_id}: {request.method} {request.url.path} - "
            f"Client: {request.client.host if request.client else 'unknown'}"
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = (time.time() - start_time) * 1000
            
            # Log response
            logger.info(
                f"Request {request_id}: Completed {response.status_code} in {duration:.2f}ms"
            )
            
            # Add correlation ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(
                f"Request {request_id}: Failed after {duration:.2f}ms - {str(e)}",
                exc_info=True
            )
            raise


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor API performance and track metrics"""
    
    def __init__(self, app):
        super().__init__(app)
        self.request_times = []
        self.max_samples = 1000
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # Track timing
        duration = (time.time() - start_time) * 1000
        self.request_times.append({
            'path': request.url.path,
            'method': request.method,
            'duration_ms': duration,
            'status_code': response.status_code
        })
        
        # Keep only recent samples
        if len(self.request_times) > self.max_samples:
            self.request_times = self.request_times[-self.max_samples:]
        
        # Log slow requests
        if duration > 1000:  # 1 second
            logger.warning(
                f"Slow request detected: {request.method} {request.url.path} "
                f"took {duration:.2f}ms"
            )
        
        # Add performance headers
        response.headers["X-Response-Time"] = f"{duration:.2f}ms"
        
        return response
    
    def get_average_response_time(self, path: str = None) -> float:
        """Get average response time for all or specific path"""
        if not self.request_times:
            return 0.0
        
        if path:
            times = [r['duration_ms'] for r in self.request_times if r['path'] == path]
        else:
            times = [r['duration_ms'] for r in self.request_times]
        
        return sum(times) / len(times) if times else 0.0
    
    def get_error_rate(self) -> float:
        """Get error rate percentage"""
        if not self.request_times:
            return 0.0
        
        error_count = sum(1 for r in self.request_times if r['status_code'] >= 400)
        return (error_count / len(self.request_times)) * 100


def get_request_logger(request: Request) -> logging.LoggerAdapter:
    """
    Get a logger with request context
    """
    request_id = getattr(request.state, 'request_id', 'unknown')
    extra = {'request_id': request_id}
    return logging.LoggerAdapter(logger, extra)
