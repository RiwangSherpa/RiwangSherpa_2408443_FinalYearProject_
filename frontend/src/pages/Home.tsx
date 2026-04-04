import { Link, useNavigate } from 'react-router-dom'
import { Flame, Clock, Target, GraduationCap, Plus, HelpCircle, Timer, BookOpen, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'

export default function Home() {
  const { user } = useAuth()
  const { goals, analytics, activities, levelData, loading } = useData()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Skeleton variant="text" width="300px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="200px" height="1.5rem" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

  // Show recent goals in Library (up to 6 goals)
  const recentGoals = goals.slice(0, 6)

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-start gap-8 mb-8"
        >
          <div>
            <h1 className="font-heading text-3xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">
              {getGreeting()}, {user?.email ? user.email.split('@')[0] : 'there'}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-dark-text-secondary max-w-sm font-body transition-colors">
              Ready to tackle your learning objectives? You're only 3 tasks away from completing your weekly goal.
            </p>
          </div>
          {/* Quote Card */}
          <div className="bg-neutral-100 dark:bg-dark-bg-tertiary border-l-4 border-secondary dark:border-secondary-dark px-4 py-3 rounded-r-lg max-w-xs hidden md:block transition-colors">
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary dark:text-secondary-dark block mb-1 transition-colors">TODAY'S FOCUS</span>
            <p className="text-sm text-neutral-700 dark:text-dark-text-secondary italic font-body transition-colors">
              "The beautiful thing about learning is that no one can take it away from you." — B.B. King
            </p>
          </div>
        </motion.div>

        {/* Stats Row */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Streak Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <div className="bg-tertiary-light dark:bg-dark-bg-tertiary border border-tertiary-muted dark:border-dark-border-secondary rounded-card p-4 transition-colors">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-tertiary">Active Streak</span>
                  <Flame className="w-4 h-4 text-tertiary dark:text-tertiary" />
                </div>
                <p className="font-heading text-2xl font-bold text-neutral-900 dark:text-dark-text-primary mt-2 transition-colors">{analytics.current_streak_days} Days</p>
                <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary mt-0.5 transition-colors">Keep it going!</p>
              </div>
            </motion.div>

            {/* Study Time Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-white dark:bg-dark-bg-secondary border border-neutral-200 dark:border-dark-border-primary rounded-card p-4 transition-colors">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">Study Time</span>
                  <Clock className="w-4 h-4 text-neutral-400 dark:text-dark-text-tertiary" />
                </div>
                <p className="font-heading text-2xl font-bold text-neutral-900 dark:text-dark-text-primary mt-2 transition-colors">
                  {Math.floor(analytics.total_study_time_minutes / 60)}h {analytics.total_study_time_minutes % 60}m
                </p>
                <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary mt-0.5 transition-colors">This week</p>
              </div>
            </motion.div>

            {/* Goal Progress Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white dark:bg-dark-bg-secondary border border-neutral-200 dark:border-dark-border-primary rounded-card p-4 transition-colors">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">Goal Progress</span>
                  <Target className="w-4 h-4 text-neutral-400 dark:text-dark-text-tertiary" />
                </div>
                <p className="font-heading text-2xl font-bold text-neutral-900 dark:text-dark-text-primary mt-2 transition-colors">{completionRate}%</p>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full mt-2 transition-colors">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="h-1.5 bg-primary dark:bg-primary-dark rounded-full transition-colors"
                  />
                </div>
              </div>
            </motion.div>

            {/* Level Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-primary rounded-card p-4">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/60">Level</span>
                  <GraduationCap className="w-4 h-4 text-white/60" />
                </div>
                <p className="font-heading text-2xl font-bold text-white mt-2">
                  {levelData?.current_level || 1}
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Next level at {levelData?.xp_needed_for_level || 100} XP
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Actions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Create Goal CTA */}
          <Card className="flex items-center justify-between cursor-pointer hover:border-neutral-300 dark:hover:border-dark-border-secondary transition-colors group" onClick={() => navigate('/goals')}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-dark-bg-tertiary flex items-center justify-center group-hover:bg-primary-muted dark:group-hover:bg-primary/20 transition-colors">
                <Target className="w-4 h-4 text-neutral-500 dark:text-dark-text-tertiary group-hover:text-primary dark:group-hover:text-primary-dark transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">Create New Goal</p>
                <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary">Set your next milestone</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-dark-text-tertiary" />
          </Card>

          {/* Take Quiz CTA */}
          <Card className="flex items-center justify-between cursor-pointer hover:border-neutral-300 dark:hover:border-dark-border-secondary transition-colors group" onClick={() => navigate('/quiz')}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-dark-bg-tertiary flex items-center justify-center group-hover:bg-primary-muted dark:group-hover:bg-primary/20 transition-colors">
                <HelpCircle className="w-4 h-4 text-neutral-500 dark:text-dark-text-tertiary group-hover:text-primary dark:group-hover:text-primary-dark transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">Take a Quiz</p>
                <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary">Validate your knowledge</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-dark-text-tertiary" />
          </Card>

          {/* Start Timer CTA */}
          <div className="bg-primary dark:bg-primary-dark rounded-card p-4 flex items-center justify-between cursor-pointer hover:bg-primary-light dark:hover:bg-primary/90 transition-colors group" onClick={() => navigate('/productivity')}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 dark:bg-white/20 flex items-center justify-center">
                <Timer className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Start Timer</p>
                <p className="text-xs text-white/60 dark:text-white/70">Enter focus mode</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/40 dark:text-white/50" />
          </div>
        </div>

        {/* Two-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left - Your Library */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-heading dark:text-dark-text-primary">Your Library</h2>
              <Link to="/goals" className="text-sm font-medium text-primary dark:text-primary-dark hover:underline transition-colors">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentGoals.length === 0 ? (
                <Card className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="w-10 h-10 text-neutral-300 dark:text-dark-text-tertiary mb-3" />
                  <p className="text-sm font-semibold text-neutral-600 dark:text-dark-text-secondary mb-1">No goals yet</p>
                  <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary mb-4">Create your first learning goal to get started</p>
                  <Button onClick={() => navigate('/goals')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Goal
                  </Button>
                </Card>
              ) : (
                recentGoals.map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={`/roadmaps/${goal.id}`}
                      className="block relative rounded-card overflow-hidden h-36 cursor-pointer group border border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary hover:border-neutral-300 dark:hover:border-dark-border-secondary transition-colors"
                    >
                      {/* Content */}
                      <div className="p-4 h-full flex flex-col justify-between">
                        <div>
                          {/* Status Pill */}
                          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-pill uppercase tracking-wide mb-2">
                            {goal.is_completed ? (
                              <span className="bg-primary text-white dark:bg-primary-dark dark:text-white">Completed</span>
                            ) : (
                              <span className="bg-tertiary text-white dark:bg-tertiary dark:text-white">Learning</span>
                            )}
                          </span>
                          <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary font-heading leading-tight">{goal.title}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">
                            {goal.learning_style || 'balanced'}
                          </p>
                          <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-dark-text-tertiary group-hover:text-neutral-400 dark:group-hover:text-dark-text-secondary transition-colors" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Right - Recent Activity + Upgrade */}
          <div className="lg:col-span-2">
            <h2 className="section-heading dark:text-dark-text-primary mb-4">Recent Activity</h2>
            <div className="flex flex-col gap-3 mb-6">
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-500 dark:text-dark-text-tertiary">No recent activity</p>
                  <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary mt-1">Start learning to see your activity here</p>
                </div>
              ) : (
                activities.map((activity) => {
                  const getActivityIcon = () => {
                    switch (activity.type) {
                      case 'quiz_attempt':
                        return <HelpCircle className="w-3.5 h-3.5 text-neutral-500 dark:text-dark-text-tertiary" />
                      case 'study_session':
                        return <BookOpen className="w-3.5 h-3.5 text-neutral-500 dark:text-dark-text-tertiary" />
                      case 'goal_completed':
                        return <Target className="w-3.5 h-3.5 text-neutral-500 dark:text-dark-text-tertiary" />
                      case 'goal_created':
                        return <Plus className="w-3.5 h-3.5 text-neutral-500 dark:text-dark-text-tertiary" />
                      case 'level_up':
                        return <GraduationCap className="w-3.5 h-3.5 text-neutral-500 dark:text-dark-text-tertiary" />
                      default:
                        return <BookOpen className="w-3.5 h-3.5 text-neutral-500 dark:text-dark-text-tertiary" />
                    }
                  }

                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-dark-bg-tertiary flex items-center justify-center flex-shrink-0 transition-colors">
                        {getActivityIcon()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">{activity.title}</p>
                        <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary mt-0.5">
                          {activity.description}
                          {activity.goal_title && ` • ${activity.goal_title}`}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Upgrade Card - Only show for Free users */}
            {user?.subscription_plan !== 'pro' && (
              <div className="bg-secondary-light dark:bg-dark-bg-tertiary rounded-card p-4 border border-secondary-muted dark:border-dark-border-secondary transition-colors">
                <p className="font-heading text-sm font-semibold text-secondary dark:text-secondary-dark mb-1 transition-colors">Study Buddy Premium</p>
                <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary mb-3 transition-colors">Unlock unlimited AI insights and custom flashcards.</p>
                <button className="btn-primary text-xs px-4 py-2" onClick={() => navigate('/subscription')}>
                  Upgrade Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
