import { Link } from 'react-router-dom'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  Layers,
  Network,
  Plus,
  Sparkles,
  Target,
  Trophy,
  UploadCloud,
} from 'lucide-react'
import Badge from '../ui/Badge'
import type { ActivityData } from '../../types'

function relativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  if (date.toDateString() === now.toDateString()) return 'Today'

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getActivityMeta(activity: ActivityData) {
  switch (activity.type) {
    case 'goal_created':
      return { icon: Plus, badge: 'Goal', tone: 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark' }
    case 'goal_completed':
      return { icon: CheckCircle2, badge: 'Goal', tone: 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark' }
    case 'roadmap_generated':
    case 'roadmap_step_completed':
      return { icon: Target, badge: 'Roadmap', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' }
    case 'quiz_attempt':
      return { icon: HelpCircle, badge: 'Quiz', tone: 'bg-secondary-light text-secondary dark:bg-secondary/20 dark:text-secondary-dark' }
    case 'note_created':
      return { icon: FileText, badge: 'Note', tone: 'bg-neutral-100 text-neutral-600 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary' }
    case 'brainstorm_created':
      return { icon: Sparkles, badge: 'Brainstorm', tone: 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark' }
    case 'file_uploaded':
      return { icon: UploadCloud, badge: 'Upload', tone: 'bg-neutral-100 text-neutral-600 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary' }
    case 'flashcard_deck_generated':
      return { icon: Layers, badge: 'Flashcards', tone: 'bg-secondary-light text-secondary dark:bg-secondary/20 dark:text-secondary-dark' }
    case 'mindmap_generated':
      return { icon: Network, badge: 'Mindmap', tone: 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark' }
    case 'productivity_session_completed':
    case 'study_session':
    case 'study_time_tracked':
      return { icon: Clock, badge: 'Study', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' }
    case 'achievement_unlocked':
      return { icon: Trophy, badge: 'Achievement', tone: 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark' }
    case 'level_up':
      return { icon: Award, badge: 'Level', tone: 'bg-secondary-light text-secondary dark:bg-secondary/20 dark:text-secondary-dark' }
    default:
      return { icon: BookOpen, badge: 'Activity', tone: 'bg-neutral-100 text-neutral-600 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary' }
  }
}

function activityHref(activity: ActivityData) {
  if (activity.related_type === 'quiz' && activity.related_id) return `/quiz/review/${activity.related_id}`
  if ((activity.related_type === 'goal' || activity.related_type === 'roadmap') && (activity.goal_id || activity.related_id)) {
    return `/roadmaps/${activity.goal_id || activity.related_id}`
  }
  if (activity.related_type === 'note' && activity.related_id) return `/notes/${activity.related_id}`
  if (activity.related_type === 'brainstorm') return '/brainstorm'
  if (activity.related_type === 'flashcards') return '/flashcards'
  if (activity.related_type === 'mindmap') return '/mindmap'
  if (activity.related_type === 'productivity') return '/productivity'
  if (activity.related_type === 'achievement' || activity.related_type === 'gamification') return '/gamification'
  if (activity.related_type === 'progress') return '/progress'
  return ''
}

interface ActivityListProps {
  activities: ActivityData[]
  compact?: boolean
}

export default function ActivityList({ activities, compact = false }: ActivityListProps) {
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {activities.map((activity) => {
        const meta = getActivityMeta(activity)
        const Icon = meta.icon
        const href = activityHref(activity)
        const content = (
          <>
            <div className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} flex shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
              <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate font-semibold text-neutral-900 dark:text-dark-text-primary">{activity.title}</p>
                <span className="shrink-0 text-xs text-neutral-400 dark:text-dark-text-tertiary">
                  {relativeTime(activity.created_at || activity.timestamp)}
                </span>
              </div>
              <p className={`${compact ? 'line-clamp-1' : 'line-clamp-2'} mt-1 text-sm leading-5 text-neutral-500 dark:text-dark-text-secondary`}>
                {activity.description}{activity.goal_title ? ` - ${activity.goal_title}` : ''}
              </p>
              {!compact && (
                <div className="mt-2">
                  <Badge variant="default" size="sm">{meta.badge}</Badge>
                </div>
              )}
            </div>
            {href && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-neutral-300" />}
          </>
        )

        return href ? (
          <Link
            key={activity.id}
            to={href}
            className={`${compact ? 'p-2.5' : 'p-3'} flex gap-3 rounded-lg border border-transparent transition hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-dark-border-primary dark:hover:bg-dark-bg-tertiary`}
          >
            {content}
          </Link>
        ) : (
          <div key={activity.id} className={`${compact ? 'p-2.5' : 'p-3'} flex gap-3 rounded-lg`}>
            {content}
          </div>
        )
      })}
    </div>
  )
}
