import { useEffect, useState } from 'react'
import { subscriptionsApi } from '../lib/api'
import { EsewaInitiateResponse, SubscriptionStatus } from '../types'
import { Check, Crown, ExternalLink, Loader2, ShieldCheck, Wallet, X, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'

function getApiErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.error?.message || error?.response?.data?.detail || fallback
}

function isActivePro(status: SubscriptionStatus | null) {
  const expiresAt = status?.subscription_expires_at || status?.expires_at
  return Boolean(
    status?.plan === 'pro' &&
    expiresAt &&
    new Date(expiresAt) > new Date()
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-NP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

export default function Subscription() {
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [features, setFeatures] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      setError('Could not load subscription details.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan: string) => {
    setUpgrading(true)
    setError('')
    setSuccess('')

    try {
      if (plan === 'pro') {
        const response = await subscriptionsApi.initiateEsewaPayment()
        const payment = response.data as EsewaInitiateResponse
        submitEsewaForm(payment)
        return
      }

      const response = await subscriptionsApi.upgrade(plan, 'manual')
      setStatus(response.data.subscription_status)
      if (response.data.success) {
        setSuccess('Subscription downgraded to Free plan.')
        await refreshUser()
      } else {
        setError(response.data.message)
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to start eSewa checkout.'))
    } finally {
      setUpgrading(false)
    }
  }

  const submitEsewaForm = (payment: EsewaInitiateResponse) => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = payment.payment_url
    form.style.display = 'none'

    const fields: Record<string, string> = {
      amount: payment.amount,
      tax_amount: payment.tax_amount,
      total_amount: payment.total_amount,
      transaction_uuid: payment.transaction_uuid,
      product_code: payment.product_code,
      product_service_charge: payment.product_service_charge,
      product_delivery_charge: payment.product_delivery_charge,
      success_url: payment.success_url,
      failure_url: payment.failure_url,
      signed_field_names: payment.signed_field_names,
      signature: payment.signature,
    }

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const isPro = isActivePro(status)
  const expiresAt = status?.subscription_expires_at || status?.expires_at
  const proPriceNpr = Number(features?.pro?.price_npr || 999)
  const formattedProPrice = `Rs. ${proPriceNpr.toLocaleString()}`
  const currentPlanBadgeClasses = isPro
    ? 'bg-primary-100 text-primary-800 ring-1 ring-primary-200 dark:bg-primary/15 dark:text-primary-dark dark:ring-primary-dark/40'
    : 'bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary dark:ring-dark-border-primary'

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-4 py-6 transition-colors duration-300 sm:px-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-7">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary transition-colors sm:text-4xl">
            Subscription
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-dark-text-secondary transition-colors sm:text-lg">
            Manage your StudyBuddy plan and eSewa checkout.
          </p>
        </div>

        <div className={`mb-8 overflow-hidden rounded-card border transition-colors duration-300 ${
          isPro
            ? 'border-primary-300 bg-gradient-to-br from-primary-50 via-white to-green-50 shadow-lg shadow-primary-100/70 dark:border-primary-dark/50 dark:from-primary/15 dark:via-dark-bg-secondary dark:to-green-950/20 dark:shadow-none'
            : 'border-neutral-200 bg-white dark:border-dark-border-primary dark:bg-dark-bg-secondary'
        }`}>
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-text-tertiary">
                Current Plan
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className={`text-3xl font-bold transition-colors sm:text-4xl ${
                  isPro ? 'text-primary-700 dark:text-primary-dark' : 'text-gray-900 dark:text-dark-text-primary'
                }`}>
                  {isPro ? 'Pro' : 'Free'}
                </h2>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${currentPlanBadgeClasses}`}>
                  {isPro ? 'Active' : 'Forever free'}
                </span>
              </div>
              {isPro && expiresAt && (
                <p className="mt-3 text-sm text-gray-600 dark:text-dark-text-secondary">
                  Renews until {formatDate(expiresAt)}
                </p>
              )}
              {!isPro && (
                <p className="mt-3 text-sm text-gray-600 dark:text-dark-text-secondary">
                  No expiry date.
                </p>
              )}
            </div>
            <div className={`flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl border ${
              isPro
                ? 'border-primary/20 bg-primary text-white shadow-lg shadow-primary/20 dark:border-primary-dark/30 dark:bg-primary-dark dark:text-dark-bg-primary'
                : 'border-neutral-200 bg-neutral-100 text-neutral-500 dark:border-dark-border-primary dark:bg-dark-bg-tertiary dark:text-dark-text-secondary'
            }`}>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                isPro
                  ? 'bg-white/15 text-white shadow-sm dark:bg-dark-bg-primary/10 dark:text-dark-bg-primary'
                  : 'bg-white/70 text-neutral-500 dark:bg-dark-bg-secondary dark:text-dark-text-secondary'
              }`}>
                <Crown className="h-6 w-6" strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {features && (
          <div className="grid grid-cols-1 items-stretch gap-6 mb-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex h-full flex-col rounded-card border bg-white p-6 transition-colors dark:bg-dark-bg-secondary ${
                !isPro
                  ? 'border-primary-500 shadow-md shadow-primary-100/70 ring-2 ring-primary-100 dark:border-primary-dark dark:ring-primary/20 dark:shadow-none'
                  : 'border-neutral-200 dark:border-dark-border-primary'
              }`}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Free</h3>
                  <div className="mt-4 text-4xl font-bold text-gray-900 dark:text-dark-text-primary">Rs. 0</div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-tertiary">Forever free</p>
                </div>
                {!isPro && (
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700 dark:bg-primary/15 dark:text-primary-dark">
                    Current Plan
                  </span>
                )}
              </div>

              <ul className="mb-6 flex-1 space-y-3 text-sm text-gray-700 dark:text-dark-text-secondary sm:text-base">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <span>{features.free.goals} Goals</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <span>{features.free.roadmaps}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <span>{features.free.quizzes} Quizzes per topic</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                  <span className="text-gray-500 dark:text-dark-text-tertiary">AI Explanations</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                  <span className="text-gray-500 dark:text-dark-text-tertiary">Advanced Analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                  <span className="text-gray-500 dark:text-dark-text-tertiary">Export Features</span>
                </li>
              </ul>

              {!isPro ? (
                <div className="flex min-h-11 items-center justify-center rounded-lg bg-primary-50 px-4 py-2 text-center font-semibold text-primary-800 ring-1 ring-primary-100 dark:bg-primary/15 dark:text-primary-dark dark:ring-primary-dark/30">
                  Current Plan
                </div>
              ) : (
                <Button
                  onClick={() => handleUpgrade('free')}
                  disabled={upgrading}
                  variant="secondary"
                  className="min-h-11 w-full border-neutral-300 text-neutral-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800 dark:border-dark-border-primary dark:text-dark-text-secondary dark:hover:border-primary-dark dark:hover:bg-primary/10 dark:hover:text-primary-dark"
                >
                  {upgrading ? 'Updating...' : 'Downgrade to Free'}
                </Button>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`flex h-full flex-col rounded-card border bg-white p-6 transition-colors dark:bg-dark-bg-secondary ${
                isPro
                  ? 'border-primary-500 shadow-md shadow-primary-100/80 ring-2 ring-primary-100 dark:border-primary-dark dark:ring-primary/20 dark:shadow-none'
                  : 'border-primary-200 dark:border-primary-dark/60'
              }`}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm ring-1 ring-primary/20 dark:bg-primary-dark dark:text-dark-bg-primary dark:ring-primary-dark/30">
                      <Crown className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Pro</h3>
                  </div>
                  <div className="mt-4 text-4xl font-bold text-primary-700 dark:text-primary-dark">
                    {formattedProPrice}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-tertiary">
                    NPR {proPriceNpr.toLocaleString()}/month via eSewa
                  </p>
                </div>
                {isPro && (
                  <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-800 ring-1 ring-primary-200 dark:bg-primary/15 dark:text-primary-dark dark:ring-primary-dark/40">
                    Current Plan
                  </span>
                )}
              </div>

              <ul className="mb-6 flex-1 space-y-3 text-sm text-gray-700 dark:text-dark-text-secondary sm:text-base">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <span>{features.pro.goals} Goals</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <span>{features.pro.roadmaps}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <span>{features.pro.quizzes}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-dark" />
                  <span className="font-medium">AI Explanations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-dark" />
                  <span className="font-medium">Advanced Analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-dark" />
                  <span className="font-medium">Export Features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-dark" />
                  <span className="font-medium">Priority Support</span>
                </li>
              </ul>

              {isPro ? (
                <Button
                  disabled
                  className="min-h-11 w-full border border-primary-200 bg-gradient-to-r from-primary-50 to-green-50 text-primary-800 opacity-100 shadow-sm dark:border-primary-dark/40 dark:from-primary/15 dark:to-green-900/20 dark:text-primary-dark"
                >
                  <Crown className="mr-2 h-4 w-4" strokeWidth={2.2} />
                  Active Plan
                </Button>
              ) : (
                <Button
                  onClick={() => handleUpgrade('pro')}
                  disabled={upgrading}
                  className="min-h-11 w-full bg-primary text-white shadow-sm hover:bg-primary-light disabled:bg-primary/60 dark:bg-primary-dark dark:text-dark-bg-primary dark:hover:bg-primary/90"
                >
                  {upgrading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating checkout...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      Pay with eSewa
                      <ExternalLink className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </motion.div>
          </div>
        )}

        <Card className="border border-primary-100 bg-white dark:border-primary-dark/30 dark:bg-dark-bg-secondary">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary/15 dark:text-primary-dark">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary mb-1">eSewa Checkout</h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                Payments are processed through eSewa sandbox and verified by StudyBuddy before Pro is activated.
                Pro is activated only after backend verification.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
