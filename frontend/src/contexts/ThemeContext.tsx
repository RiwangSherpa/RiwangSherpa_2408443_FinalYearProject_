import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { usersApi } from '../lib/api'
import { useAuth } from './AuthContext'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'studyBuddyTheme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [theme, setThemeState] = useState<Theme>('light')
  const [isInitialized, setIsInitialized] = useState(false)

  // Apply theme to <html> element
  const applyThemeClass = (nextTheme: Theme) => {
    const root = document.documentElement
    if (nextTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // Initialize theme from localStorage first for quick paint,
  // then override with backend settings if authenticated.
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    // Default to light mode, only use dark mode if explicitly set
    const initial: Theme = stored === 'dark' ? 'dark' : 'light'
    setThemeState(initial)
    applyThemeClass(initial)
    setIsInitialized(true)
  }, [])

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    applyThemeClass(nextTheme)
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme)

    // Persist to backend when authenticated
    if (isAuthenticated) {
      usersApi
        .updateTheme(nextTheme)
        .catch((error) => console.error('Failed to update theme preference:', error))
    }
  }

  // Sync with backend when auth state changes
  useEffect(() => {
    const loadFromBackend = async () => {
      if (!isAuthenticated) return
      try {
        const res = await usersApi.getSettings()
        const backendTheme = res.data.theme_preference as Theme | undefined
        // Only use backend theme if explicitly set (not null/undefined)
        if (backendTheme === 'dark') {
          setThemeState('dark')
          applyThemeClass('dark')
          localStorage.setItem(THEME_STORAGE_KEY, 'dark')
        } else if (backendTheme === 'light') {
          setThemeState('light')
          applyThemeClass('light')
          localStorage.setItem(THEME_STORAGE_KEY, 'light')
        }
        // If backendTheme is null/undefined, keep current localStorage setting
      } catch (error) {
        console.error('Failed to load user settings for theme:', error)
      }
    }
    void loadFromBackend()
  }, [isAuthenticated])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {isInitialized ? children : (
        <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      )}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}

