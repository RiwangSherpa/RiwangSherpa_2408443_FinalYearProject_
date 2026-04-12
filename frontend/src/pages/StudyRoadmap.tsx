import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Sparkles, Loader2, ArrowLeft, BookOpen, ChevronRight, MapPin, Trash2, Trophy, Star, Crown } from 'lucide-react'
import { motion } from 'framer-motion'
import { goalsApi, roadmapsApi } from '../lib/api'
import { Goal, RoadmapStep } from '../types'
import { useData } from '../contexts/DataContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import LimitReachedModal from '../components/ui/LimitReachedModal'

export default function StudyRoadmap() {
  const { goalId } = useParams<{ goalId?: string }>()
  const navigate = useNavigate()
  const { refreshActivities } = useData()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [steps, setSteps] = useState<RoadmapStep[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [allRoadmaps, setAllRoadmaps] = useState<RoadmapStep[]>([])
  const [loadingAllRoadmaps, setLoadingAllRoadmaps] = useState(false)
  const [goalsMap, setGoalsMap] = useState<Record<number, Goal>>({})
  const [newAchievements, setNewAchievements] = useState<any[]>([])
  const [levelUpInfo, setLevelUpInfo] = useState<{oldLevel: number, newLevel: number} | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [limitModalOpen, setLimitModalOpen] = useState(false)

  useEffect(() => {
    if (goalId) {
      loadRoadmap()
    } else {
      loadAllRoadmaps()
      setLoading(false)
    }
  }, [goalId])

  const loadAllRoadmaps = async () => {
    try {
      setLoadingAllRoadmaps(true)
      const [roadmapsRes, goalsRes] = await Promise.all([
        roadmapsApi.getMyRoadmaps(),
        goalsApi.getAll()
      ])
      setAllRoadmaps(roadmapsRes.data)
      const goalsMapData = goalsRes.data.reduce((acc: Record<number, Goal>, g: Goal) => {
        acc[g.id] = g
        return acc
      }, {})
      setGoalsMap(goalsMapData)
    } catch (error) {
      console.error('Failed to load all roadmaps:', error)
    } finally {
      setLoadingAllRoadmaps(false)
    }
  }

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
    } catch (error: any) {
      console.error('Failed to generate roadmap:', error)
      if (error.response?.status === 403) {
        setLimitModalOpen(true)
      } else {
        alert('Failed to generate roadmap. Please try again.')
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleToggleStep = async (stepId: number, isCompleted: boolean) => {
    const updatedSteps = steps.map(step => 
      step.id === stepId ? { ...step, is_completed: !isCompleted } : step
    )
    setSteps(updatedSteps)
    
    const button = document.querySelector(`[data-step-id="${stepId}"]`) as HTMLButtonElement
    if (button) {
      button.disabled = true
    }
    
    try {
      let response
      if (isCompleted) {
        await roadmapsApi.uncompleteStep(stepId)
      } else {
        response = await roadmapsApi.completeStep(stepId)
        
        if (response.data.new_achievements?.length > 0) {
          setShowCelebration(true)
          setNewAchievements(response.data.new_achievements)
        }
        if (response.data.level_up) {
          setLevelUpInfo(response.data.level_up)
        }
        
        if (response.data.goal_completed) {
          setShowCelebration(true)
          if (response.data.new_achievements?.length > 0) {
            setNewAchievements(response.data.new_achievements)
          }
          if (response.data.level_up) {
            setLevelUpInfo(response.data.level_up)
          }
          setTimeout(() => {
            setShowCelebration(false)
          }, 5000)
        }
        
        refreshActivities()
      }
      
      if (goal && response?.data.goal_completed) {
        setGoal({ ...goal, is_completed: true })
      }
      
    } catch (error: any) {
      console.error('Failed to update step:', error)
      setSteps(steps)
      
      if (error.response?.status === 429) {
        alert('Please wait a moment before trying again.')
      } else {
        alert('Failed to update step. Please try again.')
      }
    } finally {
      if (button) {
        button.disabled = false
      }
    }
  }



  const handleDeleteRoadmap = async (goalIdToDelete: number) => {
    if (!confirm('Are you sure you want to delete this roadmap? This will delete all steps for this goal.')) {
      return
    }
    try {
      await roadmapsApi.delete(goalIdToDelete)
      loadAllRoadmaps()
    } catch (error) {
      console.error('Failed to delete roadmap:', error)
      alert('Failed to delete roadmap. Please try again.')
    }
  }
  const groupRoadmapsByGoal = (steps: RoadmapStep[]) => {
    const grouped = steps.reduce((acc, step) => {
      if (!acc[step.goal_id]) {
        acc[step.goal_id] = []
      }
      acc[step.goal_id].push(step)
      return acc
    }, {} as Record<number, RoadmapStep[]>)
    return grouped
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!goalId) {
    const groupedRoadmaps = groupRoadmapsByGoal(allRoadmaps)
    const goalIds = Object.keys(groupedRoadmaps).map(Number)

    return (
      <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">My Roadmaps</h1>
            <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">View all your study roadmaps across different goals</p>
          </div>

          {/* Create New Roadmap Section */}
          <Card className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-dark-text-primary mb-1 font-heading transition-colors">Create a New Roadmap</h2>
                <p className="text-neutral-500 dark:text-dark-text-secondary text-sm transition-colors">Select a goal to generate a personalized study roadmap</p>
              </div>
              <Button onClick={() => navigate('/goals')}>
                Browse Goals
              </Button>
            </div>
          </Card>

          {/* All Roadmaps List */}
          <div className="space-y-4">
            <h2 className="section-heading mb-4">Your Roadmaps</h2>
            
            {loadingAllRoadmaps ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-primary-dark transition-colors" />
              </div>
            ) : goalIds.length === 0 ? (
              <Card>
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-dark-bg-tertiary flex items-center justify-center mx-auto mb-4 transition-colors">
                    <BookOpen className="w-8 h-8 text-neutral-400 dark:text-dark-text-tertiary transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-dark-text-primary mb-2 font-heading transition-colors">No Roadmaps Yet</h3>
                  <p className="text-neutral-500 dark:text-dark-text-secondary mb-4 text-sm transition-colors">You haven't generated any study roadmaps yet.</p>
                  <Button onClick={() => navigate('/goals')}>
                    Create Your First Roadmap
                  </Button>
                </div>
              </Card>
            ) : (
              goalIds.map((gid) => {
                const goalData = goalsMap[gid]
                const goalTitle = goalData?.title || `Goal #${gid}`
                const goalSteps = groupedRoadmaps[gid]
                const completedCount = goalSteps.filter((s: RoadmapStep) => s.is_completed).length
                const totalCount = goalSteps.length
                const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

                return (
                  <motion.div
                    key={gid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="hover:border-primary dark:hover:border-primary-dark transition-colors cursor-pointer" onClick={() => navigate(`/roadmaps/${gid}`)}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-primary-muted dark:bg-primary/20 flex items-center justify-center transition-colors">
                            <MapPin className="w-4 h-4 text-primary dark:text-primary-dark transition-colors" />
                          </div>
                          <h3 className="text-base font-semibold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">
                            {goalTitle}
                          </h3>
                          <Badge variant={progress === 100 ? 'success' : progress > 0 ? 'warning' : 'default'}>
                            {completedCount}/{totalCount} steps
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteRoadmap(gid)
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <ChevronRight className="w-5 h-5 text-neutral-400 dark:text-dark-text-tertiary transition-colors" />
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full h-1.5 mb-4 transition-colors">
                        <div
                          className="bg-primary dark:bg-primary-dark h-1.5 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* Preview Steps */}
                      <div className="space-y-2">
                        {goalSteps.slice(0, 3).map((step) => (
                          <div key={step.id} className="flex items-center gap-2 text-sm">
                            {step.is_completed ? (
                              <CheckCircle2 className="w-4 h-4 text-primary dark:text-primary-dark transition-colors" />
                            ) : (
                              <Circle className="w-4 h-4 text-neutral-300 dark:text-dark-text-tertiary transition-colors" />
                            )}
                            <span className={`text-sm ${step.is_completed ? 'text-neutral-400 dark:text-dark-text-tertiary line-through' : 'text-neutral-600 dark:text-dark-text-secondary'} transition-colors`}>
                              Step {step.step_number}: {step.title}
                            </span>
                          </div>
                        ))}
                        {goalSteps.length > 3 && (
                          <p className="text-sm text-neutral-400 dark:text-dark-text-tertiary pl-6 transition-colors">
                            +{goalSteps.length - 3} more steps
                          </p>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  const completedSteps = steps.filter(s => s.is_completed).length
  const progressPercentage = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0

  if (!goal) {
    return (
      <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="text-center py-16">
              <p className="text-neutral-600 mb-4">Goal not found.</p>
              <Button onClick={() => navigate('/goals')}>
                Go to Goals
              </Button>
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
            onClick={() => navigate('/roadmaps')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Roadmaps
          </Button>
          <h1 className="font-heading text-2xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">{goal.title}</h1>
          {goal.description && (
            <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">{goal.description}</p>
          )}
        </div>

        {/* Progress Bar */}
        {steps.length > 0 && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-neutral-700 dark:text-dark-text-primary transition-colors">Progress</span>
              <span className="text-sm font-semibold text-primary dark:text-primary-dark transition-colors">
                {completedSteps} / {steps.length} steps
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full h-2 transition-colors">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.8 }}
                className="bg-primary dark:bg-primary-dark h-2 rounded-full transition-colors"
              />
            </div>
          </Card>
        )}

        {/* Achievement Notifications */}
        {showCelebration && (
          <>
            {/* Level Up Banner */}
            {levelUpInfo && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-primary rounded-card p-6 mb-6 text-white"
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

            {/* Achievements Banner */}
            {newAchievements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-secondary rounded-card p-6 mb-6 text-white"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold font-heading">Achievement{newAchievements.length > 1 ? 's' : ''} Unlocked!</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {newAchievements.map((achievement, idx) => (
                    <div key={idx} className="bg-white rounded-card p-4 border border-neutral-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          achievement.difficulty === 'gold' ? 'bg-tertiary' :
                          achievement.difficulty === 'silver' ? 'bg-neutral-400' :
                          'bg-primary'
                        }`}>
                          <Star className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">{achievement.name}</p>
                          <p className="text-xs text-primary font-medium">+{achievement.xp_reward} XP</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Goal Completed Message */}
            {!levelUpInfo && newAchievements.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-primary rounded-card p-6 mb-6 text-white"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-heading">Goal Completed!</h3>
                    <p className="text-white/60">Congratulations on completing all roadmap steps!</p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Generate Roadmap Button */}
        {steps.length === 0 && (
          <Card>
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary-muted flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2 font-heading">
                Generate Your Study Roadmap
              </h2>
              <p className="text-neutral-500 mb-6 text-sm">
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
          <div className="space-y-3">
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
                    data-step-id={step.id}
                    onClick={() => handleToggleStep(step.id, step.is_completed)}
                    className="mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {step.is_completed ? (
                      <CheckCircle2 className="w-6 h-6 text-primary dark:text-primary-dark transition-colors" />
                    ) : (
                      <Circle className="w-6 h-6 text-neutral-300 dark:text-dark-text-tertiary hover:text-primary dark:hover:text-primary-dark transition-colors" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className={`text-base font-semibold mb-1 font-heading transition-colors ${
                          step.is_completed 
                            ? 'text-neutral-500 dark:text-dark-text-tertiary line-through' 
                            : 'text-neutral-900 dark:text-dark-text-primary'
                        }`}>
                          Step {step.step_number}: {step.title}
                        </h3>
                        <p className={`text-sm mb-2 transition-colors ${
                          step.is_completed 
                            ? 'text-neutral-400 dark:text-dark-text-tertiary' 
                            : 'text-neutral-600 dark:text-dark-text-secondary'
                        }`}>{step.description}</p>
                        {step.estimated_hours > 0 && (
                          <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary transition-colors">
                            Estimated: {step.estimated_hours} hours
                          </p>
                        )}
                      </div>
                    </div>
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
          feature="roadmap generation"
          limitType="daily"
          currentCount={3}
          limitCount={3}
        />
      </div>
    </div>
  )
}

