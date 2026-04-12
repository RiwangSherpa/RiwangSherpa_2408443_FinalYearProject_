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
  const [isCheckingAchievements, setIsCheckingAchievements] = useState(false)
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
      
      if (profileRes.data.newly_earned?.length > 0) {
        setNewlyEarned(profileRes.data.newly_earned)
      }
    } catch (error) {
      console.error('Failed to load gamification data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkNewAchievements = async () => {
    if (isCheckingAchievements) return
    
    try {
      setIsCheckingAchievements(true)
      const response = await gamificationApi.checkAchievements()
      if (response.data.new_achievements?.length > 0) {
        setNewlyEarned(response.data.new_achievements)
        if (response.data.level_up) {
          setLevelUpInfo({
            oldLevel: response.data.old_level,
            newLevel: response.data.new_level
          })
        }
        if (response.data.current_level_progress) {
          setLevelProgress(response.data.current_level_progress)
        }
        loadData()
      } else {
        setActiveTab('achievements')
        setTimeout(() => {
          const lockedSection = document.getElementById('locked-achievements')
          if (lockedSection) {
            lockedSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 200)
      }
    } catch (error) {
      console.error('Failed to check achievements:', error)
      alert('Failed to check achievements. Please try again.')
    } finally {
      setIsCheckingAchievements(false)
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
        return 'bg-tertiary'
      case 'silver':
        return 'bg-neutral-400'
      case 'gold':
        return 'bg-tertiary'
      case 'platinum':
        return 'bg-secondary'
      default:
        return 'bg-neutral-500'
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg-primary transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-primary-dark"></div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-tertiary dark:bg-tertiary rounded-2xl transition-colors">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary dark:text-primary-dark font-heading transition-colors">
                Achievements
              </h1>
              <p className="text-neutral-500 dark:text-dark-text-secondary text-sm mt-0.5 transition-colors">
                Track progress, earn badges, and level up
              </p>
            </div>
          </div>
        </motion.div>

        {/* Level & XP Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary dark:bg-primary-dark rounded-card p-8 text-white mb-8 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center">
                <Crown className="w-10 h-10" />
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium mb-1">Current Level</p>
                <p className="text-4xl font-bold font-heading">{levelProgress?.current_level || 1}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-sm font-medium mb-1">Total XP</p>
              <p className="text-3xl font-bold font-heading">{levelProgress?.total_xp.toLocaleString() || 0}</p>
            </div>
          </div>
          
          <div className="mt-8">
            <div className="flex justify-between text-sm mb-3 font-medium">
              <span>Level {levelProgress?.current_level || 1}</span>
              <span>{levelProgress?.xp_in_level || 0} / {levelProgress?.xp_needed_for_level || 100} XP</span>
              <span>Level {(levelProgress?.current_level || 1) + 1}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress?.progress_percentage || 0}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="bg-white rounded-full h-3"
              />
            </div>
          </div>
        </motion.div>

        {/* New Achievements Banner */}
        {newlyEarned.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-secondary dark:bg-secondary-dark rounded-card p-6 mb-8 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white font-heading">New Achievement{newlyEarned.length > 1 ? 's' : ''} Unlocked!</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newlyEarned.map((achievement) => (
                <div key={achievement.id || (achievement as any).achievement_id} className="bg-white dark:bg-dark-bg-secondary rounded-card p-4 border border-neutral-200 dark:border-dark-border-primary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${getDifficultyColor(achievement.difficulty)} flex items-center justify-center transition-colors`}>
                      {getDifficultyIcon(achievement.difficulty)}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-dark-text-primary transition-colors">{achievement.name}</p>
                      <p className="text-xs text-primary dark:text-primary-dark font-medium transition-colors">+{achievement.xp_reward} XP</p>
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
            className="bg-primary dark:bg-primary-dark rounded-card p-6 mb-8 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-heading">Level Up!</h3>
                  <p className="text-white/60">You reached level {levelUpInfo.newLevel}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-white/60 mb-1">Level</p>
                <p className="text-4xl font-bold text-white font-heading">{levelUpInfo.newLevel}</p>
              </div>
            </div>
            <button
              onClick={() => setLevelUpInfo(null)}
              className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
            >
              Awesome!
            </button>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex bg-white dark:bg-dark-bg-secondary rounded-card p-1.5 border border-neutral-200 dark:border-dark-border-primary transition-colors duration-300">
            {(['overview', 'achievements'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'bg-primary dark:bg-primary-dark text-white'
                    : 'text-neutral-600 dark:text-dark-text-secondary hover:bg-neutral-50 dark:hover:bg-dark-bg-tertiary'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'achievements' && `Achievements (${achievements.earned.length}/${achievements.earned.length + achievements.locked.length})`}
              </button>
            ))}
          </div>
          <button
            onClick={checkNewAchievements}
            disabled={isCheckingAchievements}
            className="sm:ml-auto px-6 py-3 bg-primary dark:bg-primary-dark hover:bg-primary-light dark:hover:bg-primary/90 text-white rounded-card font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingAchievements ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Checking...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Check for New
              </>
            )}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Achievements */}
            <div className="bg-white dark:bg-dark-bg-secondary rounded-card p-6 border border-neutral-200 dark:border-dark-border-primary transition-colors duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-tertiary dark:bg-tertiary rounded-xl transition-colors">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">Recent Achievements</h3>
                </div>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="text-sm text-primary dark:text-primary-dark hover:text-primary-light dark:hover:text-primary-dark font-medium flex items-center gap-1 transition-colors"
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
                    className={`${getDifficultyColor(achievement.difficulty)} rounded-card p-5 text-white`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
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
                    <div className="w-16 h-16 bg-primary-muted dark:bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
                      <Trophy className="w-8 h-8 text-primary dark:text-primary-dark transition-colors" />
                    </div>
                    <p className="text-neutral-500 dark:text-dark-text-secondary transition-colors">No achievements yet. Start learning to earn your first badge!</p>
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
                <div className="p-2 bg-primary-muted dark:bg-primary/20 rounded-xl transition-colors">
                  <Unlock className="w-5 h-5 text-primary dark:text-primary-dark transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">Earned ({achievements.earned.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.earned.map((achievement, idx) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`${getDifficultyColor(achievement.difficulty)} rounded-card p-5 text-white`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
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
              <div id="locked-achievements">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-neutral-100 dark:bg-dark-bg-tertiary rounded-xl transition-colors">
                    <Lock className="w-5 h-5 text-neutral-400 dark:text-dark-text-tertiary transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">Locked ({achievements.locked.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.locked.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="bg-neutral-50 dark:bg-dark-bg-secondary rounded-card p-5 border border-neutral-200 dark:border-dark-border-primary transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-xl flex items-center justify-center">
                          {achievement.hidden ? <Lock className="w-5 h-5 text-neutral-400 dark:text-dark-text-tertiary transition-colors" /> : getCategoryIcon(achievement.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-700 dark:text-dark-text-primary transition-colors">
                            {achievement.hidden ? '???' : achievement.name}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-dark-text-secondary mt-1 transition-colors">
                            {achievement.hidden ? 'Hidden achievement' : achievement.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-neutral-400 dark:text-dark-text-tertiary transition-colors">+{achievement.xp_reward}</p>
                          <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary transition-colors">XP</p>
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
