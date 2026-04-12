"""
AI Output Validation & Guardrails Service
Ensures AI responses are safe, valid, and appropriate
"""

import re
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app import models


class AIValidationError(Exception):
    """Exception for AI validation failures"""
    pass


class QuizQuestionSchema(BaseModel):
    """Schema for validating quiz questions"""
    question: str
    options: List[str]
    correct_answer: int
    explanation: Optional[str] = None
    
    class Config:
        extra = "ignore"


class RoadmapStepSchema(BaseModel):
    """Schema for validating roadmap steps"""
    step_number: int
    title: str
    description: str
    estimated_hours: float = 2.0
    ai_explanation: Optional[str] = None


class AIValidator:
    """Validator for AI-generated content"""
    
    INAPPROPRIATE_PATTERNS = [
        r'\b(hate|kill|murder|terrorist|bomb|weapon)\b',
        r'\b(hack|exploit|vulnerability|breach)\b',
    ]
    
    CODE_INJECTION_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'document\.cookie',
        r'eval\s*\(',
    ]
    
    @classmethod
    def validate_content_safety(cls, text: str) -> Dict[str, Any]:
        """
        Check content for inappropriate or unsafe material.
        
        Returns:
            Dict with is_safe flag and details
        """
        text_lower = text.lower()
        
        for pattern in cls.INAPPROPRIATE_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return {
                    "is_safe": False,
                    "reason": "Content contains potentially inappropriate material",
                    "pattern_matched": pattern
                }
        
        for pattern in cls.CODE_INJECTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return {
                    "is_safe": False,
                    "reason": "Content contains potential code injection patterns",
                    "pattern_matched": pattern
                }
        
        return {"is_safe": True}
    
    @classmethod
    def validate_quiz_questions(cls, data: Any) -> Dict[str, Any]:
        """
        Validate quiz questions structure and content.
        
        Returns:
            Dict with is_valid flag, cleaned data, and any errors
        """
        errors = []
        validated_questions = []
        
        if not isinstance(data, list):
            if isinstance(data, dict) and "questions" in data:
                data = data["questions"]
            else:
                return {
                    "is_valid": False,
                    "error": "Expected list of questions",
                    "data": None
                }
        
        for i, question_data in enumerate(data):
            try:
                validated = QuizQuestionSchema(**question_data)
                
                if len(validated.options) != 4:
                    errors.append(f"Question {i+1}: Must have exactly 4 options")
                    continue
                
                if validated.correct_answer < 0 or validated.correct_answer >= len(validated.options):
                    errors.append(f"Question {i+1}: Correct answer index out of range")
                    continue
                
                safety = cls.validate_content_safety(validated.question)
                if not safety["is_safe"]:
                    errors.append(f"Question {i+1}: {safety['reason']}")
                    continue
                
                validated_questions.append(validated.dict())
                
            except ValidationError as e:
                errors.append(f"Question {i+1}: {str(e)}")
            except Exception as e:
                errors.append(f"Question {i+1}: Validation error - {str(e)}")
        
        return {
            "is_valid": len(validated_questions) > 0,
            "questions": validated_questions,
            "errors": errors,
            "total_attempted": len(data),
            "total_valid": len(validated_questions)
        }
    
    @classmethod
    def validate_roadmap_steps(cls, data: Any) -> Dict[str, Any]:
        """
        Validate roadmap steps structure and content.
        
        Returns:
            Dict with is_valid flag and cleaned data
        """
        errors = []
        validated_steps = []
        
        if not isinstance(data, list):
            if isinstance(data, dict) and "steps" in data:
                data = data["steps"]
            else:
                return {
                    "is_valid": False,
                    "error": "Expected list of steps",
                    "data": None
                }
        
        for i, step_data in enumerate(data):
            try:
                if isinstance(step_data, dict):
                    normalized = {
                        "step_number": step_data.get("step_number", i + 1),
                        "title": step_data.get("title", "")[:120],
                        "description": step_data.get("description", ""),
                        "estimated_hours": step_data.get("estimated_hours", 2.0),
                        "ai_explanation": step_data.get("ai_explanation")
                    }
                    
                    validated = RoadmapStepSchema(**normalized)
                    
                    safety = cls.validate_content_safety(validated.title + " " + validated.description)
                    if not safety["is_safe"]:
                        errors.append(f"Step {i+1}: {safety['reason']}")
                        continue
                    
                    validated_steps.append(validated.dict())
                
            except ValidationError as e:
                errors.append(f"Step {i+1}: {str(e)}")
            except Exception as e:
                errors.append(f"Step {i+1}: Validation error - {str(e)}")
        
        return {
            "is_valid": len(validated_steps) > 0,
            "steps": validated_steps,
            "errors": errors,
            "total_attempted": len(data),
            "total_valid": len(validated_steps)
        }


