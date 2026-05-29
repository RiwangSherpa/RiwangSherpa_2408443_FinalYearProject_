import { Trophy } from 'lucide-react'

export interface AchievementToastItem {
  achievement_id?: number
  id?: number
  name: string
  description?: string
  xp_reward: number
}

export default function AchievementUnlockToast({ achievement }: { achievement: AchievementToastItem }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
        <Trophy className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">
          {achievement.name}
        </p>
        <p className="text-xs font-medium text-primary dark:text-primary-dark">
          +{achievement.xp_reward} XP
        </p>
      </div>
    </div>
  )
}
