 import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Target,
  BookOpen,
  HelpCircle,
  Timer,
  Bot,
  Trophy,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Crown,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { progressApi } from '../lib/api'
import Logo from './Logo'
import { motion, AnimatePresence } from 'framer-motion'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Roadmaps', href: '/roadmaps', icon: BookOpen },
  { name: 'Quiz', href: '/quiz', icon: HelpCircle },
]

const moreNavigation = [
  { name: 'Productivity', href: '/productivity', icon: Timer },
  { name: 'AI Tutor', href: '/tutor', icon: Bot, badge: 'AI' },
  { name: 'Achievements', href: '/gamification', icon: Trophy },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()
  const [streak, setStreak] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      loadStreak()
    }
  }, [isAuthenticated])

  const loadStreak = async () => {
    try {
      const response = await progressApi.getStreak()
      setStreak(response.data.streak || 0)
    } catch (error) {
      console.error('Failed to load streak:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isPro = user?.subscription_plan !== 'free'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Logo size="lg" />
            </div>

            {/* Center: Navigation (Desktop) */}
            <div className="hidden lg:flex items-center justify-center flex-1">
              <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-1.5 space-x-1">
                {navigation.map((item: { name: string; href: string; icon: React.ElementType }) => {
                  const active = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                        ${active
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                        }
                      `}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
                
                {/* More Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    onBlur={() => setTimeout(() => setMoreMenuOpen(false), 200)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                      ${moreMenuOpen
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                      }
                    `}
                  >
                    <span>More</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {moreMenuOpen && (
                    <div className="absolute top-full mt-2 right-0 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                      {moreNavigation.map((item: { name: string; href: string; icon: React.ElementType; badge?: string }) => {
                        const active = location.pathname === item.href
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`
                              flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all
                              ${active
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }
                            `}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="flex-1">{item.name}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: User Info & Actions */}
            <div className="flex items-center gap-4">
              {/* Pro Badge / Upgrade Button */}
              <Link
                to="/subscription"
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isPro
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isPro && <Crown className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {isPro ? 'Pro' : 'Upgrade'}
                </span>
              </Link>

              {/* User Menu */}
              <div className="relative group">
                <button 
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user?.email.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.full_name || user?.email.split('@')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-1">
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <User className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <button
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="px-4 py-3 space-y-1">
                <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Main</p>
                {navigation.map((item) => {
                  const active = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                        ${active
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
                <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4">More</p>
                {moreNavigation.map((item: { name: string; href: string; icon: React.ElementType }) => {
                  const active = location.pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                        ${active
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
                {/* Mobile Streak */}
                <div className="flex items-center gap-2 px-4 py-3 mt-2 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-xl">🔥</span>
                  <div>
                    <p className="text-xs text-orange-600">Study Streak</p>
                    <p className="text-sm font-bold text-orange-700">{streak} days</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
