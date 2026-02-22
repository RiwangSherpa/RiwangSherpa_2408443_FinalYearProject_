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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600">No analytics data available yet.</p>
          </div>
        </Card>
      </div>
    )
  }

  const completionRate = analytics.total_goals > 0
    ? (analytics.completed_goals / analytics.total_goals) * 100
    : 0

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress Dashboard</h1>
        <p className="text-gray-600">Track your learning journey and achievements</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-1">Total Study Time</p>
                <p className="text-3xl font-bold text-blue-900">
                  {Math.round(analytics.total_study_time_minutes / 60)}h{' '}
                  {Math.round(analytics.total_study_time_minutes % 60)}m
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-700">Goals Completed</p>
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">
                {analytics.completed_goals} / {analytics.total_goals}
              </p>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-green-600 h-2 rounded-full"
              />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 mb-1">Current Streak</p>
                <p className="text-3xl font-bold text-orange-900">{analytics.current_streak_days} days</p>
              </div>
              <Flame className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 mb-1">Average Quiz Score</p>
                <p className="text-3xl font-bold text-purple-900">{Math.round(analytics.average_quiz_score)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Study Time & Streak Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <StudyTimeGraph data={studyTimeData} />
        <StreakDaysGraph data={streakData} />
      </div>

      {/* Weak and Strong Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Areas to Improve</h2>
            </div>
            {analytics.weak_topics.length > 0 ? (
              <ul className="space-y-2">
                {analytics.weak_topics.map((topic, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-gray-700 p-3 rounded-lg bg-red-50 border border-red-100"
                  >
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-sm font-medium">{topic}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No weak areas identified yet. Keep up the great work! 🎉</p>
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
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Strong Areas</h2>
            </div>
            {analytics.strong_topics.length > 0 ? (
              <ul className="space-y-2">
                {analytics.strong_topics.map((topic, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-gray-700 p-3 rounded-lg bg-green-50 border border-green-100"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm font-medium">{topic}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Complete quizzes to identify your strengths! 📚</p>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
