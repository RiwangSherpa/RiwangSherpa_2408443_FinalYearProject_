import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Flame,
  Layers,
  Loader2,
  MessageCircle,
  PlayCircle,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { analyticsApi, goalsApi, progressApi } from '../lib/api'
import { Analytics, Goal, QuizAnalytics, StudyTimeData } from '../types'
import Card from '../components/ui/Card'
import StudyTimeGraph from '../components/StudyTimeGraph'
import Button from '../components/ui/Button'

interface StudyHistoryPoint extends StudyTimeData {
  day: string
}

interface StreakHistoryPoint {
  date: string
  day: string
  studied: boolean
  minutes: number
  streakDays: number
  goals_worked_on?: number[]
}

type TopicPerformance = {
  topic: string
  average_score: number
  quiz_count: number
}

type ActionItem = {
  icon: React.ElementType
  title: string
  reason: string
  href: string
  cta: string
}

function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes || 0))
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function scoreTone(score: number) {
  if (score >= 70) return 'bg-primary text-white'
  if (score >= 50) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-700'
}

function fullDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildWeeklyInsight(
  analytics: Analytics,
  weekMinutes: number,
  weakTopics: TopicPerformance[],
  goals: Goal[],
) {
  if (!analytics.total_goals && !analytics.total_quizzes && weekMinutes === 0) {
    return 'No learning activity yet. Start with a goal, complete one short study session, then take a quiz to unlock richer progress insights.'
  }

  const parts: string[] = []
  if (analytics.current_streak_days > 0) {
    parts.push(`You are on a ${analytics.current_streak_days}-day streak. Keep that rhythm with one focused session today.`)
  } else if (weekMinutes > 0) {
    parts.push(`You studied ${formatDuration(weekMinutes)} this week. A short timer session today can restart your streak.`)
  }

  if (analytics.total_quizzes > 0 && analytics.average_quiz_score < 50) {
    const topics = weakTopics.slice(0, 3).map((topic) => topic.topic).join(', ')
    parts.push(`Your average quiz score is low, so focus on ${topics || 'your weakest quiz topics'} this week.`)
  }

  if (analytics.total_goals > 0 && analytics.completed_goals === analytics.total_goals) {
    parts.push('All current goals are complete. Create a new goal or revise weak topics to keep momentum useful.')
  } else {
    const activeGoals = goals.filter((goal) => !goal.is_completed)
    if (activeGoals.length > 0) {
      parts.push(`Your next visible goal is ${activeGoals[0].title}. Use quizzes or flashcards to reinforce it.`)
    }
  }

  return parts.join(' ') || 'Your dashboard is ready. Add study time and quizzes to receive sharper weekly guidance.'
}

function buildActions(
  analytics: Analytics,
  weakTopics: TopicPerformance[],
  goals: Goal[],
  weekMinutes: number,
): ActionItem[] {
  const actions: ActionItem[] = []
  const weakestTopic = weakTopics[0]

  if (weakestTopic) {
    actions.push({
      icon: PlayCircle,
      title: `Retake ${weakestTopic.topic} quiz`,
      reason: `Average score is ${Math.round(weakestTopic.average_score)}%. Practice while the gap is visible.`,
      href: '/quiz',
      cta: 'Practice Quiz',
    })
    actions.push({
      icon: MessageCircle,
      title: 'Review weak topics with AI Tutor',
      reason: 'Ask for explanations before attempting another quiz.',
      href: '/tutor',
      cta: 'Open Tutor',
    })
    actions.push({
      icon: Layers,
      title: `Generate ${weakestTopic.topic} flashcards`,
      reason: 'Turn missed concepts into quick recall practice.',
      href: '/flashcards',
      cta: 'Open Flashcards',
    })
  }

  if (actions.length < 3 && weekMinutes === 0) {
    actions.push({
      icon: Timer,
      title: 'Study for 25 minutes today',
      reason: 'One focused session will start building your activity history.',
      href: '/productivity',
      cta: 'Start Timer',
    })
  }

  if (actions.length < 3 && goals.every((goal) => goal.is_completed)) {
    actions.push({
      icon: Target,
      title: 'Create a new learning goal',
      reason: analytics.total_goals > 0 ? 'Every current goal is complete.' : 'Goals unlock roadmaps and better tracking.',
      href: '/goals',
      cta: 'Open Goals',
    })
  }

  if (actions.length < 3) {
    actions.push({
      icon: Brain,
      title: 'Brainstorm your next study focus',
      reason: 'Use your notes, files, or ideas to plan the next step.',
      href: '/brainstorm',
      cta: 'Open Brainstorm',
    })
  }

  if (actions.length < 3) {
    actions.push({
      icon: BookOpen,
      title: 'Review your notes',
      reason: 'Refresh concepts before the next quiz attempt.',
      href: '/notes',
      cta: 'Open Notes',
    })
  }

  return actions.slice(0, 3)
}

