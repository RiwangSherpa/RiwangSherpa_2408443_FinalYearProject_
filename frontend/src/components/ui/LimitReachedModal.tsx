import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Clock, ArrowRight } from 'lucide-react'
import Button from './Button'

interface LimitReachedModalProps {
  isOpen: boolean
  onClose: () => void
  feature: string
  limitType: 'daily' | 'active' | 'pro_required'
  currentCount?: number
  limitCount?: number
}

export default function LimitReachedModal({
  isOpen,
  onClose,
  feature,
  limitType,
  currentCount,
  limitCount,
}: LimitReachedModalProps) {
  const navigate = useNavigate()

  const handleUpgrade = () => {
    onClose()
    navigate('/subscription')
  }

  const getTitle = () => {
    switch (limitType) {
      case 'daily':
        return 'Daily Limit Reached'
      case 'active':
        return 'Active Limit Reached'
      case 'pro_required':
        return 'Pro Feature'
      default:
        return 'Limit Reached'
    }
  }

  const getMessage = () => {
    switch (limitType) {
      case 'daily':
        return (
          <>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You've used all your daily <span className="font-semibold text-gray-800 dark:text-gray-100">{feature}</span> for today.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Come back tomorrow!</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Your limit will reset at midnight.
              </p>
            </div>
          </>
        )
      case 'active':
        return (
          <>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You've reached the maximum number of active <span className="font-semibold text-gray-800 dark:text-gray-100">{feature}</span>.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <span className="font-medium">Complete an existing one first</span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Or upgrade to Pro for unlimited access.
              </p>
            </div>
          </>
        )
      case 'pro_required':
        return (
          <>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              <span className="font-semibold text-gray-800 dark:text-gray-100">{feature}</span> is only available with a Pro subscription.
            </p>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Crown className="w-5 h-5" />
                <span className="font-medium">Unlock with Pro</span>
              </div>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                Get unlimited access to all premium features.
              </p>
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full max-w-md mx-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-white" />
                  <h3 className="text-lg font-bold text-white">{getTitle()}</h3>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {getMessage()}

                {/* Progress indicator for daily limits */}
                {limitType === 'daily' && currentCount !== undefined && limitCount !== undefined && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Daily Usage</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {currentCount} / {limitCount}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full"
                        style={{ width: `${(currentCount / limitCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleUpgrade}
                    className="w-full group"
                    variant="primary"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Upgrade to Pro
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  <Button
                    onClick={onClose}
                    variant="ghost"
                    className="w-full"
                  >
                    Maybe Later
                  </Button>
                </div>

                {/* Pro benefits teaser */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Pro includes: Unlimited {feature}, AI Tutor, Advanced Analytics, and more!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
