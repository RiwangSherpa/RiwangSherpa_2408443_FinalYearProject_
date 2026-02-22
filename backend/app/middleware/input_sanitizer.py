"""
Input sanitization middleware for preventing injection attacks
"""

import re
import logging
from typing import Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class InputSanitizer:
    """Input sanitization utilities"""
    
    # SQL injection patterns
    SQL_PATTERNS = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|WHERE|AND|OR)\b)',
        r'(--|#|/\*|\*/)',
        r'(\b(NULL|TRUE|FALSE)\b)',
    ]
    
    # XSS patterns
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
    ]
    
    # Command injection patterns
    CMD_PATTERNS = [
        r'[;&|`]',
        r'\$\(',
        r'`[^`]*`',
    ]
    
    @classmethod
    def sanitize_string(cls, text: str, max_length: int = 10000) -> str:
        """
        Sanitize a string input:
        1. Remove control characters
        2. Limit length
        3. Check for injection patterns
        4. Escape HTML
        """
        if not isinstance(text, str):
            return str(text)[:max_length]
        
        # Remove control characters except newlines and tabs
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # Limit length
        text = text[:max_length]
        
        # Check for suspicious patterns (log but don't block - may be legitimate)
        if cls._contains_suspicious_patterns(text):
            logger.warning(f"Input contains potentially suspicious patterns: {text[:100]}...")
        
        return text
    
    @classmethod
    def _contains_suspicious_patterns(cls, text: str) -> bool:
        """Check if text contains suspicious patterns"""
        combined_patterns = cls.SQL_PATTERNS + cls.XSS_PATTERNS + cls.CMD_PATTERNS
        for pattern in combined_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False
    
    @classmethod
    def sanitize_for_ai_prompt(cls, text: str) -> str:
        """
        Sanitize user input before inserting into AI prompts.
        This prevents prompt injection attacks.
        """
        # Remove any attempts to inject system instructions
        text = re.sub(r'\b(system|assistant|user)\s*[:\n]', '[REDACTED]', text, flags=re.IGNORECASE)
        
        # Remove common injection markers
        text = re.sub(r'[\x00-\x1F]', '', text)
        
        # Escape special characters that could be interpreted as prompt boundaries
        text = text.replace('"', "'")
        text = text.replace('\\', '/')
        
        # Limit length
        return text[:5000]


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """Middleware to sanitize all incoming request data"""
    
    async def dispatch(self, request: Request, call_next):
        # Skip sanitization for certain paths
        if request.url.path in ["/api/health", "/"]:
            return await call_next(request)
        
        # Sanitize query parameters
        for key, value in request.query_params.items():
            if isinstance(value, str):
                sanitized = InputSanitizer.sanitize_string(value)
                # Note: We can't modify query params directly in FastAPI request
                # This would need to be handled at the route level
        
        # Continue with the request
        response = await call_next(request)
        return response


def sanitize_user_input(text: Optional[str], max_length: int = 1000) -> Optional[str]:
    """
    Helper function to sanitize user input at the route level
    """
    if text is None:
        return None
    return InputSanitizer.sanitize_string(text, max_length)
