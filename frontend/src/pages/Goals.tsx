import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useData } from '../contexts/DataContext'
import { goalsApi, roadmapsApi } from '../lib/api'
import { Goal } from '../types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import VoiceInput from '../components/VoiceInput'
import LimitReachedModal from '../components/ui/LimitReachedModal'

export default function Goals() {
  const navigate = useNavigate()
  const { goals, setGoals, loadingGoals, refreshGoals, refreshActivities } = useData()
  const [goalProgress, setGoalProgress] = useState<Record<number, { completed: number; total: number }>>({})
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
  })
  const [limitModalOpen, setLimitModalOpen] = useState(false)

  useEffect(() => {
    console.log('[Goals] Goals updated:', goals.length, 'goals')
    if (goals.length > 0) {
      console.log('[Goals] First goal:', goals[0].title, 'completed:', goals[0].is_completed)
    }
    loadGoalProgress()
  }, [goals])

  const loadGoalProgress = async () => {
    try {
      const progressMap: Record<number, { completed: number; total: number }> = {}
      for (const goal of goals) {
        try {
          const stepsRes = await roadmapsApi.getByGoal(goal.id)
          const steps = stepsRes.data
          const completed = steps.filter((s: { is_completed: boolean }) => s.is_completed).length
          progressMap[goal.id] = { completed, total: steps.length }
        } catch (error) {
          progressMap[goal.id] = { completed: 0, total: 0 }
        }
      }
      setGoalProgress(progressMap)
    } catch (error) {
      console.error('Failed to load goal progress:', error)
    }
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoal.title.trim()) {
      alert('Please enter a goal title')
      return
    }

    try {
      console.log('[Goals] Creating goal:', newGoal.title)
      const response = await goalsApi.create({
        title: newGoal.title,
        description: newGoal.description,
        learning_style: 'balanced'
      })
      console.log('[Goals] Goal created:', response.data)
      
      setNewGoal({ title: '', description: '' })
      setShowGoalForm(false)
      
      console.log('[Goals] Refreshing goals list...')
      await refreshGoals()
      console.log('[Goals] Goals list refreshed')
      
      refreshActivities()
    } catch (error: any) {
      console.error('[Goals] Failed to create goal:', error)
      if (error.response?.status === 429) {
        alert('Too many requests. Please wait a moment and try again.')
      } else if (error.response?.status === 403) {
        setShowGoalForm(false)
        setLimitModalOpen(true)
      } else {
        alert('Failed to create goal. Please try again.')
      }
    }
  }

  const handleDeleteGoal = async (goalId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this goal? This will also delete its roadmap and quizzes.')) {
      return
    }
    try {
      await goalsApi.delete(goalId)
      refreshGoals()
    } catch (error: any) {
      console.error('Failed to delete goal:', error)
      if (error.response?.status === 429) {
        alert('Too many requests. Please wait a moment and try again.')
      } else {
        alert('Failed to delete goal. Please try again.')
      }
    }
  }

  if (loadingGoals) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">Your Goals</h1>
            <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">Create and manage your learning goals</p>
          </div>
          <Button
            onClick={() => setShowGoalForm(!showGoalForm)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </Button>
        </div>

        {/* Goal Creation Form */}
        {showGoalForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <Card>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-800 dark:text-dark-text-primary mb-2 transition-colors">
                    Goal Title *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                      className="flex-1 input-base"
                      placeholder="e.g., Learn React.js, Master Python, Study Machine Learning"
                    />
                    <VoiceInput 
                      onTranscript={(text) => setNewGoal({ ...newGoal, title: text })}
                      placeholder="Speak"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-800 dark:text-dark-text-primary mb-2 transition-colors">
                    Description
                  </label>
                  <div className="flex gap-2 items-start">
                    <textarea
                      value={newGoal.description}
                      onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                      className="flex-1 input-base h-24 resize-none"
                      rows={3}
                      placeholder="Describe what you want to achieve..."
                    />
                    <div className="mt-2">
                      <VoiceInput 
                        onTranscript={(text) => setNewGoal({ ...newGoal, description: text })}
                        placeholder="Speak"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Create Goal
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowGoalForm(false)
                      setNewGoal({ title: '', description: '' })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <Card>
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-neutral-300 dark:text-dark-text-tertiary mx-auto mb-3 transition-colors" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-dark-text-secondary mb-1 transition-colors">No goals yet</p>
              <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary mb-4 transition-colors">Create your first learning goal to get started!</p>
              <Button onClick={() => setShowGoalForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Goal
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  hover
                  onClick={() => navigate(`/roadmaps/${goal.id}`)}
                  className="h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-neutral-900 dark:text-dark-text-primary mb-2 line-clamp-2 font-heading transition-colors">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-sm text-neutral-500 dark:text-dark-text-secondary line-clamp-2 mb-3 transition-colors">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    {goal.is_completed && (
                      <Badge variant="success">Completed</Badge>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  {goalProgress[goal.id] && goalProgress[goal.id].total > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-500 dark:text-dark-text-tertiary transition-colors">Progress</span>
                        <span className="text-xs font-semibold text-primary dark:text-primary-dark transition-colors">
                          {goalProgress[goal.id].completed} / {goalProgress[goal.id].total} steps
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full h-2 transition-colors">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${(goalProgress[goal.id].completed / goalProgress[goal.id].total) * 100}%` 
                          }}
                          transition={{ duration: 0.5 }}
                          className="bg-primary dark:bg-primary-dark h-2 rounded-full transition-colors"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-auto pt-4 border-t border-neutral-200 dark:border-dark-border-primary transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-neutral-400 dark:text-dark-text-tertiary transition-colors">
                        {new Date(goal.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDeleteGoal(goal.id, e)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/roadmaps/${goal.id}`)
                        }}
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        Roadmap
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/quiz/${goal.id}`)
                        }}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Quiz
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Limit Reached Modal */}
        <LimitReachedModal
          isOpen={limitModalOpen}
          onClose={() => setLimitModalOpen(false)}
          feature="goals"
          limitType="active"
          currentCount={3}
          limitCount={3}
        />
      </div>
    </div>
  )
}

