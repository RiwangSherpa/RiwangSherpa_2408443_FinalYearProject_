import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Sparkles, Loader2, ArrowLeft, BookOpen, ChevronRight, MapPin, Trash2, Trophy, Star, Crown } from 'lucide-react'
import { motion } from 'framer-motion'
import { goalsApi, roadmapsApi } from '../lib/api'
import { Goal, RoadmapStep } from '../types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function StudyRoadmap() {
  const { goalId } = useParams<{ goalId?: string }>()
  const navigate = useNavigate()
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
      // Create a map of goal_id to goal for quick lookup
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
        const response = await roadmapsApi.completeStep(stepId)
        // Check for achievements and level up
        if (response.data.goal_completed) {
          setShowCelebration(true)
          if (response.data.new_achievements?.length > 0) {
            setNewAchievements(response.data.new_achievements)
          }
          if (response.data.level_up) {
            setLevelUpInfo(response.data.level_up)
          }
          // Hide celebration after 5 seconds
          setTimeout(() => {
            setShowCelebration(false)
          }, 5000)
        }
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



  const handleDeleteRoadmap = async (goalIdToDelete: number) => {
    if (!confirm('Are you sure you want to delete this roadmap? This will delete all steps for this goal.')) {
      return
    }
    try {
      await roadmapsApi.delete(goalIdToDelete)
      // Refresh the list
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
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  // Show all roadmaps when no goal is selected
  if (!goalId) {
    const groupedRoadmaps = groupRoadmapsByGoal(allRoadmaps)
    const goalIds = Object.keys(groupedRoadmaps).map(Number)

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Roadmaps</h1>
          <p className="text-gray-600">View all your study roadmaps across different goals</p>
        </div>

        {/* Create New Roadmap Section */}
        <Card className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Create a New Roadmap</h2>
              <p className="text-gray-600">Select a goal to generate a personalized study roadmap</p>
            </div>
            <Button onClick={() => navigate('/goals')}>
              Browse Goals
            </Button>
          </div>
        </Card>

        {/* All Roadmaps List */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Roadmaps</h2>
          
          {loadingAllRoadmaps ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : goalIds.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Roadmaps Yet</h3>
                <p className="text-gray-600 mb-4">You haven't generated any study roadmaps yet.</p>
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
                  <Card className="hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
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
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => navigate(`/roadmaps/${gid}`)}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Preview Steps */}
                    <div className="space-y-2">
                      {goalSteps.slice(0, 3).map((step) => (
                        <div key={step.id} className="flex items-center gap-2 text-sm">
                          {step.is_completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={step.is_completed ? 'text-gray-500 line-through' : 'text-gray-700'}>
                            Step {step.step_number}: {step.title}
                          </span>
                        </div>
                      ))}
                      {goalSteps.length > 3 && (
                        <p className="text-sm text-gray-500 pl-6">
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
    )
  }

  const completedSteps = steps.filter(s => s.is_completed).length
  const progressPercentage = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0

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
          onClick={() => navigate('/roadmaps')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Roadmaps
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

      {/* Achievement Notifications */}
      {showCelebration && (
        <>
          {/* Level Up Banner */}
          {levelUpInfo && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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

          {/* Achievements Banner */}
          {newAchievements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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

          {/* Goal Completed Message */}
          {!levelUpInfo && newAchievements.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 mb-6 text-white shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Goal Completed!</h3>
                  <p className="text-white/80">Congratulations on completing all roadmap steps!</p>
                </div>
              </div>
            </motion.div>
          )}
        </>
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

