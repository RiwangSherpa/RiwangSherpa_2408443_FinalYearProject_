import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Target,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { progressApi, roadmapsApi } from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import ActivityList from '../components/activity/ActivityList'
import type { RoadmapStep } from '../types'

type GoalRoadmapSummary = {
  total: number
  completed: number
  nextStep?: RoadmapStep
}

function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes || 0))
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function progressFor(summary?: GoalRoadmapSummary) {
  if (!summary || summary.total === 0) return 0
  return Math.round((summary.completed / summary.total) * 100)
}

export default function Home() {
  const { user } = useAuth()
  const {
    goals,
    analytics,
    activities,
    activitiesError,
    levelData,
    loading,
    loadingActivities,
    refreshGoals,
    refreshAnalytics,
    refreshActivities,
    refreshLevel,
  } = useData()
  const navigate = useNavigate()
  const refreshedOnMount = useRef(false)
  const [roadmapSummaries, setRoadmapSummaries] = useState<Record<number, GoalRoadmapSummary>>({})
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(false)
  const [weekMinutes, setWeekMinutes] = useState(0)

  useEffect(() => {
    if (refreshedOnMount.current) return
    refreshedOnMount.current = true
    refreshGoals()
    refreshAnalytics()
    refreshActivities()
    refreshLevel()
  }, [refreshActivities, refreshAnalytics, refreshGoals, refreshLevel])

  useEffect(() => {
    const loadDashboardExtras = async () => {
      try {
        setLoadingRoadmaps(true)
        const activeGoals = goals.filter((goal) => !goal.is_completed).slice(0, 8)
        const summaries = await Promise.all(
          activeGoals.map(async (goal) => {
            try {
              const response = await roadmapsApi.getByGoal(goal.id)
              const steps: RoadmapStep[] = response.data || []
              const completed = steps.filter((step) => step.is_completed).length
              return [
                goal.id,
                {
                  total: steps.length,
                  completed,
                  nextStep: steps.find((step) => !step.is_completed),
                },
              ] as const
            } catch {
              return [goal.id, { total: 0, completed: 0 }] as const
            }
          })
        )
        setRoadmapSummaries(Object.fromEntries(summaries))
      } finally {
        setLoadingRoadmaps(false)
      }
    }

    loadDashboardExtras()
  }, [goals])

  useEffect(() => {
    const loadWeekStudy = async () => {
      try {
        const response = await progressApi.getStudyHistory(7)
        const total = (response.data.history || []).reduce((sum: number, day: { minutes?: number }) => sum + Number(day.minutes || 0), 0)
        setWeekMinutes(total)
      } catch (error) {
        console.error('Failed to load weekly study time:', error)
      }
    }
    loadWeekStudy()
  }, [])

  const username = user?.full_name || user?.email?.split('@')[0] || 'there'
  const activeGoals = goals.filter((goal) => !goal.is_completed)
  const completedGoals = goals.filter((goal) => goal.is_completed)
  const completionRate = analytics && analytics.total_goals > 0
    ? Math.round((analytics.completed_goals / analytics.total_goals) * 100)
    : 0

  const continueGoal = useMemo(() => {
    return activeGoals.find((goal) => roadmapSummaries[goal.id]?.nextStep)
      || activeGoals.find((goal) => roadmapSummaries[goal.id]?.total === 0)
      || activeGoals[0]
  }, [activeGoals, roadmapSummaries])

  const continueSummary = continueGoal ? roadmapSummaries[continueGoal.id] : undefined
  const remainingTasks = continueSummary?.total
    ? Math.max(0, continueSummary.total - continueSummary.completed)
    : activeGoals.length

  const primaryAction = continueGoal
    ? {
        label: continueSummary?.total === 0 ? 'Generate Roadmap' : 'Continue Learning',
        href: `/roadmaps/${continueGoal.id}`,
      }
    : {
        label: 'Create Your First Goal',
        href: '/goals',
      }

  const libraryGoals = [...activeGoals, ...completedGoals].slice(0, 3)
  const dashboardActivities = activities.slice(0, 5)

  if (loading && !analytics && goals.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-dark-bg-primary sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-card border border-neutral-200 bg-white p-6 dark:border-dark-border-primary dark:bg-dark-bg-secondary">
            <Skeleton variant="text" width="300px" height="2rem" className="mb-3" />
            <Skeleton variant="text" width="520px" height="1rem" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Card key={item}><Skeleton variant="text" lines={4} /></Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: 'Active Streak',
      value: `${analytics?.current_streak_days || 0} day${analytics?.current_streak_days === 1 ? '' : 's'}`,
      helper: analytics?.current_streak_days ? 'Keep the chain alive today' : 'Study today to start a streak',
      icon: Flame,
      tone: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    },
    {
      label: 'Study Time This Week',
      value: formatDuration(weekMinutes),
      helper: 'Tracked across sessions',
      icon: Clock,
      tone: 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark',
    },
    {
      label: 'Goal Progress',
      value: `${completionRate}%`,
      helper: `${completedGoals.length} of ${goals.length} goals complete`,
      icon: Target,
      tone: 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark',
      progress: completionRate,
    },
    {
      label: 'Current Level',
      value: `Level ${levelData?.current_level || 1}`,
      helper: `${levelData?.total_xp || 0} XP total`,
      icon: GraduationCap,
      tone: 'bg-secondary-light text-secondary dark:bg-secondary/20 dark:text-secondary-dark',
      progress: levelData?.progress_percentage || 0,
    },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8 transition-colors duration-300 dark:bg-dark-bg-primary sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-card border border-primary-muted bg-white shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-secondary"
        >
          <div className="grid gap-6 bg-gradient-to-br from-primary-muted/80 via-white to-white p-6 dark:from-primary/15 dark:via-dark-bg-secondary dark:to-dark-bg-secondary lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-7">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <Badge variant="success" size="sm">Dashboard</Badge>
                <h1 className="mt-4 font-heading text-3xl font-bold text-primary dark:text-primary-dark md:text-4xl">
                  {getGreeting()}, {username}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-dark-text-secondary">
                  Ready to continue learning? Your next milestone is waiting.
                </p>
              </div>
              <div>
                <Button onClick={() => navigate(primaryAction.href)}>
                  <ChevronRight className="mr-2 h-4 w-4" />
                  {primaryAction.label}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-primary-muted bg-white/80 p-4 shadow-sm backdrop-blur dark:border-dark-border-primary dark:bg-dark-bg-tertiary/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary dark:text-primary-dark">Today's Focus</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">
                    {continueGoal?.title || 'Start with one clear goal'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-dark-text-secondary">
                {continueSummary?.nextStep
                  ? `Next step: ${continueSummary.nextStep.title}`
                  : continueGoal
                    ? 'Generate a roadmap so Study Buddy can guide your next move.'
                    : 'Create a goal and Study Buddy will help organize your learning path.'}
              </p>
              {continueGoal && (
                <p className="mt-3 text-xs font-medium text-neutral-500 dark:text-dark-text-secondary">
                  {Math.max(remainingTasks || 0, 0)} task{remainingTasks === 1 ? '' : 's'} until your next visible milestone
                </p>
              )}
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="h-full shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">{stat.label}</p>
                      <p className="mt-3 font-heading text-3xl font-bold text-neutral-950 dark:text-dark-text-primary">{stat.value}</p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-neutral-500 dark:text-dark-text-secondary">{stat.helper}</p>
                  {'progress' in stat && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-dark-bg-tertiary">
                      <div className="h-full rounded-full bg-primary dark:bg-primary-dark" style={{ width: `${Math.max(0, Math.min(100, stat.progress || 0))}%` }} />
                    </div>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(24rem,0.8fr)]">
          <div className="space-y-6">
            <Card className="shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="section-heading">Continue Learning</h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">Resume the most useful next step.</p>
                </div>
                {loadingRoadmaps && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>

              {continueGoal ? (
                <div className="mt-5 rounded-lg border border-primary-muted bg-primary-muted/50 p-4 dark:border-primary-dark/30 dark:bg-primary/10">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <Badge variant={continueGoal.is_completed ? 'success' : 'info'} size="sm">
                        {continueSummary?.total ? `${continueSummary.completed}/${continueSummary.total} steps` : 'Roadmap needed'}
                      </Badge>
                      <h3 className="mt-3 font-heading text-xl font-bold text-neutral-950 dark:text-dark-text-primary">{continueGoal.title}</h3>
                      <p className="mt-2 text-sm text-neutral-600 dark:text-dark-text-secondary">
                        {continueSummary?.nextStep
                          ? `Next: ${continueSummary.nextStep.title}`
                          : continueSummary?.total === 0
                            ? 'No roadmap yet. Generate one to make this goal actionable.'
                            : 'All visible roadmap steps are complete.'}
                      </p>
                    </div>
                    <Button onClick={() => navigate(`/roadmaps/${continueGoal.id}`)}>
                      {continueSummary?.total === 0 ? 'Generate Roadmap' : 'Continue'}
                    </Button>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white dark:bg-dark-bg-tertiary">
                    <div className="h-full rounded-full bg-primary dark:bg-primary-dark" style={{ width: `${progressFor(continueSummary)}%` }} />
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
                  <Target className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
                  <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">No learning goals yet</p>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">Create your first goal to unlock a guided roadmap.</p>
                  <Button className="mt-4" onClick={() => navigate('/goals')}>Create your first goal</Button>
                </div>
              )}
            </Card>

            <Card className="shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="section-heading">Your Library</h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">A few active paths worth keeping close.</p>
                </div>
                <Link to="/goals" className="text-sm font-semibold text-primary hover:underline dark:text-primary-dark">View all</Link>
              </div>

              {libraryGoals.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
                  <BookOpen className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
                  <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">No learning goals yet</p>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">Start with a goal and your library will fill with useful learning paths.</p>
                  <Button className="mt-4" onClick={() => navigate('/goals')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first goal
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {libraryGoals.map((goal, index) => {
                    const summary = roadmapSummaries[goal.id]
                    const progress = goal.is_completed ? 100 : progressFor(summary)
                    return (
                      <motion.button
                        key={goal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        onClick={() => navigate(`/roadmaps/${goal.id}`)}
                        className="rounded-lg border border-neutral-200 bg-white p-4 text-left transition hover:border-primary-muted hover:shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-tertiary dark:hover:border-primary-dark"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-heading text-base font-bold text-neutral-950 dark:text-dark-text-primary">{goal.title}</p>
                            <p className="mt-1 text-xs capitalize text-neutral-500 dark:text-dark-text-secondary">{goal.learning_style || 'balanced'} learning</p>
                          </div>
                          <Badge variant={goal.is_completed ? 'success' : 'info'} size="sm">
                            {goal.is_completed ? 'Completed' : 'Active'}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500 dark:text-dark-text-secondary">
                          <span>{summary?.total ? `${summary.completed}/${summary.total} steps` : 'No roadmap yet'}</span>
                          <span className="font-semibold text-primary dark:text-primary-dark">{progress}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-dark-bg-primary">
                          <div className="h-full rounded-full bg-primary dark:bg-primary-dark" style={{ width: `${progress}%` }} />
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          <Card className="h-fit shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="section-heading">Recent Activity</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">Latest updates from your learning workspace.</p>
              </div>
              <div className="flex items-center gap-1">
                <Link to="/activity" className="rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary-muted dark:text-primary-dark dark:hover:bg-primary/20">
                  See all
                </Link>
                <button
                  onClick={() => refreshActivities()}
                  className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-primary dark:hover:bg-dark-bg-tertiary"
                  title="Refresh activity"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingActivities ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingActivities && activities.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-neutral-100 p-3 dark:border-dark-border-primary">
                    <Skeleton variant="circular" width="40px" height="40px" />
                    <div className="flex-1">
                      <Skeleton variant="text" width="65%" height="1rem" className="mb-2" />
                      <Skeleton variant="text" width="90%" height="0.8rem" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activitiesError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                <p className="font-semibold">Could not load recent activity.</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => refreshActivities()}>Retry</Button>
              </div>
            ) : activities.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
                <Clock className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
                <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">No recent activity yet</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">Start by creating a goal.</p>
              </div>
            ) : (
              <ActivityList activities={dashboardActivities} compact />
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}
