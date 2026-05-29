import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { subscriptionsApi } from '../lib/api'
import { EsewaVerifyResponse } from '../types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'

function getApiErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.error?.message || error?.response?.data?.detail || fallback
}

export default function EsewaSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<EsewaVerifyResponse | null>(null)
  const [error, setError] = useState('')
  const hasVerified = useRef(false)

  const callbackData = useMemo(() => {
    return Object.fromEntries(searchParams.entries())
  }, [searchParams])

  useEffect(() => {
    const verifyPayment = async () => {
      if (hasVerified.current) return
      hasVerified.current = true

      const transactionUuid = searchParams.get('transaction_uuid') || undefined
      const encodedData = searchParams.get('data') || undefined
      if (!transactionUuid && !encodedData) {
        setError('Missing eSewa payment reference.')
        setLoading(false)
        return
      }

      try {
        const response = await subscriptionsApi.verifyEsewaPayment({
          transaction_uuid: transactionUuid,
          data: encodedData,
          callback_data: callbackData,
        })
        const verifyResult = response.data as EsewaVerifyResponse
        setResult(verifyResult)

        if (verifyResult.success) {
          await refreshUser()
          await subscriptionsApi.getStatus()
          window.setTimeout(() => navigate('/subscription', { replace: true }), 2500)
        }
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Could not verify eSewa payment.'))
      } finally {
        setLoading(false)
      }
    }

    verifyPayment()
  }, [callbackData, navigate, refreshUser, searchParams])

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
                    Verifying eSewa Payment
                  </h1>
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    Verifying eSewa payment...
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
                    Payment successful. Pro plan activated.
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
                    {error || result?.message || 'eSewa did not mark this payment as completed.'}
                  </p>
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
