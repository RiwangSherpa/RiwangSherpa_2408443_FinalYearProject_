import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Target, 
  BookOpen, 
  HelpCircle, 
  TrendingUp, 
  Timer,
  Crown,
  LogOut,
  User,
  Menu,
  X
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
  { name: 'Progress', href: '/progress', icon: TrendingUp },
  { name: 'Productivity', href: '/productivity', icon: Timer },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()
  const [streak, setStreak] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Logo size="sm" />
            </div>

            {/* Center: Navigation (Desktop) */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const active = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${active
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
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
