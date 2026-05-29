import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, CheckCircle } from 'lucide-react'
import Logo from '../components/Logo'
import { authApi } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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
            <div className="mb-5 flex justify-center">
              <Logo size="lg" showText={false} animated />
            </div>
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
          <div className="flex justify-center mb-5">
            <Logo size="xl" showText={false} animated />
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

            <button
              type="submit"
              disabled={loading}
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

