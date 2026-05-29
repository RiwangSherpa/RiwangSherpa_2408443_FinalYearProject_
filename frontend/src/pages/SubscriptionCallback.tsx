import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { subscriptionsApi } from '../lib/api'
import { KhaltiVerifyResponse } from '../types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'

function getApiErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.error?.message || error?.response?.data?.detail || fallback
}

export default function SubscriptionCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<KhaltiVerifyResponse | null>(null)
  const [error, setError] = useState('')
  const hasVerified = useRef(false)

  useEffect(() => {
    const verifyPayment = async () => {
      if (hasVerified.current) return
      hasVerified.current = true

      const pidx = searchParams.get('pidx')
      if (!pidx) {
        setError('Missing Khalti payment reference.')
        setLoading(false)
        return
      }

      try {
        const response = await subscriptionsApi.verifyKhaltiPayment(pidx)
        const verifyResult = response.data as KhaltiVerifyResponse
        setResult(verifyResult)

        if (verifyResult.success) {
          await refreshUser()
          await subscriptionsApi.getStatus()
          window.setTimeout(() => navigate('/subscription', { replace: true }), 2500)
        }
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Could not verify Khalti payment.'))
      } finally {
        setLoading(false)
      }
    }

    verifyPayment()
  }, [navigate, refreshUser, searchParams])

  const callbackStatus = searchParams.get('status')
  const isSuccess = result?.success

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="flex flex-col items-center text-center gap-5 py-8">
            {loading ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary-600 dark:text-primary-dark" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                    Verifying Payment
                  </h1>
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    Checking Khalti before activating your plan.
                  </p>
                </div>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-14 h-14 text-green-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                    Payment Successful
                  </h1>
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    Pro plan activated. Redirecting you back to subscription.
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-14 h-14 text-red-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                    Payment Not Completed
                  </h1>
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    {error || result?.message || 'Khalti did not mark this payment as completed.'}
                  </p>
                  {callbackStatus && (
                    <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mt-2">
                      Khalti status: {callbackStatus}
                    </p>
                  )}
                </div>
                <Link to="/subscription">
                  <Button>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
