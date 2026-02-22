import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Sparkles, BookOpen, Calendar, Target, ChevronRight, Trash2, Trophy, Star, Crown } from 'lucide-react'
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

interface SavedQuiz {
  id: number
  goal_id: number
  topic: string
  score: number
  total_questions: number
  correct_answers: number
  completed_at: string
}

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
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([])
  const [loadingQuizzes, setLoadingQuizzes] = useState(false)
  const [goalsMap, setGoalsMap] = useState<Record<number, Goal>>({})
  const [viewingQuiz, setViewingQuiz] = useState<SavedQuiz & { questions?: any[] } | null>(null)
  const [loadingQuizDetails, setLoadingQuizDetails] = useState(false)
  const [newAchievements, setNewAchievements] = useState<any[]>([])
  const [levelUpInfo, setLevelUpInfo] = useState<{oldLevel: number, newLevel: number} | null>(null)

  useEffect(() => {
    if (goalId) {
      loadGoal()
    } else {
      loadSavedQuizzes()
    }
  }, [goalId])

  const loadSavedQuizzes = async () => {
    try {
      setLoadingQuizzes(true)
      const [quizzesRes, goalsRes] = await Promise.all([
        quizzesApi.getMyQuizzes(),
        goalsApi.getAll()
      ])
      setSavedQuizzes(quizzesRes.data)
      // Create a map of goal_id to goal for quick lookup
      const goalsMapData = goalsRes.data.reduce((acc: Record<number, Goal>, g: Goal) => {
        acc[g.id] = g
        return acc
      }, {})
      setGoalsMap(goalsMapData)
    } catch (error) {
      console.error('Failed to load saved quizzes:', error)
    } finally {
      setLoadingQuizzes(false)
    }
  }

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

    const quizTopic = topic.trim() || goal?.title || 'General'

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
      const quizTopic = topic.trim() || goal?.title || 'General'
      const quizData = { questions, success: true, confidence_score: 0.85 }
      const response = await quizzesApi.submit(
        quizData, 
        answers, 
        parseInt(goalId || '0'), 
        quizTopic
      )
      setResult(response.data)
      // Capture achievements and level up info
      if (response.data.new_achievements?.length > 0) {
        setNewAchievements(response.data.new_achievements)
      }
      if (response.data.level_up) {
        setLevelUpInfo(response.data.level_up)
      }
      // Always refresh saved quizzes list after submission
      loadSavedQuizzes()
    } catch (error) {
      console.error('Failed to submit quiz:', error)
      alert('Failed to submit quiz. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewQuiz = async (quiz: SavedQuiz) => {
    try {
      setLoadingQuizDetails(true)
      const response = await quizzesApi.getById(quiz.id)
      setViewingQuiz({ ...quiz, questions: response.data.questions })
    } catch (error) {
      console.error('Failed to load quiz details:', error)
      alert('Failed to load quiz details')
    } finally {
      setLoadingQuizDetails(false)
    }
  }

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return
    
    try {
      await quizzesApi.delete(quizId)
      setSavedQuizzes(savedQuizzes.filter(q => q.id !== quizId))
      if (viewingQuiz?.id === quizId) {
        setViewingQuiz(null)
      }
    } catch (error) {
      console.error('Failed to delete quiz:', error)
      alert('Failed to delete quiz')
    }
  }

  // Main quiz page (no goal selected)
  if (!goalId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Quizzes</h1>
          <p className="text-gray-600">View all your completed quizzes and start new ones</p>
        </div>

        {/* Start New Quiz Section */}
        <Card className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Start a New Quiz</h2>
              <p className="text-gray-600">Select a goal to generate a personalized quiz</p>
            </div>
            <Button onClick={() => navigate('/goals')}>
              Browse Goals
            </Button>
          </div>
        </Card>

        {/* Saved Quizzes List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Completed Quizzes</h2>
          
          {loadingQuizzes ? (
            <Card>
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading quizzes...</p>
              </div>
            </Card>
          ) : savedQuizzes.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes yet</h3>
                <p className="text-gray-600 mb-4">Complete your first quiz to see it here</p>
                <Button onClick={() => navigate('/goals')}>
                  Start Your First Quiz
                </Button>
              </div>
            </Card>
          ) : (
            savedQuizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{quiz.topic}</h3>
                        <Badge 
                          variant={quiz.score >= 70 ? 'success' : quiz.score >= 50 ? 'warning' : 'error'}
                        >
                          {Math.round(quiz.score)}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {goalsMap[quiz.goal_id]?.title || `Goal #${quiz.goal_id}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(quiz.completed_at)}
                        </span>
                        <span>
                          {quiz.correct_answers} / {quiz.total_questions} correct
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewQuiz(quiz)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Quiz Details Modal */}
        {viewingQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setViewingQuiz(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{viewingQuiz.topic}</h2>
                  <Button variant="ghost" onClick={() => setViewingQuiz(null)}>Close</Button>
                </div>
                
                {loadingQuizDetails ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading quiz details...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {goalsMap[viewingQuiz.goal_id]?.title || `Goal #${viewingQuiz.goal_id}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(viewingQuiz.completed_at)}
                      </span>
                      <span>
                        Score: {Math.round(viewingQuiz.score)}% ({viewingQuiz.correct_answers}/{viewingQuiz.total_questions})
                      </span>
                    </div>
                    
                    {viewingQuiz.questions?.map((question: any, qIndex: number) => (
                      <Card key={qIndex} className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Question {qIndex + 1}</h3>
                        <div className="prose prose-sm max-w-none mb-3">
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
                        <div className="space-y-1">
                          {question.options.map((option: string, oIndex: number) => (
                            <div key={oIndex} className={`p-2 rounded ${
                              oIndex === question.correct_answer 
                                ? 'bg-green-100 text-green-800 border border-green-300' 
                                : 'bg-gray-50 text-gray-600'
                            }`}>
                              {String.fromCharCode(65 + oIndex)}. {option}
                              {oIndex === question.correct_answer && (
                                <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {question.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <strong>Explanation:</strong> {question.explanation}
                            </p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading goal...</p>
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
          onClick={() => navigate('/quiz')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quizzes
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
            {/* Level Up Banner */}
            {levelUpInfo && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                      <Crown className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Level Up!</h3>
                      <p className="text-white/80">You reached level {levelUpInfo.newLevel}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/60 mb-1">Level</p>
                    <p className="text-3xl font-bold">{levelUpInfo.newLevel}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* New Achievements Banner */}
            {newAchievements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">Achievement{newAchievements.length > 1 ? 's' : ''} Unlocked!</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {newAchievements.map((achievement, idx) => (
                    <div key={idx} className="bg-white/95 rounded-xl p-4 shadow">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          achievement.difficulty === 'gold' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                          achievement.difficulty === 'silver' ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                          'bg-gradient-to-r from-amber-600 to-amber-700'
                        }`}>
                          <Star className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{achievement.name}</p>
                          <p className="text-xs text-emerald-600 font-medium">+{achievement.xp_reward} XP</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

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
                  setNewAchievements([])
                  setLevelUpInfo(null)
                }}
                className="flex-1"
              >
                Generate New Quiz
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/quiz')}
                className="flex-1"
              >
                View All Quizzes
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
