import { useCallback, useRef } from 'react'
import { gamificationApi } from '../lib/api'
import { useData } from '../contexts/DataContext'
import { useToast } from '../components/ui/ToastContext'

export interface AchievementNotification {
  achievement_id?: number
  id?: number
  name: string
  xp_reward: number
}

function achievementKey(achievement: AchievementNotification) {
  return String(achievement.achievement_id ?? achievement.id ?? achievement.name)
}

export function useAchievementNotifications() {
  const toast = useToast()
  const { refreshLevel, refreshAnalytics } = useData()
  const shownIds = useRef<Set<string>>(new Set())

  const showAchievements = useCallback((achievements?: AchievementNotification[], levelUp?: { new_level?: number; newLevel?: number } | null) => {
    const fresh = (achievements || []).filter((achievement) => {
      const key = achievementKey(achievement)
      if (shownIds.current.has(key)) return false
      shownIds.current.add(key)
      return true
    })

    fresh.forEach((achievement) => {
      toast.achievement(`${achievement.name} earned +${achievement.xp_reward} XP`)
    })

    const newLevel = levelUp?.new_level ?? levelUp?.newLevel
    if (newLevel) {
      toast.success(`You reached level ${newLevel}.`, 'Level up')
    }
  }, [toast])

  const checkForAchievements = useCallback(async () => {
    try {
      const response = await gamificationApi.checkAchievements()
      const achievements = response.data.new_achievements || []
      showAchievements(achievements, response.data.level_up ? { new_level: response.data.new_level } : null)
      if (achievements.length > 0 || response.data.level_up) {
        await Promise.allSettled([refreshLevel(), refreshAnalytics()])
      }
      return achievements
    } catch (error) {
      console.error('Failed to check achievements:', error)
      return []
    }
  }, [refreshAnalytics, refreshLevel, showAchievements])

  return { showAchievements, checkForAchievements }
}
