import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Sparkles, BookOpen, Calendar, Target, ChevronRight, Trash2, Trophy, Star, Crown } from 'lucide-react'
import { motion } from 'framer-motion'
import { goalsApi, quizzesApi } from '../lib/api'
import { Goal, QuizQuestion, QuizResult } from '../types'
import { useData } from '../contexts/DataContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import LimitReachedModal from '../components/ui/LimitReachedModal'
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
  const { refreshActivities } = useData()
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
  const [newAchievements, setNewAchievements] = useState<any[]>([])
  const [levelUpInfo, setLevelUpInfo] = useState<{oldLevel: number, newLevel: number} | null>(null)
  const [limitModalOpen, setLimitModalOpen] = useState(false)

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
      console.log('[Quiz] Fetching saved quizzes...')
      const [quizzesRes, goalsRes] = await Promise.all([
        quizzesApi.getMyQuizzes(),
        goalsApi.getAll()
      ])
      console.log('[Quiz] Quizzes fetched:', quizzesRes.data?.length || 0, 'quizzes')
      setSavedQuizzes(quizzesRes.data || [])
      // Create a map of goal_id to goal for quick lookup
      const goalsMapData = goalsRes.data.reduce((acc: Record<number, Goal>, g: Goal) => {
        acc[g.id] = g
        return acc
      }, {})
      setGoalsMap(goalsMapData)
    } catch (error: any) {
      console.error('[Quiz] Failed to load saved quizzes:', error)
      if (error.response?.status === 422) {
        console.error('[Quiz] Validation error:', error.response.data)
      }
      setSavedQuizzes([])
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
    } catch (error: any) {
      console.error('Failed to generate quiz:', error)
      if (error.response?.status === 403) {
        setLimitModalOpen(true)
      } else {
        alert('Failed to generate quiz. Please try again.')
      }
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
      // Refresh activities to show recent quiz action
      refreshActivities()
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

  const handleViewQuiz = (quiz: SavedQuiz) => {
    navigate(`/quiz/review/${quiz.id}`)
  }

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return
    
    try {
      await quizzesApi.delete(quizId)
      setSavedQuizzes(savedQuizzes.filter(q => q.id !== quizId))
    } catch (error) {
      console.error('Failed to delete quiz:', error)
      alert('Failed to delete quiz')
    }
  }

  // Main quiz page (no goal selected)
  if (!goalId) {
    return (
      <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">My Quizzes</h1>
            <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">View all your completed quizzes and start new ones</p>
          </div>

          {/* Start New Quiz Section */}
          <Card className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-dark-text-primary mb-1 font-heading transition-colors">Start a New Quiz</h2>
                <p className="text-neutral-500 dark:text-dark-text-secondary text-sm transition-colors">Select a goal to generate a personalized quiz</p>
              </div>
              <Button onClick={() => navigate('/goals')}>
                Browse Goals
              </Button>
            </div>
          </Card>

          {/* Saved Quizzes List */}
          <div className="space-y-4">
            <h2 className="section-heading mb-4">Completed Quizzes</h2>
            
            {loadingQuizzes ? (
              <Card>
                <div className="text-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-primary-dark mx-auto mb-4 transition-colors" />
                  <p className="text-neutral-600 dark:text-dark-text-secondary transition-colors">Loading quizzes...</p>
                </div>
              </Card>
            ) : savedQuizzes.length === 0 ? (
              <Card>
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-dark-bg-tertiary flex items-center justify-center mx-auto mb-4 transition-colors">
                    <BookOpen className="w-8 h-8 text-neutral-400 dark:text-dark-text-tertiary transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-dark-text-primary mb-2 font-heading transition-colors">No quizzes yet</h3>
                  <p className="text-neutral-500 dark:text-dark-text-secondary mb-4 text-sm transition-colors">Complete your first quiz to see it here</p>
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
                  <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => handleViewQuiz(quiz)}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">{quiz.topic}</h3>
                          <Badge 
                            variant={quiz.score >= 70 ? 'success' : quiz.score >= 50 ? 'warning' : 'error'}
                          >
                            {Math.round(quiz.score)}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-neutral-500">
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
                        <ChevronRight className="w-5 h-5 text-neutral-400" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteQuiz(quiz.id)
                          }}
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
        </div>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-primary-dark mx-auto mb-4 transition-colors" />
              <p className="text-neutral-600 dark:text-dark-text-secondary transition-colors">Loading goal...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
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
          <h1 className="font-heading text-2xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">Quiz: {goal.title}</h1>
          <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">Test your knowledge with AI-generated questions</p>
        </div>

        {/* Quiz Generator */}
        {questions.length === 0 && (
          <Card className="mb-6">
            <h2 className="section-heading mb-6">Generate Quiz</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-dark-text-primary mb-2 transition-colors">
                  Topic (optional - will use goal title if empty)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="input-base"
                  placeholder={`e.g., React Hooks, Python Functions (default: ${goal.title})`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-dark-text-primary mb-2 transition-colors">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="input-base"
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
          <div className="space-y-4 mb-8">
            {questions.map((question, qIndex) => (
              <motion.div
                key={qIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: qIndex * 0.1 }}
              >
                <Card>
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-dark-text-primary mb-4 font-heading transition-colors">
                    Question {qIndex + 1}
                  </h3>
                  <div className="mb-4 p-4 bg-neutral-50 dark:bg-dark-bg-tertiary rounded-lg prose-custom transition-colors">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeHighlight]}
                    >
                      {question.question}
                    </ReactMarkdown>
                  </div>
                  <div className="space-y-2">
                    {question.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleSelectAnswer(qIndex, oIndex)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                          answers[qIndex] === oIndex
                            ? 'border-primary dark:border-primary-dark bg-primary-muted dark:bg-primary/20'
                            : 'border-neutral-200 dark:border-dark-border-primary hover:border-primary dark:hover:border-primary-dark hover:bg-neutral-50 dark:hover:bg-dark-bg-tertiary'
                        }`}
                      >
                        <span className="font-medium text-neutral-700 dark:text-dark-text-primary transition-colors">
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
                className="bg-primary dark:bg-primary-dark rounded-card p-6 mb-6 text-white transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                      <Crown className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-heading">Level Up!</h3>
                      <p className="text-white/60">You reached level {levelUpInfo.newLevel}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/60 mb-1">Level</p>
                    <p className="text-3xl font-bold font-heading">{levelUpInfo.newLevel}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* New Achievements Banner */}
            {newAchievements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary dark:bg-secondary-dark rounded-card p-6 mb-6 text-white transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold font-heading">Achievement{newAchievements.length > 1 ? 's' : ''} Unlocked!</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {newAchievements.map((achievement, idx) => (
                    <div key={idx} className="bg-white dark:bg-dark-bg-secondary rounded-card p-4 border border-neutral-200 dark:border-dark-border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          achievement.difficulty === 'gold' ? 'bg-tertiary' :
                          achievement.difficulty === 'silver' ? 'bg-neutral-400' :
                          'bg-primary'
                        }`}>
                          <Star className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-dark-text-primary transition-colors">{achievement.name}</p>
                          <p className="text-xs text-primary font-medium">+{achievement.xp_reward} XP</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-primary dark:text-primary-dark mb-2 font-heading transition-colors">
                {Math.round(result.score)}%
              </div>
              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary transition-colors">
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
                    className={`p-4 rounded-lg border transition-colors ${
                      isCorrect
                        ? 'border-primary/30 dark:border-primary-dark/30 bg-primary-muted/50 dark:bg-primary/10'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-primary dark:text-primary-dark flex-shrink-0 mt-0.5 transition-colors" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900 dark:text-dark-text-primary mb-2 prose-custom transition-colors">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeHighlight]}
                          >
                            {question.question}
                          </ReactMarkdown>
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-1 transition-colors">
                          Your answer: <span className="font-medium">{String.fromCharCode(65 + feedback.selected_answer)}. {question.options[feedback.selected_answer]}</span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-2 transition-colors">
                            Correct answer: <span className="font-medium text-primary dark:text-primary-dark transition-colors">{String.fromCharCode(65 + feedback.correct_answer)}. {question.options[feedback.correct_answer]}</span>
                          </p>
                        )}
                        {feedback.explanation && (
                          <div className="mt-2 p-3 bg-white dark:bg-dark-bg-secondary rounded border border-neutral-200 dark:border-dark-border-primary transition-colors">
                            <p className="text-sm text-neutral-700 dark:text-dark-text-primary transition-colors">{feedback.explanation}</p>
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

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        feature="quiz generation"
        limitType="daily"
        currentCount={3}
        limitCount={3}
      />
      </div>
    </div>
  )
}