function ProgressBar({ value, tone = 'bg-primary' }: { value: number; tone?: string }) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-dark-bg-tertiary">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500 dark:border-dark-border-primary dark:bg-dark-bg-tertiary dark:text-dark-text-secondary">
      {children}
    </div>
  )
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function calendarTone(minutes: number) {
  if (minutes >= 120) return 'border-primary bg-primary text-white shadow-sm'
  if (minutes >= 60) return 'border-primary/70 bg-primary-light text-white shadow-sm'
  if (minutes > 0) return 'border-primary/50 bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark'
  return 'border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-dark-border-primary dark:bg-dark-bg-tertiary dark:text-dark-text-secondary'
}

function StudyStreakCalendar({ currentStreak, goals }: { currentStreak: number; goals: Goal[] }) {
  const today = new Date()
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [history, setHistory] = useState<Record<string, StreakHistoryPoint>>({})
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(localDateKey(today))

  useEffect(() => {
    const loadMonth = async () => {
      const year = visibleMonth.getFullYear()
      const month = visibleMonth.getMonth()
      const start = localDateKey(new Date(year, month, 1))
      const end = localDateKey(new Date(year, month, daysInMonth(year, month)))
      try {
        setLoading(true)
        const response = await progressApi.getStreakHistory({ start_date: start, end_date: end })
        const map = (response.data.history || []).reduce((acc: Record<string, StreakHistoryPoint>, item: StreakHistoryPoint) => {
          acc[item.date] = item
          return acc
        }, {})
        setHistory(map)
      } catch (error) {
        console.error('Failed to load streak calendar:', error)
        setHistory({})
      } finally {
        setLoading(false)
      }
    }
    loadMonth()
  }, [visibleMonth])

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const monthLabel = visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const firstWeekday = new Date(year, month, 1).getDay()
  const totalDays = daysInMonth(year, month)
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const goalMap = new Map(goals.map((goal) => [goal.id, goal.title]))
  const selected = history[selectedDate]

  const moveMonth = (delta: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  const moveYear = (delta: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear() + delta, current.getMonth(), 1))
  }

  const goToday = () => {
    const nextToday = new Date()
    setVisibleMonth(new Date(nextToday.getFullYear(), nextToday.getMonth(), 1))
    setSelectedDate(localDateKey(nextToday))
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">{monthLabel}</h3>
          <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">
            Current: {currentStreak} day{currentStreak === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => moveYear(-1)} className="btn-outlined !px-3 !py-2 text-xs">Prev Year</button>
          <button onClick={() => moveMonth(-1)} className="btn-outlined !px-3 !py-2 text-xs">Prev</button>
          <button onClick={goToday} className="btn-primary !px-3 !py-2 text-xs">Today</button>
          <button onClick={() => moveMonth(1)} className="btn-outlined !px-3 !py-2 text-xs">Next</button>
          <button onClick={() => moveYear(1)} className="btn-outlined !px-3 !py-2 text-xs">Next Year</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-neutral-400 dark:text-dark-text-tertiary sm:gap-2">
        {weekdayLabels.map((label) => <div key={label}>{label}</div>)}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: firstWeekday }).map((_, index) => (
          <div key={`blank-${index}`} className="aspect-square min-w-0 rounded-md" />
        ))}
        {Array.from({ length: totalDays }).map((_, index) => {
          const dayNumber = index + 1
          const dateKey = localDateKey(new Date(year, month, dayNumber))
          const data = history[dateKey]
          const minutes = Number(data?.minutes || 0)
          const isToday = dateKey === localDateKey(today)
          const isSelected = dateKey === selectedDate
          const goalNames = (data?.goals_worked_on || []).map((id) => goalMap.get(id) || `Goal #${id}`)
          const tooltip = [
            fullDate(dateKey),
            minutes > 0 ? `Study time: ${formatDuration(minutes)}` : 'No study',
            goalNames.length ? `Goals: ${goalNames.join(', ')}` : '',
          ].filter(Boolean).join(' | ')

          return (
            <button
              key={dateKey}
              type="button"
              title={tooltip}
              aria-label={tooltip}
              onClick={() => setSelectedDate(dateKey)}
              className={`relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-md border text-[11px] font-semibold transition-all sm:text-xs ${calendarTone(minutes)} ${
                isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-primary-dark dark:ring-offset-dark-bg-secondary' : ''
              } ${isToday ? 'border-primary dark:border-primary-dark' : ''}`}
            >
              <span>{dayNumber}</span>
              {minutes > 0 && <span className="mt-0.5 text-[10px] font-medium">{Math.round(minutes)}m</span>}
              {isToday && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary dark:bg-primary-dark" />}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 dark:text-dark-text-tertiary">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-neutral-200 bg-neutral-100" /> No study</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-primary-muted" /> Studied</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-primary" /> More study</span>
        </div>
        {loading && <span>Loading calendar...</span>}
      </div>

      <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
        <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">{fullDate(selectedDate)}</p>
        <p className="mt-1 text-neutral-500 dark:text-dark-text-secondary">
          {selected?.minutes ? `Studied ${formatDuration(selected.minutes)}.` : 'No study recorded.'}
        </p>
        {selected?.goals_worked_on?.length ? (
          <p className="mt-1 text-neutral-500 dark:text-dark-text-secondary">
            Goals: {selected.goals_worked_on.map((id) => goalMap.get(id) || `Goal #${id}`).join(', ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default function ProfileAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [quizAnalytics, setQuizAnalytics] = useState<QuizAnalytics | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [studyTimeData, setStudyTimeData] = useState<StudyHistoryPoint[]>([])

  useEffect(() => {
    document.title = 'Progress Dashboard | StudyBuddy'
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setError('')
      const [analyticsRes, studyHistoryRes, quizAnalyticsRes, goalsRes] = await Promise.allSettled([
        progressApi.getAnalytics(),
        progressApi.getStudyHistory(30),
        analyticsApi.getQuizAnalytics(),
        goalsApi.getAll(),
      ])

      if (analyticsRes.status === 'rejected') {
        throw analyticsRes.reason
      }

      setAnalytics(analyticsRes.value.data)
      setStudyTimeData(studyHistoryRes.status === 'fulfilled' ? studyHistoryRes.value.data.history || [] : [])
      setQuizAnalytics(quizAnalyticsRes.status === 'fulfilled' ? quizAnalyticsRes.value.data : null)
      setGoals(goalsRes.status === 'fulfilled' ? goalsRes.value.data || [] : [])
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Could not load progress dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 rounded-card border border-neutral-200 bg-white px-5 py-4 text-neutral-600 shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-secondary dark:text-dark-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading progress dashboard...
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="bg-neutral-50 px-4 py-8 dark:bg-dark-bg-primary sm:px-6">
        <Card>
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <p className="text-neutral-600 dark:text-dark-text-secondary">{error || 'No analytics data available yet.'}</p>
          </div>
        </Card>
      </div>
    )
  }

  const completionRate = analytics.total_goals > 0
    ? Math.round((analytics.completed_goals / analytics.total_goals) * 100)
    : 0
  const weekStudyData = studyTimeData.slice(-7)
  const weekMinutes = weekStudyData.reduce((sum, day) => sum + Number(day.minutes || 0), 0)
  const bestStudyDay = weekStudyData.reduce<StudyHistoryPoint | null>((best, day) => {
    if (!best || Number(day.minutes || 0) > Number(best.minutes || 0)) return day
    return best
  }, null)
  const averageDailyMinutes = weekStudyData.length ? weekMinutes / weekStudyData.length : 0
  const topicPerformance = quizAnalytics?.analytics.topic_performance || analytics.quiz_stats?.topic_performance || []
  const weakTopics = topicPerformance
    .filter((topic) => topic.average_score < 50)
    .sort((a, b) => a.average_score - b.average_score)
  const strongTopics = topicPerformance
    .filter((topic) => topic.average_score >= 70)
    .sort((a, b) => b.average_score - a.average_score)
  const activeGoals = goals.filter((goal) => !goal.is_completed)
  const completedGoals = goals.filter((goal) => goal.is_completed)
  const insight = buildWeeklyInsight(analytics, weekMinutes, weakTopics, goals)
  const actions = buildActions(analytics, weakTopics, goals, weekMinutes)

  const statCards = [
    {
      label: 'Total Study Time',
      value: formatDuration(analytics.total_study_time_minutes),
      subtext: `This week: ${formatDuration(weekMinutes)}`,
      icon: BookOpen,
      iconClass: 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark',
    },
    {
      label: 'Goals Completed',
      value: `${analytics.completed_goals} / ${analytics.total_goals}`,
      subtext: analytics.total_goals ? `${completionRate}% completion` : 'Create a goal to start',
      icon: Target,
      iconClass: 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark',
      progress: completionRate,
    },
    {
      label: 'Current Streak',
      value: `${analytics.current_streak_days} day${analytics.current_streak_days === 1 ? '' : 's'}`,
      subtext: analytics.current_streak_days > 0 ? 'Keep it going' : 'Study today to start',
      icon: Flame,
      iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    },
    {
      label: 'Average Quiz Score',
      value: analytics.total_quizzes > 0 ? `${Math.round(analytics.average_quiz_score)}%` : '0%',
      subtext: analytics.total_quizzes > 0
        ? `${analytics.total_quizzes} quiz${analytics.total_quizzes === 1 ? '' : 'zes'} taken - Best: ${Math.round(analytics.best_quiz_score)}%`
        : 'Take quizzes to unlock insight',
      icon: TrendingUp,
      iconClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    },
  ]

  return (
    <div className="bg-neutral-50 px-4 py-8 transition-colors duration-300 dark:bg-dark-bg-primary sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-primary transition-colors dark:text-primary-dark">Progress Dashboard</h1>
          <p className="mt-2 text-sm text-neutral-500 transition-colors dark:text-dark-text-secondary">
            Track your learning journey and achievements
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full shadow-sm">
                  <div className="flex h-full min-h-[120px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">{stat.label}</p>
                        <p className="mt-3 font-heading text-3xl font-bold text-neutral-950 dark:text-dark-text-primary">{stat.value}</p>
                      </div>
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">{stat.subtext}</p>
                      {'progress' in stat && <div className="mt-3"><ProgressBar value={stat.progress || 0} /></div>}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-heading">Weekly Study Insight</h2>
                <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">Generated from your current progress data</p>
              </div>
            </div>
            <p className="text-sm leading-7 text-neutral-700 dark:text-dark-text-secondary">{insight}</p>
          </Card>

          <Card className="shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
                <PlayCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-heading">Recommended Next Actions</h2>
                <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">Three practical steps for your next session</p>
              </div>
            </div>
            <div className="space-y-3">
              {actions.map((action) => {
                const Icon = action.icon
                return (
                  <div key={action.title} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-dark-border-primary sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">{action.title}</p>
                        <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">{action.reason}</p>
                      </div>
                    </div>
                    <Link to={action.href} className="shrink-0">
                      <Button size="sm" variant="secondary" className="w-full sm:w-auto">{action.cta}</Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">This Week</p>
                <p className="mt-2 font-heading text-xl font-bold text-neutral-900">{formatDuration(weekMinutes)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Best Day</p>
                <p className="mt-2 font-heading text-xl font-bold text-neutral-900">
                  {bestStudyDay && bestStudyDay.minutes > 0 ? `${bestStudyDay.day} - ${formatDuration(bestStudyDay.minutes)}` : 'No study yet'}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Daily Avg</p>
                <p className="mt-2 font-heading text-xl font-bold text-neutral-900">{formatDuration(averageDailyMinutes)}</p>
              </Card>
            </div>
            <StudyTimeGraph data={studyTimeData} />
          </div>

          <Card className="shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-heading">Study Streak Calendar</h2>
                <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">Browse study activity by month</p>
              </div>
            </div>
            <StudyStreakCalendar currentStreak={analytics.current_streak_days} goals={goals} />
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-heading">Quiz Performance by Topic</h2>
                <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">Average score and attempts per topic</p>
              </div>
            </div>
            {topicPerformance.length > 0 ? (
              <div className="space-y-4">
                {topicPerformance.map((topic) => (
                  <div key={topic.topic}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">{topic.topic}</p>
                        <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">
                          {topic.quiz_count} attempt{topic.quiz_count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${scoreTone(topic.average_score)}`}>
                        {Math.round(topic.average_score)}%
                      </span>
                    </div>
                    <ProgressBar value={topic.average_score} tone={topic.average_score >= 70 ? 'bg-primary' : topic.average_score >= 50 ? 'bg-amber-500' : 'bg-red-500'} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No quiz data yet. Take your first quiz to unlock performance insights.</EmptyState>
            )}
          </Card>

          <Card className="shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-heading">Goal Progress Breakdown</h2>
                <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">Completed goals, active goals, and next step</p>
              </div>
            </div>
            {goals.length > 0 ? (
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-neutral-700 dark:text-dark-text-secondary">Overall completion</span>
                    <span className="font-bold text-primary">{completionRate}%</span>
                  </div>
                  <ProgressBar value={completionRate} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">Completed Goals</p>
                    {completedGoals.length > 0 ? (
                      <div className="space-y-2">
                        {completedGoals.slice(0, 5).map((goal) => (
                          <div key={goal.id} className="rounded-lg bg-primary-muted px-3 py-2 text-sm font-medium text-primary dark:bg-primary/15 dark:text-primary-dark">{goal.title}</div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">None yet</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">Active Goals</p>
                    {activeGoals.length > 0 ? (
                      <div className="space-y-2">
                        {activeGoals.slice(0, 5).map((goal) => (
                          <div key={goal.id} className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary">{goal.title}</div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">None</p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-primary-muted bg-primary-muted/60 p-3 text-sm text-primary dark:border-primary-dark/30 dark:bg-primary/10 dark:text-primary-dark">
                  {activeGoals.length > 0 ? `Suggested next step: continue ${activeGoals[0].title} or reinforce it with a quiz.` : 'Suggested next step: create a new goal or revise weak topics.'}
                </div>
              </div>
            ) : (
              <EmptyState>No goals yet. Create a learning goal to unlock progress breakdowns.</EmptyState>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-heading">Areas to Improve</h2>
                <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">Topics that need more practice</p>
              </div>
            </div>
            {weakTopics.length > 0 ? (
              <div className="space-y-3">
                {weakTopics.map((topic) => (
                  <div key={topic.topic} className="rounded-lg border border-red-100 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">{topic.topic}</p>
                        <p className="text-sm text-red-700 dark:text-red-300">Average score: {Math.round(topic.average_score)}%</p>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-dark-text-secondary">Recommended: Retake quiz and review basics.</p>
                      </div>
                      <Link to="/quiz" className="shrink-0">
                        <Button size="sm" variant="secondary">Practice Quiz</Button>
                      </Link>
                    </div>
                    <ProgressBar value={topic.average_score} tone="bg-red-500" />
                  </div>
                ))}
              </div>
            ) : analytics.total_quizzes > 0 ? (
              <EmptyState>No weak areas found. Great job!</EmptyState>
            ) : (
              <EmptyState>No quiz data yet. Take your first quiz to identify areas to improve.</EmptyState>
            )}
          </Card>

          <Card className="shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-heading">Strong Areas</h2>
                <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">Topics scoring 70% or higher</p>
              </div>
            </div>
            {strongTopics.length > 0 ? (
              <div className="space-y-3">
                {strongTopics.map((topic) => (
                  <div key={topic.topic} className="flex items-center justify-between gap-3 rounded-lg border border-primary-muted bg-primary-muted/60 p-3 dark:border-primary-dark/30 dark:bg-primary/10">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">{topic.topic}</p>
                      <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">{topic.quiz_count} attempt{topic.quiz_count === 1 ? '' : 's'}</p>
                    </div>
                    <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-white">{Math.round(topic.average_score)}%</span>
                  </div>
                ))}
              </div>
            ) : analytics.total_quizzes > 0 ? (
              <EmptyState>No strong areas yet. Score above 70% in a topic to unlock strong areas.</EmptyState>
            ) : (
              <EmptyState>Complete quizzes to identify your strengths.</EmptyState>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
