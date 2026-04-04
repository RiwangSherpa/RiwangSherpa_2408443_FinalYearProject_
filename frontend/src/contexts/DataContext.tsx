import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { goalsApi, progressApi, analyticsApi, gamificationApi } from '../lib/api'
import { Goal, Analytics, ActivityData } from '../types'
import { debounce } from '../utils/debounce'
import { useAuth } from './AuthContext'

interface DataContextType {
  // Goals data
  goals: Goal[]
  setGoals: (goals: Goal[]) => void
  loadingGoals: boolean
  refreshGoals: () => Promise<void>
  
  // Analytics data
  analytics: Analytics | null
  setAnalytics: (analytics: Analytics | null) => void
  loadingAnalytics: boolean
  refreshAnalytics: () => Promise<void>
  
  // Activity data
  activities: ActivityData[]
  setActivities: (activities: ActivityData[]) => void
  loadingActivities: boolean
  refreshActivities: () => Promise<void>
  addActivity: (newActivity: ActivityData) => void
  
  // Level data
  levelData: any
  setLevelData: (levelData: any) => void
  loadingLevel: boolean
  refreshLevel: () => Promise<void>
  
  // Global refresh
  refreshAll: () => Promise<void>
  loading: boolean
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [levelData, setLevelData] = useState<any>(null)
  
  const [loadingGoals, setLoadingGoals] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loadingLevel, setLoadingLevel] = useState(false)
  const [initialized, setInitialized] = useState(false)
  
  const loading = loadingGoals || loadingAnalytics || loadingActivities || loadingLevel

  const refreshGoals = useCallback(async () => {
    if (loadingGoals) {
      console.log('[DataContext] refreshGoals skipped - already loading')
      return
    }
    try {
      console.log('[DataContext] Fetching goals...')
      setLoadingGoals(true)
      const response = await goalsApi.getAll()
      console.log('[DataContext] Goals fetched:', response.data.length, 'goals')
      setGoals(response.data)
    } catch (error: any) {
      console.error('[DataContext] Failed to load goals:', error)
      if (error.response?.status === 429) {
        console.warn('[DataContext] Rate limited - will retry')
      }
    } finally {
      setLoadingGoals(false)
    }
  }, [loadingGoals])

  const refreshAnalytics = useCallback(async () => {
    if (loadingAnalytics) return // Prevent duplicate calls
    try {
      setLoadingAnalytics(true)
      const response = await progressApi.getAnalytics()
      setAnalytics(response.data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoadingAnalytics(false)
    }
  }, [loadingAnalytics])

  const refreshActivities = useCallback(
  debounce(async () => {
    if (loadingActivities) return // Prevent duplicate calls
    try {
      setLoadingActivities(true)
      const response = await analyticsApi.getActivity(5)
      setActivities(response.data)
    } catch (error) {
      console.error('Failed to load activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }, 1000), // Debounce with 1 second delay
  [loadingActivities]
)

  // Add real-time activity update function
  const addActivity = useCallback((newActivity: ActivityData) => {
    setActivities(prev => [newActivity, ...prev.slice(0, 9)]) // Keep top 10
  }, [])

  const refreshLevel = useCallback(async () => {
    if (loadingLevel) return // Prevent duplicate calls
    try {
      setLoadingLevel(true)
      const response = await gamificationApi.getLevel()
      setLevelData(response.data)
    } catch (error) {
      console.error('Failed to load level data:', error)
    } finally {
      setLoadingLevel(false)
    }
  }, [loadingLevel])

  const refreshAll = useCallback(async () => {
    if (initialized) return // Prevent multiple initial loads
    if (!isAuthenticated || !token) {
      console.log('[DataContext] Skipping refresh - not authenticated')
      return
    }
    try {
      setInitialized(true)
      await Promise.all([
        refreshGoals(),
        refreshAnalytics(),
        refreshActivities(),
        refreshLevel()
      ])
    } catch (error) {
      console.error('Failed to load initial data:', error)
      setInitialized(false) // Reset on error to allow retry
    }
  }, [refreshGoals, refreshAnalytics, refreshActivities, refreshLevel, isAuthenticated, token])

  // Initial data load - only once and only when authenticated
  useEffect(() => {
    if (!initialized && isAuthenticated && token) {
      refreshAll()
    }
  }, [refreshAll, initialized, isAuthenticated, token])

  return (
    <DataContext.Provider
      value={{
        goals,
        setGoals,
        loadingGoals,
        refreshGoals,
        analytics,
        setAnalytics,
        loadingAnalytics,
        refreshAnalytics,
        activities,
        setActivities,
        loadingActivities,
        refreshActivities,
        addActivity,
        levelData,
        setLevelData,
        loadingLevel,
        refreshLevel,
        refreshAll,
        loading
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
