import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Target, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { goalsApi, roadmapsApi } from '../lib/api'
import { Goal, RoadmapStep } from '../types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import VoiceInput from '../components/VoiceInput'

export default function Goals() {
  const navigate = useNavigate()
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalProgress, setGoalProgress] = useState<Record<number, { completed: number; total: number }>>({})
  const [loading, setLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
  })

  useEffect(() => {
    loadGoals()
  }, [])

  const loadGoals = async () => {
    try {
      const response = await goalsApi.getAll()
      setGoals(response.data)
      
      // Load progress for each goal
      const progressMap: Record<number, { completed: number; total: number }> = {}
      for (const goal of response.data) {
        try {
          const stepsRes = await roadmapsApi.getByGoal(goal.id)
          const steps = stepsRes.data
          const completed = steps.filter(s => s.is_completed).length
          progressMap[goal.id] = { completed, total: steps.length }
        } catch (error) {
          // If roadmap doesn't exist yet, set to 0
          progressMap[goal.id] = { completed: 0, total: 0 }
        }
      }
      setGoalProgress(progressMap)
    } catch (error) {
      console.error('Failed to load goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoal.title.trim()) {
      alert('Please enter a goal title')
      return
    }

    try {
      await goalsApi.create({
        title: newGoal.title,
        description: newGoal.description,
        learning_style: 'balanced' // Backend requires this, but we don't show it to users
      })
      setNewGoal({ title: '', description: '' })
      setShowGoalForm(false)
      loadGoals()
    } catch (error) {
      console.error('Failed to create goal:', error)
      alert('Failed to create goal. Please try again.')
    }
  }

  const handleDeleteGoal = async (goalId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this goal? This will also delete its roadmap and quizzes.')) {
      return
    }
    try {
      await goalsApi.delete(goalId)
      loadGoals()
    } catch (error) {
      console.error('Failed to delete goal:', error)
      alert('Failed to delete goal. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Goals</h1>
            <p className="text-gray-600">Create and manage your learning goals</p>
          </div>
          <Button
            onClick={() => setShowGoalForm(!showGoalForm)}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Goal
          </Button>
        </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goal Title *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., Learn React.js, Master Python, Study Machine Learning"
                  />
                  <VoiceInput 
                    onTranscript={(text) => setNewGoal({ ...newGoal, title: text })}
                    placeholder="Speak"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <div className="flex gap-2 items-start">
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
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
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-6">Create your first learning goal to get started!</p>
            <Button onClick={() => setShowGoalForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
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
                      <span className="text-xs text-gray-600">Progress</span>
                      <span className="text-xs font-semibold text-blue-600">
                        {goalProgress[goal.id].completed} / {goalProgress[goal.id].total} steps
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${(goalProgress[goal.id].completed / goalProgress[goal.id].total) * 100}%` 
                        }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
                      />
                    </div>
                  </div>
                )}
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(goal.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => handleDeleteGoal(goal.id, e)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
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
    </div>
  )
}

