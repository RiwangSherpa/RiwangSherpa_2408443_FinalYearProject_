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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg-primary px-4 transition-colors duration-300">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-card border border-neutral-200 dark:border-dark-border-primary p-8 text-center transition-colors duration-300">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-muted dark:bg-primary/20 rounded-full mb-4 transition-colors">
              <CheckCircle className="w-8 h-8 text-primary dark:text-primary-dark transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-dark-text-primary mb-2 font-heading transition-colors">Check your email</h2>
            <p className="text-neutral-600 dark:text-dark-text-secondary mb-6 transition-colors">
              If an account with {email} exists, we've sent password reset instructions.
            </p>
            
            <Link
              to="/login"
              className="text-primary hover:text-primary-light font-semibold"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg-primary px-4 transition-colors duration-300">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary dark:bg-primary-dark rounded-2xl mb-4 transition-colors">
            <BookOpen className="w-8 h-8 text-white transition-colors" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">Forgot Password</h1>
          <p className="mt-2 text-neutral-600 dark:text-dark-text-secondary transition-colors">Enter your email to reset your password</p>
        </div>

        <div className="bg-white dark:bg-dark-bg-secondary rounded-card border border-neutral-200 dark:border-dark-border-primary p-8 transition-colors duration-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2 transition-colors">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                className="input-base"
                placeholder="you@example.com"
              />
            </div>

            {/* Google Account Warning */}
            {isGoogleAccount && !checkingAccount && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md bg-tertiary-light p-4"
              >
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-tertiary" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-tertiary">
                      Google Sign-In Account
                    </h3>
                    <div className="mt-2 text-sm text-tertiary">
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
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              className="text-sm text-primary hover:text-primary-light font-medium"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

