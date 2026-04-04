import { useState, useEffect } from 'react'
import { TrendingUp, Target, BookOpen, Flame, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { progressApi } from '../lib/api'
import { Analytics } from '../types'
import Card from '../components/ui/Card'
import StudyTimeGraph from '../components/StudyTimeGraph'
import StreakDaysGraph from '../components/StreakDaysGraph'

export default function ProfileAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [studyTimeData, setStudyTimeData] = useState<any[]>([])
  const [streakData, setStreakData] = useState<any[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const [analyticsRes, studyHistoryRes, streakHistoryRes] = await Promise.all([
        progressApi.getAnalytics(),
        progressApi.getStudyHistory(30),
        progressApi.getStreakHistory(30)
      ])
      
      console.log('[ProfileAnalytics] Loaded analytics:', analyticsRes.data)
      setAnalytics(analyticsRes.data)
      setStudyTimeData(studyHistoryRes.data.history)
      setStreakData(streakHistoryRes.data.history)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="text-center py-16">
              <p className="text-neutral-600 dark:text-dark-text-secondary">No analytics data available yet.</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const completionRate = analytics.total_goals > 0
    ? (analytics.completed_goals / analytics.total_goals) * 100
    : 0

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">Progress Dashboard</h1>
          <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">Track your learning journey and achievements</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary mb-1 transition-colors">Total Study Time</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">
                    {Math.round(analytics.total_study_time_minutes / 60)}h{' '}
                    {Math.round(analytics.total_study_time_minutes % 60)}m
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary-muted dark:bg-primary/20 flex items-center justify-center transition-colors">
                  <BookOpen className="w-5 h-5 text-primary dark:text-primary-dark transition-colors" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary transition-colors">Goals Completed</p>
                  <div className="w-8 h-8 rounded-lg bg-primary-muted dark:bg-primary/20 flex items-center justify-center transition-colors">
                    <Target className="w-4 h-4 text-primary dark:text-primary-dark transition-colors" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">{analytics.completed_goals} / {analytics.total_goals}
                </p>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full h-1.5 transition-colors">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="bg-primary dark:bg-primary-dark h-1.5 rounded-full transition-colors"
                />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary mb-1 transition-colors">Current Streak</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">{analytics.current_streak_days} days</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-tertiary-light dark:bg-tertiary/20 flex items-center justify-center transition-colors">
                  <Flame className="w-5 h-5 text-tertiary dark:text-tertiary transition-colors" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary mb-1 transition-colors">
                    {analytics.total_quizzes > 0 ? 'Average Quiz Score' : 'Quizzes Taken'}
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">
                    {analytics.total_quizzes > 0
                      ? `${Math.round(analytics.average_quiz_score)}%` 
                      : '0'}
                  </p>
                  {analytics.total_quizzes > 0 && (
                    <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary mt-1">
                      {analytics.total_quizzes} quiz{analytics.total_quizzes !== 1 ? 'zes' : ''} taken
                      {analytics.best_quiz_score > 0 && ` • Best: ${Math.round(analytics.best_quiz_score)}%`}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-lg bg-secondary-light dark:bg-secondary/20 flex items-center justify-center transition-colors">
                  <TrendingUp className="w-5 h-5 text-secondary dark:text-secondary-dark transition-colors" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Study Time & Streak Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <StudyTimeGraph data={studyTimeData} />
          <StreakDaysGraph data={streakData} />
        </div>

        {/* Weak and Strong Topics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weak Topics */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <h2 className="section-heading">Areas to Improve</h2>
              </div>
              {analytics.weak_topics.length > 0 ? (
                <ul className="space-y-2">
                  {analytics.weak_topics.map((topic, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-neutral-700 p-3 rounded-lg bg-red-50 border border-red-100 text-sm"
                    >
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span className="font-medium">{topic}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-neutral-500 text-sm">No weak areas identified yet. Keep up the great work!</p>
              )}
            </Card>
          </motion.div>

          {/* Strong Topics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary-muted flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <h2 className="section-heading">Strong Areas</h2>
              </div>
              {analytics.strong_topics.length > 0 ? (
                <ul className="space-y-2">
                  {analytics.strong_topics.map((topic, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-neutral-700 p-3 rounded-lg bg-primary-muted border border-primary-muted text-sm"
                    >
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      <span className="font-medium">{topic}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-neutral-500 text-sm">Complete quizzes to identify your strengths!</p>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
