import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { completeOAuthLogin } = useAuth()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setError('Authentication failed. No token received.')
        setIsLoading(false)
        return
      }

      try {
        await completeOAuthLogin(token)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Failed to complete authentication:', err)
        setError('Failed to complete authentication. Please try again.')
        setIsLoading(false)
      }
    }

    handleAuthCallback()
  }, [navigate, searchParams, completeOAuthLogin])

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-8"
      >
        {isLoading && !error && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block"
            >
              <Loader2 className="w-16 h-16 text-primary" />
            </motion.div>
            <h2 className="mt-6 text-2xl font-semibold text-neutral-900 font-heading">
              Completing Sign In...
            </h2>
            <p className="mt-2 text-neutral-600">
              Please wait while we verify your account
            </p>
          </>
        )}

        {error && (
          <>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="mt-6 text-2xl font-semibold text-neutral-900 font-heading">
              Authentication Failed
            </h2>
            <p className="mt-2 text-neutral-600">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
            >
              Back to Login
            </button>
          </>
        )}

        {!isLoading && !error && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            </motion.div>
            <h2 className="mt-6 text-2xl font-semibold text-neutral-900 font-heading">
              Sign In Successful!
            </h2>
            <p className="mt-2 text-neutral-600">
              Redirecting to dashboard...
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
