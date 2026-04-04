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
  Flame,
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
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg-primary transition-colors duration-300">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-neutral-50 dark:bg-dark-bg-primary border-b border-neutral-200 dark:border-dark-border-primary transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Logo size="lg" />
            </div>

            {/* Center: Navigation (Desktop) */}
            <div className="hidden lg:flex items-center justify-center flex-1">
              <div className="flex items-center gap-1">
                {navigation.map((item: { name: string; href: string; icon: React.ElementType }) => {
                  const active = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                        ${active
                          ? 'text-primary dark:text-primary-dark border-b-2 border-primary dark:border-primary-dark'
                          : 'text-neutral-500 dark:text-dark-text-secondary hover:text-neutral-900 dark:hover:text-dark-text-primary'
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
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                      ${moreMenuOpen
                        ? 'text-primary dark:text-primary-dark'
                        : 'text-neutral-500 dark:text-dark-text-secondary hover:text-neutral-900 dark:hover:text-dark-text-primary'
                      }
                    `}
                  >
                    <span>More</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {moreMenuOpen && (
                    <div className="absolute top-full mt-2 right-0 w-56 bg-white dark:bg-dark-bg-secondary border border-neutral-200 dark:border-dark-border-primary rounded-card py-2 z-50 transition-colors">
                      {moreNavigation.map((item: { name: string; href: string; icon: React.ElementType; badge?: string }) => {
                        const active = location.pathname === item.href
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`
                              flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                              ${active
                                ? 'bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark'
                                : 'text-neutral-600 dark:text-dark-text-secondary hover:bg-neutral-100 dark:hover:bg-dark-hover-primary'
                              }
                            `}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="flex-1">{item.name}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 text-xs bg-secondary-light dark:bg-secondary/20 text-secondary dark:text-secondary-dark rounded">
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
            <div className="flex items-center gap-3">
              {/* Pro Badge / Upgrade Button */}
              <Link
                to="/subscription"
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold transition-colors ${
                  isPro
                    ? 'bg-primary dark:bg-primary-dark text-white hover:bg-primary-light dark:hover:bg-primary/90'
                    : 'bg-neutral-100 dark:bg-dark-bg-tertiary text-neutral-600 dark:text-dark-text-secondary hover:bg-neutral-200 dark:hover:bg-dark-hover-primary'
                }`}
              >
                {isPro && <Crown className="w-3 h-3" />}
                <span>{isPro ? 'PRO' : 'Upgrade'}</span>
              </Link>

              {/* User Menu */}
              <div className="relative group">
                <button 
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-hover-primary transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-800 dark:bg-dark-text-primary text-white dark:text-dark-bg-primary text-xs font-semibold flex items-center justify-center transition-colors">
                    {user?.email.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-neutral-800 dark:text-dark-text-primary transition-colors">
                    {user?.full_name || user?.email.split('@')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-bg-secondary rounded-card border border-neutral-200 dark:border-dark-border-primary opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-dark-text-primary hover:bg-neutral-100 dark:hover:bg-dark-hover-primary transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                      className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-dark-text-secondary hover:bg-neutral-100 dark:hover:bg-dark-hover-primary transition-colors"
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
              className="md:hidden border-t border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary transition-colors"
            >
              <div className="px-4 py-3 space-y-1">
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">Main</p>
                {navigation.map((item) => {
                  const active = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${active
                          ? 'bg-primary dark:bg-primary-dark text-white'
                          : 'text-neutral-600 dark:text-dark-text-secondary hover:bg-neutral-100 dark:hover:bg-dark-hover-primary'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary mt-4">More</p>
                {moreNavigation.map((item: { name: string; href: string; icon: React.ElementType }) => {
                  const active = location.pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${active
                          ? 'bg-primary dark:bg-primary-dark text-white'
                          : 'text-neutral-600 dark:text-dark-text-secondary hover:bg-neutral-100 dark:hover:bg-dark-hover-primary'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
                {/* Mobile Streak */}
                <div className="flex items-center gap-2 px-4 py-3 mt-2 bg-tertiary-light dark:bg-dark-bg-tertiary rounded-card border border-tertiary-muted dark:border-dark-border-secondary transition-colors">
                  <Flame className="w-5 h-5 text-tertiary" />
                  <div>
                    <p className="text-xs text-tertiary font-medium">Study Streak</p>
                    <p className="text-sm font-bold text-neutral-800 dark:text-dark-text-primary">{streak} days</p>
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
