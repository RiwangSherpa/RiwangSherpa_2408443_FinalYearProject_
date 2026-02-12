import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame, Clock, Target, TrendingUp, Plus, BookOpen, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { goalsApi, progressApi } from '../lib/api'
import { Goal, Analytics } from '../types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [goals, setGoals] = useState<Goal[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [goalsRes, analyticsRes] = await Promise.all([
        goalsApi.getAll(),
        progressApi.getAnalytics(),
      ])
      setGoals(goalsRes.data)
      setAnalytics(analyticsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Skeleton variant="text" width="300px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="200px" height="1.5rem" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton variant="text" lines={3} />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const completionRate = analytics && analytics.total_goals > 0
    ? Math.round((analytics.completed_goals / analytics.total_goals) * 100)
    : 0

  const recentGoals = goals.slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-300">Here's your learning progress today</p>
      </div>

      {/* Metrics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Study Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-800 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Study Streak</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{analytics.current_streak_days}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">days in a row</p>
                </div>
                <div className="w-12 h-12 bg-orange-200 dark:bg-orange-800 rounded-xl flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Study Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Study Time</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {Math.round(analytics.total_study_time_minutes / 60)}h
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">total hours</p>
                </div>
                <div className="w-12 h-12 bg-blue-200 dark:bg-blue-800 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Completed Goals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {analytics.completed_goals}/{analytics.total_goals}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">goals finished</p>
                </div>
                <div className="w-12 h-12 bg-green-200 dark:bg-green-800 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Overall Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-800 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Progress</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{completionRate}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-200 dark:bg-purple-800 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full"
                />
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Quick Actions & Recent Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full justify-start"
              onClick={() => navigate('/goals')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Goal
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => navigate('/quiz')}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Take a Quiz
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate('/productivity')}
            >
              <Clock className="w-4 h-4 mr-2" />
              Start Timer
            </Button>
          </div>
        </Card>

        {/* Recent Goals */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Goals</h2>
            <Link
              to="/goals"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentGoals.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">No goals yet. Create your first goal!</p>
              <Button onClick={() => navigate('/goals')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentGoals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={`/roadmaps/${goal.id}`}
                    className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {goal.title}
                          </h3>
                          {goal.is_completed && (
                            <Badge variant="success" size="sm">Done</Badge>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
