"""
AI Conversational Tutor Service
Manages context-aware tutoring conversations with memory and summarization
"""

import json
from typing import List, Dict, Optional, AsyncGenerator
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models
from app.services.ai_service import ai_service


class ConversationContextManager:
    """
    Manages conversation context to stay within token limits while maintaining
    conversational coherence.
    """
    
    MAX_CONTEXT_MESSAGES = 10  # Keep last N messages in full context
    
    def __init__(self):
        self.summary_prompt = """Summarize the following conversation between a student and a tutor.
Focus on:
1. Key concepts discussed
2. Student's current understanding level
3. Questions the student still has
4. Next topics to cover

Keep the summary concise (2-3 sentences) but informative enough to continue the conversation."""
    
    def create_context_window(self, messages: List[models.ConversationMessage]) -> List[Dict[str, str]]:
        """
        Create an optimized context window for the AI.
        Returns recent messages + summary of older conversation if needed.
        """
        if len(messages) <= self.MAX_CONTEXT_MESSAGES:
            # Return all messages if under limit
            return [
                {"role": msg.role, "content": msg.content}
                for msg in messages
            ]
        
        # Keep first message (system/intro) and recent messages
        context = []
        
        # Add system message if exists
        if messages and messages[0].role == "system":
            context.append({"role": "system", "content": messages[0].content})
        
        # Add recent messages
        recent_messages = messages[-self.MAX_CONTEXT_MESSAGES:]
        for msg in recent_messages:
            context.append({"role": msg.role, "content": msg.content})
        
        return context
    
    def generate_context_summary(self, messages: List[models.ConversationMessage]) -> str:
        """Generate a summary of the conversation for long-term context"""
        if len(messages) < 5:
            return ""
        
        # Create conversation text for summarization
        conversation_text = "\n".join([
            f"{msg.role}: {msg.content[:200]}..." if len(msg.content) > 200 else f"{msg.role}: {msg.content}"
            for msg in messages
        ])
        
        # This would call AI for summarization
        # For now, return a basic summary
        return f"Conversation with {len(messages)} messages covering learning topics."


class AITutorService:
    """Service for AI-powered tutoring conversations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.context_manager = ConversationContextManager()
    
    def create_session(
        self,
        user_id: int,
        goal_id: Optional[int] = None,
        step_id: Optional[int] = None,
        title: Optional[str] = None
    ) -> models.ConversationSession:
        """Create a new tutoring session"""
        session = models.ConversationSession(
            user_id=user_id,
            goal_id=goal_id,
            step_id=step_id,
            title=title or "AI Tutoring Session",
            is_active=True
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session
    
    def get_session(self, session_id: int, user_id: int) -> Optional[models.ConversationSession]:
        """Get a session by ID, verifying user ownership"""
        return self.db.query(models.ConversationSession).filter(
            models.ConversationSession.id == session_id,
            models.ConversationSession.user_id == user_id
        ).first()
    
    def get_user_sessions(self, user_id: int, active_only: bool = False) -> List[models.ConversationSession]:
        """Get all sessions for a user"""
        query = self.db.query(models.ConversationSession).filter(
            models.ConversationSession.user_id == user_id
        )
        
        if active_only:
            query = query.filter(models.ConversationSession.is_active == True)
        
        return query.order_by(models.ConversationSession.updated_at.desc()).all()
    
    async def send_message(
        self,
        session_id: int,
        user_id: int,
        content: str,
        context_goal: Optional[models.Goal] = None,
        context_step: Optional[models.RoadmapStep] = None
    ) -> models.ConversationMessage:
        """
        Send a message in a tutoring session and get AI response.
        
        Args:
            session_id: Session ID
            user_id: User ID
            content: User message content
            context_goal: Optional goal for context
            context_step: Optional roadmap step for context
            
        Returns:
            The AI's response message
        """
        session = self.get_session(session_id, user_id)
        if not session:
            raise ValueError("Session not found")
        
        # Add user message
        user_message = models.ConversationMessage(
            session_id=session_id,
            role="user",
            content=content
        )
        self.db.add(user_message)
        
        # Get conversation history
        history = session.messages
        
        # Create context window
        context_messages = self.context_manager.create_context_window(history)
        
        # Build system prompt with context
        system_prompt = self._build_system_prompt(context_goal, context_step)
        
        # Prepare messages for AI
        ai_messages = [{"role": "system", "content": system_prompt}]
        ai_messages.extend(context_messages)
        ai_messages.append({"role": "user", "content": content})
        
        # Get AI response
        try:
            # Call AI service
            ai_response_content = await self._call_ai_tutor(ai_messages)
            
            # Store AI response
            ai_message = models.ConversationMessage(
                session_id=session_id,
                role="assistant",
                content=ai_response_content,
                model_used="dolphin3:8b"  # Track which model was used
            )
            self.db.add(ai_message)
            
            # Update session
            session.updated_at = datetime.utcnow()
            
            # Update context summary if conversation is getting long
            if len(history) > 15 and not session.context_summary:
                session.context_summary = self.context_manager.generate_context_summary(history)
            
            self.db.commit()
            self.db.refresh(ai_message)
            
            return ai_message
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to get AI response: {str(e)}")
    
    def _build_system_prompt(
        self,
        goal: Optional[models.Goal] = None,
        step: Optional[models.RoadmapStep] = None
    ) -> str:
        """Build a context-aware system prompt for the tutor"""
        base_prompt = """You are an expert AI tutor specializing in personalized education.
