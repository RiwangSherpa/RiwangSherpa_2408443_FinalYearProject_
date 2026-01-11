import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Sparkles, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { goalsApi, quizzesApi } from '../lib/api'
import { Goal, QuizQuestion, QuizResult } from '../types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'highlight.js/styles/github.css'

export default function Quiz() {
  const { goalId } = useParams<{ goalId?: string }>()
  const navigate = useNavigate()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  useEffect(() => {
    if (goalId) {
      loadGoal()
    }
  }, [goalId])

  const loadGoal = async () => {
    if (!goalId) return
    try {
      const response = await goalsApi.getById(parseInt(goalId))
      setGoal(response.data)
    } catch (error) {
      console.error('Failed to load goal:', error)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!goalId) {
      alert('Please select a goal first')
      return
    }

    // Use goal title as topic if not provided
    const quizTopic = topic.trim() || goal.title

    try {
      setGenerating(true)
      const response = await quizzesApi.generate(
        parseInt(goalId),
        quizTopic,
        10, // Generate up to 10 questions
        difficulty
      )
      setQuestions(response.data.questions)
      setAnswers(new Array(response.data.questions.length).fill(-1))
      setResult(null)
    } catch (error) {
      console.error('Failed to generate quiz:', error)
      alert('Failed to generate quiz. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSelectAnswer = (questionIndex: number, answerIndex: number) => {
    if (result) return
    const newAnswers = [...answers]
    newAnswers[questionIndex] = answerIndex
    setAnswers(newAnswers)
  }

  const handleSubmit = async () => {
    if (answers.some(a => a === -1)) {
      alert('Please answer all questions')
      return
    }

    try {
      setLoading(true)
      const quizData = { questions, success: true, confidence_score: 0.85 }
      const response = await quizzesApi.submit(quizData, answers, parseInt(goalId || '0'), topic)
      setResult(response.data)
    } catch (error) {
      console.error('Failed to submit quiz:', error)
      alert('Failed to submit quiz. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!goalId || !goal) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Goal Selected</h2>
            <p className="text-gray-600 mb-6">Please select a goal to take a quiz.</p>
            <Button onClick={() => navigate('/goals')}>
              Browse Goals
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/goals')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Goals
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz: {goal.title}</h1>
        <p className="text-gray-600">Test your knowledge with AI-generated questions</p>
      </div>

      {/* Quiz Generator */}
      {questions.length === 0 && (
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Generate Quiz</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic (optional - will use goal title if empty)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="input"
                placeholder={`e.g., React Hooks, Python Functions (default: ${goal.title})`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="input"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <Button
              onClick={handleGenerateQuiz}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Quiz
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Quiz Questions */}
      {questions.length > 0 && !result && (
        <div className="space-y-6 mb-8">
          {questions.map((question, qIndex) => (
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qIndex * 0.1 }}
            >
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Question {qIndex + 1}
                </h3>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg prose prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight]}
                    components={{
                      code: ({node, inline, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {question.question}
                  </ReactMarkdown>
                </div>
                <div className="space-y-2">
                  {question.options.map((option, oIndex) => (
                    <button
                      key={oIndex}
                      onClick={() => handleSelectAnswer(qIndex, oIndex)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        answers[qIndex] === oIndex
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium text-gray-700">
                        {String.fromCharCode(65 + oIndex)}. {option}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
          <Button
            onClick={handleSubmit}
            disabled={loading || answers.some(a => a === -1)}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Quiz'
            )}
          </Button>
        </div>
      )}

      {/* Quiz Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card>
            <div className="text-center mb-6">
              <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {Math.round(result.score)}%
              </div>
              <p className="text-lg text-gray-600">
                You got {result.correct_answers} out of {result.total_questions} questions correct
              </p>
            </div>

            <div className="space-y-4">
              {questions.map((question, qIndex) => {
                const feedback = result.feedback[qIndex]
                const isCorrect = feedback.is_correct
                
                return (
                  <div
                    key={qIndex}
                    className={`p-4 rounded-lg border-2 ${
                      isCorrect
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2 prose prose-sm max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeHighlight]}
                            components={{
                              code: ({node, inline, className, children, ...props}: any) => {
                                const match = /language-(\w+)/.exec(className || '')
                                return !inline && match ? (
                                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                ) : (
                                  <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono" {...props}>
                                    {children}
                                  </code>
                                )
                              }
                            }}
                          >
                            {question.question}
                          </ReactMarkdown>
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          Your answer: <span className="font-medium">{String.fromCharCode(65 + feedback.selected_answer)}. {question.options[feedback.selected_answer]}</span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-gray-600 mb-2">
                            Correct answer: <span className="font-medium text-green-700">{String.fromCharCode(65 + feedback.correct_answer)}. {question.options[feedback.correct_answer]}</span>
                          </p>
                        )}
                        {feedback.explanation && (
                          <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                            <p className="text-sm text-gray-700">{feedback.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => {
                  setQuestions([])
                  setAnswers([])
                  setResult(null)
                  setTopic('')
                }}
                className="flex-1"
              >
                Generate New Quiz
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/progress')}
                className="flex-1"
              >
                View Progress
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
