import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Target,
  BookOpen,
  Flame,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  Clock,
  Award,
  BarChart3,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { analyticsApi } from '../lib/api'
import {
  OverviewAnalytics,
  CurrentGoalAnalytics,
  QuizAnalytics,
  RoadmapProgressData,
} from '../types'
import Card from '../components/ui/Card'
import StudyTimeLineChart from '../components/charts/StudyTimeLineChart'
import QuizScoreLineChart from '../components/charts/QuizScoreLineChart'
import QuizScoreBarChart from '../components/charts/QuizScoreBarChart'
import RoadmapStepsChart from '../components/charts/RoadmapStepsChart'
import { useTheme } from '../contexts/ThemeContext'

export default function ProfileAnalytics() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null)
  const [currentGoal, setCurrentGoal] = useState<CurrentGoalAnalytics | null>(null)
  const [currentRoadmap, setCurrentRoadmap] = useState<RoadmapProgressData | null>(null)
  const [quizAnalytics, setQuizAnalytics] = useState<QuizAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAllAnalytics()
  }, [])

  const loadAllAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, goalRes, roadmapRes, quizRes] = await Promise.allSettled([
        analyticsApi.getOverview(),
        analyticsApi.getCurrentGoal(),
        analyticsApi.getCurrentRoadmap(),
        analyticsApi.getQuizAnalytics(),
      ])

      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value.data)
      }

      if (goalRes.status === 'fulfilled') {
        setCurrentGoal(goalRes.value.data)
        setCurrentRoadmap(goalRes.value.data.roadmap_progress)
      } else if (goalRes.status === 'rejected' && goalRes.reason?.response?.status === 404) {
        // No active goal - this is okay
        setCurrentGoal(null)
        setCurrentRoadmap(null)
      }

      if (roadmapRes.status === 'fulfilled') {
        setCurrentRoadmap(roadmapRes.value.data)
      } else if (roadmapRes.status === 'rejected' && roadmapRes.reason?.response?.status === 404) {
        // No active roadmap - this is okay
        setCurrentRoadmap(null)
      }

      if (quizRes.status === 'fulfilled') {
        setQuizAnalytics(quizRes.value.data)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Failed to load analytics data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">{error}</p>
          </div>
        </Card>
      </div>
    )
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile Analytics</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Comprehensive insights into your learning journey
        </p>
      </div>

      {/* A. Study Progress Overview */}
      {overview && (
        <section className="mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Study Progress Overview
              </h2>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Total Study Time
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatHours(overview.total_study_time_hours)}
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">
                  Current Streak
                </p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {overview.streak_data.current_streak} days
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
                  Longest Streak
                </p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {overview.streak_data.longest_streak} days
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  Completed Steps
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {overview.completed_roadmap_steps}
                </p>
              </div>
            </div>

            {/* Study Time Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Study Time - Last 7 Days
                </h3>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <StudyTimeLineChart data={overview.study_time_last_7_days} days={7} />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Study Time - Last 30 Days
                </h3>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <StudyTimeLineChart data={overview.study_time_last_30_days} days={30} />
                </div>
              </div>
            </div>

            {/* Active Goal Progress */}
            {overview.active_goal_progress && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Active Goal Progress
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {overview.active_goal_progress.title}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {Math.round(overview.active_goal_progress.completion_percentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${overview.active_goal_progress.completion_percentage}%`,
                      }}
                      transition={{ duration: 0.8 }}
                      className="bg-blue-600 h-3 rounded-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* B. Current Goal */}
      {currentGoal && (
        <section className="mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Current Goal</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {currentGoal.goal.title}
                </h3>
                {currentGoal.goal.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {currentGoal.goal.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Target Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {currentGoal.goal.target_date
                        ? new Date(currentGoal.goal.target_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Learning Style</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {currentGoal.goal.learning_style || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Completion
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {Math.round(currentGoal.goal.completion_percentage)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${currentGoal.goal.completion_percentage}%` }}
                    transition={{ duration: 0.8 }}
                    className="bg-green-600 h-4 rounded-full"
                  />
                </div>
              </div>

              <div className="mt-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    currentGoal.goal.status === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}
                >
                  {currentGoal.goal.status === 'completed' ? 'Completed' : 'Active'}
                </span>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* C. Current Roadmap */}
      {currentRoadmap && (
        <section className="mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Current Roadmap
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Steps Progress
                </h3>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <RoadmapStepsChart
                    totalSteps={currentRoadmap.total_steps}
                    completedSteps={currentRoadmap.completed_steps}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Steps Completed
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {currentRoadmap.completed_steps} / {currentRoadmap.total_steps}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentRoadmap.completion_percentage}%` }}
                      transition={{ duration: 0.8 }}
                      className="bg-purple-600 h-3 rounded-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Estimated Hours
                    </p>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                      {currentRoadmap.estimated_hours.toFixed(1)}h
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Actual Hours
                    </p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">
                      {currentRoadmap.actual_study_hours.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps Timeline */}
            {currentRoadmap.steps_timeline.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Steps Timeline
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {currentRoadmap.steps_timeline.map((step, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        step.is_completed
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                          step.is_completed
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {step.step_number}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{step.title}</p>
                        {step.completed_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Completed:{' '}
                            {new Date(step.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {step.is_completed && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* D. Quiz Analytics */}
      {quizAnalytics && (
        <section className="mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Quiz Analytics
              </h2>
            </div>

            {/* Quiz Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                  Total Quizzes
                </p>
                <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                  {quizAnalytics.analytics.total_quizzes}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Average Score
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {Math.round(quizAnalytics.analytics.average_score)}%
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  Best Score
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {Math.round(quizAnalytics.analytics.best_score)}%
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                  Worst Score
                </p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {Math.round(quizAnalytics.analytics.worst_score)}%
                </p>
              </div>
            </div>

            {/* Quiz Charts */}
            {quizAnalytics.analytics.score_history.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Score History
                  </h3>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <QuizScoreLineChart data={quizAnalytics.analytics.score_history} />
                  </div>
                </div>

                {quizAnalytics.analytics.topic_performance.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Scores by Topic
                    </h3>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <QuizScoreBarChart data={quizAnalytics.analytics.topic_performance} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>
      )}

      {/* E. Strengths & Weak Areas */}
      {quizAnalytics && (
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strong Topics */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Strong Areas
                </h2>
              </div>
              {quizAnalytics.strengths_weaknesses.strong_topics.length > 0 ? (
                <ul className="space-y-2">
                  {quizAnalytics.strengths_weaknesses.strong_topics.map((topic, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {topic.topic}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-700 dark:text-green-300">
                        {Math.round(topic.average_score)}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Complete quizzes to identify your strengths!
                </p>
              )}
            </Card>

            {/* Weak Topics */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Areas to Improve
                </h2>
              </div>
              {quizAnalytics.strengths_weaknesses.weak_topics.length > 0 ? (
                <ul className="space-y-2">
                  {quizAnalytics.strengths_weaknesses.weak_topics.map((topic, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {topic.topic}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-red-700 dark:text-red-300">
                        {Math.round(topic.average_score)}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No weak areas identified yet. Keep up the great work! 🎉
                </p>
              )}
            </Card>
          </div>

          {/* Suggestions */}
          {quizAnalytics.strengths_weaknesses.suggestions.length > 0 && (
            <Card className="p-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Suggestions
                </h2>
              </div>
              <ul className="space-y-2">
                {quizAnalytics.strengths_weaknesses.suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  >
                    <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}

      {/* Empty State */}
      {!overview && !currentGoal && !quizAnalytics && (
        <Card>
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              No analytics data available yet. Start studying to see your progress!
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
