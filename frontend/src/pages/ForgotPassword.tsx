import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Mail, Loader2, AlertCircle, CheckCircle, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import Logo from '../components/Logo'
import GoogleButton from '../components/auth/GoogleButton'
import { authApi } from '../lib/api'

export default function ForgotPassword() {
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [isGoogleAccount, setIsGoogleAccount] = useState(false)
  const [checkingAccount, setCheckingAccount] = useState(false)

  const checkGoogleAccount = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) return
    
    setCheckingAccount(true)
    try {
      const response = await authApi.checkGoogleAccount(emailToCheck)
      setIsGoogleAccount(response.data.is_google_account)
    } catch (err) {
      console.error('Failed to check account type:', err)
    } finally {
      setCheckingAccount(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    setError('')
    
    // Debounce check for Google account
    if (newEmail.includes('@') && newEmail.includes('.')) {
      const timeoutId = setTimeout(() => {
        checkGoogleAccount(newEmail)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    window.location.href = `${apiUrl}/api/auth/google`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Check if Google account first
    await checkGoogleAccount(email)
    if (isGoogleAccount) {
      return // Don't proceed with password reset for Google accounts
    }
    
    setLoading(true)

    try {
      await authApi.forgotPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-200 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      }`}>
        <div className="max-w-md w-full">
          <div className={`rounded-2xl shadow-xl p-8 text-center transition-colors ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Check your email</h2>
            <p className={theme === 'dark' ? 'text-gray-300 mb-6' : 'text-gray-600 mb-6'}>
              If an account with {email} exists, we've sent password reset instructions.
            </p>
            
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>Forgot Password</h1>
          <p className={`mt-2 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>Enter your email to reset your password</p>
        </div>

        <div className={`rounded-2xl shadow-xl p-8 transition-colors ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="you@example.com"
              />
            </div>

            {/* Google Account Warning */}
            {isGoogleAccount && !checkingAccount && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-4"
              >
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-400 dark:text-amber-500" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Google Sign-In Account
                    </h3>
                    <div className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                      <p>
                        This account uses Google Sign-In. You cannot reset the password here.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <GoogleButton 
                    label="Continue with Google"
                    onClick={handleGoogleLogin}
                    isLoading={loading}
                  />
                </div>
              </motion.div>
            )}

            {/* Only show reset button if not a Google account */}
            {!isGoogleAccount && (
              <button
                type="submit"
                disabled={loading || checkingAccount}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            )}
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

