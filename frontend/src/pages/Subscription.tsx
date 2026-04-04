import { useState, useEffect } from 'react'
import { subscriptionsApi } from '../lib/api'
import { SubscriptionStatus } from '../types'
import { Check, X, Loader2, Crown, Zap, CreditCard, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'

export default function Subscription() {
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [features, setFeatures] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  })
  const [processingPayment, setProcessingPayment] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statusRes, featuresRes] = await Promise.all([
        subscriptionsApi.getStatus(),
        subscriptionsApi.getFeatures(),
      ])
      setStatus(statusRes.data)
      setFeatures(featuresRes.data)
    } catch (error) {
      console.error('Failed to load subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan: string) => {
    if (plan === 'pro' && !isPro) {
      // Show payment modal for Pro upgrade
      setShowPaymentModal(true)
      return
    }
    
    // Direct upgrade/downgrade without payment
    setUpgrading(true)
    setError('')
    setSuccess('')

    try {
      const response = await subscriptionsApi.upgrade(plan, 'demo')
      setStatus(response.data.subscription_status)
      if (response.data.success) {
        setSuccess(`Successfully ${plan === 'pro' ? 'upgraded' : 'downgraded'} to ${plan} plan!`)
        // Refresh user data to update subscription info
        await refreshUser()
      } else {
        setError(response.data.message)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update subscription')
    } finally {
      setUpgrading(false)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessingPayment(true)
    setError('')

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
      const response = await subscriptionsApi.upgrade('pro', 'demo')
      setStatus(response.data.subscription_status)
      if (response.data.success) {
        setSuccess('Payment successful! Your Pro subscription is now active.')
        setShowPaymentModal(false)
        setPaymentData({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' })
        // Refresh user data to update subscription info
        await refreshUser()
      } else {
        setError(response.data.message)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Payment processing failed')
    } finally {
      setProcessingPayment(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const isPro = status?.plan === 'pro' && status?.is_active

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-2 transition-colors">Subscription</h1>
          <p className="text-lg text-gray-600 dark:text-dark-text-secondary transition-colors">Manage your subscription plan</p>
      </div>

      {/* Current Status */}
      <div className="card mb-8 bg-white dark:bg-dark-bg-secondary border border-neutral-200 dark:border-dark-border-primary transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2 transition-colors">Current Plan</h2>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${isPro ? 'text-primary-600 dark:text-primary-dark' : 'text-gray-700 dark:text-dark-text-secondary'} transition-colors`}>
                {status?.plan === 'pro' ? 'Pro' : 'Free'}
              </span>
              {isPro && (
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  Active
                </span>
              )}
            </div>
            {status?.expires_at && (
              <p className="text-sm text-gray-500 mt-2">
                Expires: {new Date(status.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
          {isPro && (
            <div className="text-6xl">
              <Crown className="w-16 h-16 text-primary-600" />
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Plan Comparison */}
      {features && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card ${!isPro ? 'ring-2 ring-primary-500' : ''}`}
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
              <p className="text-gray-500">Forever free</p>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{features.free.goals} Goals</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{features.free.roadmaps}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{features.free.quizzes} Quizzes per topic</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500 dark:text-dark-text-tertiary transition-colors">AI Explanations</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500 dark:text-dark-text-tertiary transition-colors">Advanced Analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500 dark:text-dark-text-tertiary transition-colors">Export Features</span>
              </li>
            </ul>

            {!isPro ? (
              <div className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-center font-medium">
                Current Plan
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade('free')}
                disabled={upgrading}
                className="w-full btn-secondary"
              >
                Switch to Free
              </button>
            )}
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`card relative ${isPro ? 'ring-2 ring-primary-500' : 'border-2 border-primary-200'}`}
          >
            {isPro && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Current Plan
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-primary-600" />
                <h3 className="text-2xl font-bold text-gray-900">Pro</h3>
              </div>
              <div className="text-4xl font-bold text-primary-600 mb-1">$9.99</div>
              <p className="text-gray-500">per month</p>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{features.pro.goals} Goals</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{features.pro.roadmaps}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{features.pro.quizzes}</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-600" />
                <span className="font-medium">{features.pro.ai_explanations && '✓'} AI Explanations</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-600" />
                <span className="font-medium">{features.pro.advanced_analytics && '✓'} Advanced Analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-600" />
                <span className="font-medium">{features.pro.export && '✓'} Export Features</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-600" />
                <span className="font-medium">{features.pro.priority_support && '✓'} Priority Support</span>
              </li>
            </ul>

            {isPro ? (
              <div className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-center font-medium">
                Active
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade('pro')}
                disabled={upgrading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {upgrading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Upgrade to Pro
                  </>
                )}
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* Demo Payment Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 mt-0.5">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Demo Payment System</h3>
            <p className="text-sm text-blue-700">
              This is a demonstration system. No real payments are processed. 
              Enter any card details to simulate a successful payment and activate your Pro subscription for 30 days.
            </p>
          </div>
        </div>
      </Card>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Payment Information</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Demo Mode:</strong> This is a simulated payment. Enter any card details to proceed.
                </p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentData.cardholderName}
                    onChange={(e) => setPaymentData({ ...paymentData, cardholderName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={paymentData.cardNumber}
                      onChange={(e) => setPaymentData({ ...paymentData, cardNumber: formatCardNumber(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={paymentData.expiryDate}
                      onChange={(e) => setPaymentData({ ...paymentData, expiryDate: formatExpiryDate(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        maxLength={4}
                        value={paymentData.cvv}
                        onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1"
                    disabled={processingPayment}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    loading={processingPayment}
                    disabled={processingPayment}
                  >
                    {processingPayment ? 'Processing...' : 'Pay $9.99'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
  )
}

