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
        // Update AuthContext with token and load user - then redirect
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
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
              <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400" />
            </motion.div>
            <h2 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-white">
              Completing Sign In...
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Please wait while we verify your account
            </p>
          </>
        )}

        {error && (
          <>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-white">
              Authentication Failed
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            </motion.div>
            <h2 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-white">
              Sign In Successful!
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Redirecting to dashboard...
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
