import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Sparkles, Loader2, ArrowLeft, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { goalsApi, roadmapsApi, aiApi } from '../lib/api'
import { Goal, RoadmapStep } from '../types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function StudyRoadmap() {
  const { goalId } = useParams<{ goalId?: string }>()
  const navigate = useNavigate()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [steps, setSteps] = useState<RoadmapStep[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [explainingStepId, setExplainingStepId] = useState<number | null>(null)
  const [explanation, setExplanation] = useState<string>('')

  useEffect(() => {
    if (goalId) {
      loadRoadmap()
    } else {
      setLoading(false)
    }
  }, [goalId])

  const loadRoadmap = async () => {
    if (!goalId) return
    
    try {
      setLoading(true)
      const [goalRes, stepsRes] = await Promise.all([
        goalsApi.getById(parseInt(goalId)),
        roadmapsApi.getByGoal(parseInt(goalId)),
      ])
      setGoal(goalRes.data)
      setSteps(stepsRes.data)
    } catch (error) {
      console.error('Failed to load roadmap:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateRoadmap = async () => {
    if (!goalId) return
    
    try {
      setGenerating(true)
      const response = await roadmapsApi.generate(parseInt(goalId), 10)
      setSteps(response.data.steps)
    } catch (error) {
      console.error('Failed to generate roadmap:', error)
      alert('Failed to generate roadmap. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleToggleStep = async (stepId: number, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await roadmapsApi.uncompleteStep(stepId)
      } else {
        await roadmapsApi.completeStep(stepId)
      }
      // Reload roadmap to get updated goal status
      await loadRoadmap()
      // Reload goal to get updated completion status
      if (goalId) {
        const goalRes = await goalsApi.getById(parseInt(goalId))
        setGoal(goalRes.data)
      }
    } catch (error) {
      console.error('Failed to update step:', error)
    }
  }

  const handleExplainStep = async (stepId: number) => {
    if (explainingStepId === stepId) {
      setExplainingStepId(null)
      setExplanation('')
      return
    }

    try {
      setExplainingStepId(stepId)
      const response = await aiApi.explainStep(stepId)
      setExplanation(response.data.explanation)
    } catch (error) {
      console.error('Failed to get explanation:', error)
      alert('Failed to get explanation. Please try again.')
    }
  }

  const completedSteps = steps.filter(s => s.is_completed).length
  const progressPercentage = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!goalId) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Goal Selected</h2>
            <p className="text-gray-600 mb-6">Please select a goal to view its roadmap.</p>
            <Button onClick={() => navigate('/goals')}>
              Browse Goals
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Goal not found.</p>
            <Button onClick={() => navigate('/goals')}>
              Go to Goals
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{goal.title}</h1>
        {goal.description && (
          <p className="text-lg text-gray-600">{goal.description}</p>
        )}
      </div>

      {/* Progress Bar */}
      {steps.length > 0 && (
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-semibold text-blue-600">
              {completedSteps} / {steps.length} steps
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full"
            />
          </div>
        </Card>
      )}

      {/* Generate Roadmap Button */}
      {steps.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Generate Your Study Roadmap
            </h2>
            <p className="text-gray-600 mb-6">
              Let AI create a personalized 10-step roadmap for your learning goal
            </p>
            <Button
              onClick={handleGenerateRoadmap}
              disabled={generating}
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Roadmap
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Roadmap Steps */}
      {steps.length > 0 && (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleStep(step.id, step.is_completed)}
                  className="mt-1 flex-shrink-0"
                >
                  {step.is_completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400 hover:text-blue-600 transition-colors" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Step {step.step_number}: {step.title}
                      </h3>
                      <p className="text-gray-600 mb-3">{step.description}</p>
                      {step.estimated_hours > 0 && (
                        <p className="text-sm text-gray-500">
                          Estimated: {step.estimated_hours} hours
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* AI Explanation */}
                  <button
                    onClick={() => handleExplainStep(step.id)}
                    className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    {explainingStepId === step.id ? 'Hide' : 'Why this step?'}
                  </button>
                  
                  {explainingStepId === step.id && explanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <p className="text-sm text-gray-700">{explanation}</p>
                    </motion.div>
                  )}
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

