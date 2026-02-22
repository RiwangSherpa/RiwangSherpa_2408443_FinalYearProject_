import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Star,
  Zap,
  Target,
  Award,
  Crown,
  Lock,
  Unlock,
  Flame,
  BookOpen,
  CheckCircle,
  Sparkles,
  ChevronRight,
  Medal
} from 'lucide-react'
import { gamificationApi } from '../lib/api'

interface Achievement {
  id: number
  name: string
  description: string
  category: string
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum'
  xp_reward: number
  earned_at?: string
  hidden?: boolean
}

interface LevelProgress {
  current_level: number
  xp_in_level: number
  xp_needed_for_level: number
  total_xp: number
  progress_percentage: number
}

export default function Gamification() {
  const [achievements, setAchievements] = useState<{ earned: Achievement[], locked: Achievement[] }>({ earned: [], locked: [] })
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements'>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [newlyEarned, setNewlyEarned] = useState<Achievement[]>([])

  const [levelUpInfo, setLevelUpInfo] = useState<{oldLevel: number, newLevel: number} | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [profileRes] = await Promise.all([
        gamificationApi.getProfile()
      ])
      
      setNewlyEarned(profileRes.data.newly_earned || [])
      setAchievements(profileRes.data.achievements)
      setLevelProgress(profileRes.data.level_progress)
    } catch (error) {
      console.error('Failed to load gamification data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkNewAchievements = async () => {
    try {
      const response = await gamificationApi.checkAchievements()
      if (response.data.new_achievements?.length > 0) {
        setNewlyEarned(response.data.new_achievements)
        // Check for level up
        if (response.data.level_up) {
          setLevelUpInfo({
            oldLevel: response.data.old_level,
            newLevel: response.data.new_level
          })
        }
        // Update level progress
        if (response.data.current_level_progress) {
          setLevelProgress(response.data.current_level_progress)
        }
        loadData()
      }
    } catch (error) {
      console.error('Failed to check achievements:', error)
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze':
        return <Medal className="w-5 h-5 text-amber-600" />
      case 'silver':
        return <Medal className="w-5 h-5 text-gray-400" />
      case 'gold':
        return <Trophy className="w-5 h-5 text-yellow-500" />
      case 'platinum':
        return <Crown className="w-5 h-5 text-purple-500" />
      default:
        return <Award className="w-5 h-5 text-gray-500" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze':
        return 'from-amber-600 to-orange-600'
      case 'silver':
        return 'from-gray-400 to-gray-500'
      case 'gold':
        return 'from-yellow-400 to-orange-500'
      case 'platinum':
        return 'from-purple-500 to-pink-500'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'study':
        return <BookOpen className="w-4 h-4" />
      case 'streak':
        return <Flame className="w-4 h-4" />
      case 'quiz':
        return <Target className="w-4 h-4" />
      case 'goal':
        return <CheckCircle className="w-4 h-4" />
      case 'roadmap':
        return <Zap className="w-4 h-4" />
      default:
        return <Star className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg shadow-orange-500/25">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                Achievements
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Track progress, earn badges, and level up
              </p>
            </div>
          </div>
        </motion.div>

        {/* Level & XP Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-8 text-white mb-8 shadow-xl shadow-indigo-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center shadow-lg">
                <Crown className="w-12 h-12" />
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium mb-1">Current Level</p>
                <p className="text-5xl font-bold">{levelProgress?.current_level || 1}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-sm font-medium mb-1">Total XP</p>
              <p className="text-4xl font-bold">{levelProgress?.total_xp.toLocaleString() || 0}</p>
            </div>
          </div>
          
          <div className="mt-8">
            <div className="flex justify-between text-sm mb-3 font-medium">
              <span>Level {levelProgress?.current_level || 1}</span>
              <span>{levelProgress?.xp_in_level || 0} / {levelProgress?.xp_needed_for_level || 100} XP</span>
              <span>Level {(levelProgress?.current_level || 1) + 1}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-4 backdrop-blur">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress?.progress_percentage || 0}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="bg-white rounded-full h-4 shadow-lg"
              />
            </div>
          </div>
        </motion.div>

        {/* New Achievements Banner */}
        {newlyEarned.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-3xl p-6 mb-8 shadow-xl shadow-orange-500/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">New Achievement{newlyEarned.length > 1 ? 's' : ''} Unlocked!</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newlyEarned.map((achievement) => (
                <div key={achievement.id || (achievement as any).achievement_id} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getDifficultyColor(achievement.difficulty)} flex items-center justify-center`}>
                      {getDifficultyIcon(achievement.difficulty)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{achievement.name}</p>
                      <p className="text-xs text-emerald-600 font-medium">+{achievement.xp_reward} XP</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Level Up Banner */}
        {levelUpInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 mb-8 shadow-xl shadow-indigo-500/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Level Up!</h3>
                  <p className="text-white/80">You reached level {levelUpInfo.newLevel}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-white/60 mb-1">Level</p>
                <p className="text-4xl font-bold text-white">{levelUpInfo.newLevel}</p>
              </div>
            </div>
            <button
              onClick={() => setLevelUpInfo(null)}
              className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white font-medium transition-colors"
            >
              Awesome!
            </button>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex bg-white dark:bg-gray-800/80 backdrop-blur rounded-2xl p-1.5 shadow-sm border border-gray-100 dark:border-gray-700/50">
            {(['overview', 'achievements'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'achievements' && `Achievements (${achievements.earned.length}/${achievements.earned.length + achievements.locked.length})`}
              </button>
            ))}
          </div>
          <button
            onClick={checkNewAchievements}
            className="sm:ml-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Check for New
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Achievements */}
            <div className="bg-white dark:bg-gray-800/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Achievements</h3>
                </div>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.earned.slice(0, 6).map((achievement, idx) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={`bg-gradient-to-r ${getDifficultyColor(achievement.difficulty)} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                        {getCategoryIcon(achievement.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{achievement.name}</p>
                        <p className="text-xs opacity-80 truncate">{achievement.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {achievements.earned.length === 0 && (
                  <div className="col-span-3 text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">No achievements yet. Start learning to earn your first badge!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-8">
            {/* Earned Achievements */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Unlock className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Earned ({achievements.earned.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.earned.map((achievement, idx) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={`bg-gradient-to-r ${getDifficultyColor(achievement.difficulty)} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0">
                        {getCategoryIcon(achievement.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{achievement.name}</p>
                        <p className="text-xs opacity-80 mt-1">{achievement.description}</p>
                        <p className="text-xs mt-2 opacity-60">
                          Earned {achievement.earned_at && new Date(achievement.earned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">+{achievement.xp_reward}</p>
                        <p className="text-xs opacity-60">XP</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Locked Achievements */}
            {achievements.locked.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Locked ({achievements.locked.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.locked.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                          {achievement.hidden ? <Lock className="w-5 h-5 text-gray-400" /> : getCategoryIcon(achievement.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-700 dark:text-gray-300">
                            {achievement.hidden ? '???' : achievement.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {achievement.hidden ? 'Hidden achievement' : achievement.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-400">+{achievement.xp_reward}</p>
                          <p className="text-xs text-gray-400">XP</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
