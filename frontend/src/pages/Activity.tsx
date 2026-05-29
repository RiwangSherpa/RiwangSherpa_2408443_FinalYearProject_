import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, RefreshCw } from 'lucide-react'
import ActivityList from '../components/activity/ActivityList'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { analyticsApi } from '../lib/api'
import type { ActivityData } from '../types'

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response
    return response?.data?.detail || fallback
  }
  return fallback
}

export default function Activity() {
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [limit, setLimit] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadActivity = async (nextLimit = limit) => {
    setLoading(true)
    setError(null)
    try {
      const response = await analyticsApi.getActivity(nextLimit)
      setActivities(response.data as ActivityData[])
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load activity.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadActivity(30)
  }, [])

  const handleLoadMore = async () => {
    const nextLimit = limit + 30
    setLimit(nextLimit)
    await loadActivity(nextLimit)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-primary dark:text-dark-text-secondary dark:hover:text-primary-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="mt-3 font-heading text-3xl font-bold text-primary dark:text-primary-dark">Activity</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-dark-text-secondary">
            A fuller history of your Study Buddy workspace.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => loadActivity()} loading={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        {loading && activities.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex gap-3 rounded-lg border border-neutral-100 p-3 dark:border-dark-border-primary">
                <Skeleton variant="circular" width="40px" height="40px" />
                <div className="flex-1">
                  <Skeleton variant="text" width="55%" height="1rem" className="mb-2" />
                  <Skeleton variant="text" width="85%" height="0.8rem" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            <p className="font-semibold">{error}</p>
            <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => loadActivity()}>
              Retry
            </Button>
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
            <Clock className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
            <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">No recent activity yet</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">Start by creating a goal.</p>
          </div>
        ) : (
          <>
            <ActivityList activities={activities} />
            <div className="mt-6 flex justify-center border-t border-neutral-100 pt-5 dark:border-dark-border-primary">
              <Button type="button" variant="secondary" onClick={handleLoadMore} loading={loading}>
                Load more activity
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