Your role is to:
1. Explain concepts clearly and adapt to the student's level
2. Ask clarifying questions when needed
3. Provide examples and analogies to aid understanding
4. Encourage active learning through questions
5. Be patient, supportive, and encouraging

When explaining:
- Break complex topics into digestible parts
- Use analogies when helpful
- Check for understanding before moving on
- Adjust depth based on student responses

Do not:
- Give away answers immediately; guide the student
- Be condescending or overly technical
- Go off-topic from the learning goal"""
        
        # Add context if available
        context_parts = []
        
        if goal:
            context_parts.append(f"\nCurrent Learning Goal: {goal.title}")
            if goal.learning_style:
                context_parts.append(f"Student's Learning Style: {goal.learning_style}")
        
        if step:
            context_parts.append(f"\nCurrent Topic: {step.title}")
            if step.description:
                context_parts.append(f"Description: {step.description}")
        
        if context_parts:
            base_prompt += "\n\nCONTEXT:" + "\n".join(context_parts)
        
        return base_prompt
    
    async def _call_ai_tutor(self, messages: List[Dict[str, str]]) -> str:
        """Call AI service with tutoring messages"""
        # Use the ai_service but with custom prompt
        # This is a simplified version - in production, you'd want streaming
        
        prompt_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in messages
        ])
        
        # Call the existing AI service
        response = await ai_service._call_ollama(prompt_text, temperature=0.7)
        
        return response
    
    async def explain_concept(
        self,
        concept_name: str,
        context: Optional[str] = None,
        difficulty_level: str = "intermediate"
    ) -> str:
        """Generate a standalone explanation of a concept"""
        prompt = f"""Explain the concept "{concept_name}" to a {difficulty_level} level learner.

{f'Context: {context}' if context else ''}

Requirements:
1. Start with a simple definition
2. Provide 2-3 examples or analogies
3. Explain why this concept is important
4. Connect to practical applications
5. Keep it engaging and clear

Format your response in clear sections with markdown formatting."""
        
        return await ai_service._call_ollama(prompt, temperature=0.6)
    
    def rate_response_helpfulness(self, message_id: int, was_helpful: bool) -> None:
        """Allow user to rate whether an AI response was helpful"""
        message = self.db.query(models.ConversationMessage).filter(
            models.ConversationMessage.id == message_id
        ).first()
        
        if message:
            message.was_helpful = was_helpful
            self.db.commit()
    
    def close_session(self, session_id: int, user_id: int) -> None:
        """Close a tutoring session"""
        session = self.get_session(session_id, user_id)
        if session:
            session.is_active = False
            self.db.commit()
    
    def get_session_stats(self, user_id: int) -> Dict:
        """Get conversation statistics for a user"""
        total_sessions = self.db.query(models.ConversationSession).filter(
            models.ConversationSession.user_id == user_id
        ).count()
        
        active_sessions = self.db.query(models.ConversationSession).filter(
            models.ConversationSession.user_id == user_id,
            models.ConversationSession.is_active == True
        ).count()
        
        total_messages = self.db.query(models.ConversationMessage).join(
            models.ConversationSession
        ).filter(
            models.ConversationSession.user_id == user_id
        ).count()
        
        helpful_responses = self.db.query(models.ConversationMessage).join(
            models.ConversationSession
        ).filter(
            models.ConversationSession.user_id == user_id,
            models.ConversationMessage.role == "assistant",
            models.ConversationMessage.was_helpful == True
        ).count()
        
        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "total_messages": total_messages,
            "helpful_responses": helpful_responses,
            "response_quality_rate": round((helpful_responses / max(total_messages * 0.5, 1)) * 100, 1)
        }
