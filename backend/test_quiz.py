import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ai_service import AIService

async def test_quiz_generation():
    ai_service = AIService()
    
    try:
        result = await ai_service.generate_quiz(
            goal_title="Learn Python Programming",
            topic="Python Functions",
            num_questions=2,
            difficulty="easy"
        )
        
        print("✅ Quiz generation successful!")
        print(f"Generated {len(result['questions'])} questions")
        print("\nSample question:")
        if result['questions']:
            q = result['questions'][0]
            print(f"Question: {q['question']}")
            print(f"Options: {q['options']}")
            print(f"Correct: {q['correct_answer']}")
        
        return True
    except Exception as e:
        print(f"❌ Quiz generation failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_quiz_generation())
    sys.exit(0 if success else 1)
