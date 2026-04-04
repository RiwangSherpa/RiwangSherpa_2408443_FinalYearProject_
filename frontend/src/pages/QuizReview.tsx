import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trophy,
  Loader2,
  BookOpen
} from 'lucide-react'
import { quizzesApi } from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

interface QuizResult {
  id: number
  goal_id: number
  topic: string
  score: number
  total_questions: number
  correct_answers: number
  questions: QuizQuestion[]
  completed_at: string
}

export default function QuizReview() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuiz()
  }, [quizId])

  const loadQuiz = async () => {
    if (!quizId) return
    
    try {
      setLoading(true)
      const response = await quizzesApi.getById(parseInt(quizId))
      setQuiz(response.data)
    } catch (err) {
      console.error('Failed to load quiz:', err)
      setError('Failed to load quiz review. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg-primary px-6 py-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-primary-dark" />
        </div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg-primary px-6 py-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="text-center py-16">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-dark-text-primary mb-2">
                {error || 'Quiz not found'}
              </h2>
              <Button onClick={() => navigate('/quiz')} className="mt-4">
                Back to Quizzes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const percentage = Math.round((quiz.correct_answers / quiz.total_questions) * 100)
  const isPerfect = percentage === 100

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg-primary px-6 py-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/quiz')}
            className="flex items-center gap-2 text-neutral-600 dark:text-dark-text-secondary hover:text-primary dark:hover:text-primary-dark transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Quizzes
          </button>
          
          <h1 className="font-heading text-2xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">
            Quiz Review: {quiz.topic}
          </h1>
          <p className="text-neutral-500 dark:text-dark-text-secondary transition-colors">
            Completed on {new Date(quiz.completed_at).toLocaleDateString()}
          </p>
        </div>

        {/* Score Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className={isPerfect ? 'border-yellow-400 dark:border-yellow-600' : ''}>
            <div className="text-center py-8">
              {isPerfect && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mb-4"
                >
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
                </motion.div>
              )}
              
              <div className="text-6xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading mb-2 transition-colors">
                {percentage}%
              </div>
              
              <p className="text-lg text-neutral-600 dark:text-dark-text-secondary mb-4 transition-colors">
                {quiz.correct_answers} / {quiz.total_questions} correct
              </p>
              
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 dark:text-dark-text-tertiary">
                <Clock className="w-4 h-4" />
                <span>{new Date(quiz.completed_at).toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Questions Review */}
        <div className="space-y-4">
          <h2 className="section-heading mb-4">Question Review</h2>
          
          {quiz.questions.map((question, index) => {
            // In a real review, we'd need the user's selected answer stored
            // For now, show the correct answer
            const isCorrect = true // Placeholder - would check user's answer
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCorrect 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 dark:text-dark-text-primary mb-3 transition-colors">
                        {index + 1}. {question.question}
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-lg text-sm ${
                              optIndex === question.correct_answer
                                ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                                : 'bg-neutral-100 dark:bg-dark-bg-tertiary text-neutral-600 dark:text-dark-text-secondary'
                            }`}
                          >
                            {String.fromCharCode(65 + optIndex)}. {option}
                            {optIndex === question.correct_answer && (
                              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                                (Correct Answer)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {question.explanation && (
                        <div className="bg-primary-muted dark:bg-primary/10 rounded-lg p-3 text-sm">
                          <p className="font-medium text-primary dark:text-primary-dark mb-1">
                            Explanation:
                          </p>
                          <p className="text-neutral-600 dark:text-dark-text-secondary">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button onClick={() => navigate('/quiz')} variant="secondary">
            <BookOpen className="w-4 h-4 mr-2" />
            Back to All Quizzes
          </Button>
        </div>
      </div>
    </div>
  )
}