class AIResponseCacheService:
    """Service for caching and retrieving AI responses"""
    
    def __init__(self, db: Session):
        self.db = db
        self.cache_ttl_hours = 24
    
    def _generate_cache_key(self, prompt: str, response_type: str) -> str:
        """Generate a cache key from prompt and type"""
        import hashlib
        key_string = f"{response_type}:{prompt}"
        return hashlib.sha256(key_string.encode()).hexdigest()[:32]
    
    def get_cached_response(self, prompt: str, response_type: str) -> Optional[Dict]:
        """Get cached response if available and not expired"""
        cache_key = self._generate_cache_key(prompt, response_type)
        
        cached = self.db.query(models.AIResponseCache).filter(
            models.AIResponseCache.cache_key == cache_key,
            models.AIResponseCache.response_type == response_type
        ).first()
        
        if not cached:
            return None
        
        if cached.expires_at and datetime.utcnow() > cached.expires_at:
            return None
        
        cached.access_count += 1
        cached.last_accessed_at = datetime.utcnow()
        self.db.commit()
        
        return cached.response_data
    
    def cache_response(self, prompt: str, response_type: str, 
                       response_data: Dict, model_used: str = None,
                       tokens_used: int = None) -> None:
        """Cache an AI response"""
        cache_key = self._generate_cache_key(prompt, response_type)
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()
        
        expires_at = datetime.utcnow() + timedelta(hours=self.cache_ttl_hours)
        
        existing = self.db.query(models.AIResponseCache).filter(
            models.AIResponseCache.cache_key == cache_key
        ).first()
        
        if existing:
            existing.response_data = response_data
            existing.expires_at = expires_at
            existing.last_accessed_at = datetime.utcnow()
        else:
            cache_entry = models.AIResponseCache(
                cache_key=cache_key,
                prompt_hash=prompt_hash,
                response_type=response_type,
                response_data=response_data,
                model_used=model_used or "unknown",
                tokens_used=tokens_used,
                expires_at=expires_at
            )
            self.db.add(cache_entry)
        
        self.db.commit()
    
    def clean_expired_cache(self) -> int:
        """Remove expired cache entries. Returns count removed."""
        expired = self.db.query(models.AIResponseCache).filter(
            models.AIResponseCache.expires_at < datetime.utcnow()
        ).all()
        
        count = len(expired)
        for entry in expired:
            self.db.delete(entry)
        
        self.db.commit()
        return count


class AIGuardrailsService:
    """Service for applying guardrails to AI interactions"""
    
    def __init__(self, db: Session):
        self.db = db
        self.validator = AIValidator()
        self.cache = AIResponseCacheService(db)
    
    def sanitize_prompt(self, prompt: str) -> str:
        """
        Sanitize user input before sending to AI.
        Prevents prompt injection attacks.
        """
        sanitized = re.sub(r'\b(system|assistant|user)\s*[:\n]', '[REDACTED]', 
                          prompt, flags=re.IGNORECASE)
        
        sanitized = re.sub(r'[\x00-\x1F\x7F]', '', sanitized)
        
        sanitized = sanitized.replace('"', "'")
        
        return sanitized[:4000]
    
    def validate_ai_response(self, response_type: str, data: Any) -> Dict[str, Any]:
        """
        Validate AI response based on type.
        
        Returns:
            Dict with is_valid, cleaned_data, and errors
        """
        if response_type == "quiz":
            return self.validator.validate_quiz_questions(data)
        
        elif response_type == "roadmap":
            return self.validator.validate_roadmap_steps(data)
        
        elif response_type == "explanation":
            if isinstance(data, str):
                safety = self.validator.validate_content_safety(data)
                return {
                    "is_valid": safety["is_safe"],
                    "content": data,
                    "error": safety.get("reason") if not safety["is_safe"] else None
                }
            return {"is_valid": True, "content": data}
        
        return {"is_valid": False, "error": "Unknown response type"}
    
    async def safe_ai_call(self, prompt: str, response_type: str, 
                           force_refresh: bool = False) -> Dict[str, Any]:
        """
        Safely call AI with caching, validation, and error handling.
        
        Returns:
            Dict with success, data, and error information
        """
        if not force_refresh:
            cached = self.cache.get_cached_response(prompt, response_type)
            if cached:
                return {
                    "success": True,
                    "data": cached,
                    "from_cache": True,
                    "model": "cached"
                }
        
        sanitized_prompt = self.sanitize_prompt(prompt)
        
        try:
            return {
                "success": False,
                "error": "AI call integration required - integrate with ai_service",
                "sanitized_prompt_length": len(sanitized_prompt)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"AI service error: {str(e)}",
                "error_type": "ai_service_error"
            }
    
    def get_cache_stats(self) -> Dict:
        """Get AI response cache statistics"""
        total_entries = self.db.query(models.AIResponseCache).count()
        
        by_type = self.db.query(
            models.AIResponseCache.response_type,
            func.count(models.AIResponseCache.id)
        ).group_by(models.AIResponseCache.response_type).all()
        
        total_accesses = self.db.query(
            func.sum(models.AIResponseCache.access_count)
        ).scalar() or 0
        
        expired = self.db.query(models.AIResponseCache).filter(
            models.AIResponseCache.expires_at < datetime.utcnow()
        ).count()
        
        return {
            "total_cached_entries": total_entries,
            "by_type": {t: c for t, c in by_type},
            "total_cache_accesses": int(total_accesses),
            "expired_entries": expired,
            "cache_hit_rate": "N/A"
        }


import hashlib
from sqlalchemy import func
