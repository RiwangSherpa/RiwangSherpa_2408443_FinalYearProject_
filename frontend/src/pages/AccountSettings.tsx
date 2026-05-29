import { useEffect, useState } from 'react'
import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Crown,
  KeyRound,
  Link2,
  Lock,
  Mail,
  ShieldAlert,
  User,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Skeleton from '../components/ui/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/ToastContext'
import { subscriptionsApi, usersApi } from '../lib/api'
import type { SubscriptionStatus } from '../types'

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response
    return response?.data?.detail || fallback
  }
  return fallback
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <label className="flex h-full flex-col">
      <span className="text-sm font-medium text-neutral-800 dark:text-dark-text-primary">{label}</span>
      <span className={`mt-1 block min-h-[2rem] text-xs leading-4 text-neutral-500 dark:text-dark-text-secondary ${description ? '' : 'invisible'}`}>
        {description || 'No helper text'}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  )
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-dark-border-primary dark:bg-dark-bg-secondary dark:text-dark-text-primary dark:disabled:bg-dark-bg-tertiary ${props.className || ''}`}
    />
  )
}

export default function AccountSettings() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    setFullName(user?.full_name || '')
  }, [user?.full_name])

  useEffect(() => {
    const loadSubscription = async () => {
      setSubscriptionLoading(true)
      try {
        const response = await subscriptionsApi.getStatus()
        setSubscription(response.data as SubscriptionStatus)
      } catch (error) {
        console.error('Failed to load subscription status:', error)
        setSubscription(null)
      } finally {
        setSubscriptionLoading(false)
      }
    }

    void loadSubscription()
  }, [])

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault()
    setProfileSaving(true)
    try {
      await usersApi.updateProfile({ full_name: fullName.trim() || null })
      await refreshUser()
      toast.success('Profile updated successfully.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile. Please try again.'))
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.')
      return
    }

    setPasswordSaving(true)
    try {
      await usersApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed successfully.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to change password. Please try again.'))
    } finally {
      setPasswordSaving(false)
    }
  }

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Student'
  const username = user?.email?.split('@')[0] || ''
  const provider = user?.provider || 'local'
  const isGoogleAccount = provider === 'google'
  const plan = subscription?.plan || user?.subscription_plan || 'free'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-primary dark:text-dark-text-secondary dark:hover:text-primary-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <h1 className="mt-3 font-heading text-3xl font-bold text-primary dark:text-primary-dark">
            Account Settings
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-dark-text-secondary">
            Manage your profile, sign-in security, and account details.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
          View Profile
        </Button>
      </div>

      <div className="rounded-card border border-neutral-200 bg-white/70 p-4 dark:border-dark-border-primary dark:bg-dark-bg-secondary/40 sm:p-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="h-full">
            <div className="flex h-full flex-col gap-5">
              <div className="flex items-start gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-bold text-white dark:bg-primary-dark">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="pt-1">
                  <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-dark-text-primary">
                    Profile Information
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">
                    Update the name shown across Study Buddy.
                  </p>
                </div>
              </div>

              <form className="flex flex-1 flex-col gap-5" onSubmit={handleProfileSave}>
                <div className="grid items-start gap-4 md:grid-cols-2">
                  <Field label="Full name">
                    <Input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your full name"
                      maxLength={255}
                    />
                  </Field>
                  <Field label="Username" description="Generated from your sign-in email for now.">
                    <Input value={username} disabled />
                  </Field>
                  <Field label="Email" description="Email changes need a verified re-authentication flow.">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <Input value={user?.email || ''} disabled className="pl-9" />
                    </div>
                  </Field>
                </div>

                <div className="mt-auto flex justify-end">
                  <Button type="submit" loading={profileSaving}>
                    <User className="mr-2 h-4 w-4" />
                    Save Profile
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          <Card className="h-full">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-dark-text-primary">
                    Connected Accounts
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">
                    Review sign-in providers linked to this account.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-dark-text-primary">Google</p>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">
                    {isGoogleAccount ? 'Connected with Google' : 'Not connected'}
                  </p>
                </div>
                <Badge variant={isGoogleAccount ? 'success' : 'default'}>
                  {isGoogleAccount ? 'Connected' : 'Not connected'}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="h-full">
            <form className="space-y-5" onSubmit={handlePasswordChange}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-dark-text-primary">
                    Account Security
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">
                    Change your password for email/password sign-in.
                  </p>
                </div>
              </div>

              {isGoogleAccount ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-dark-border-primary dark:bg-dark-bg-tertiary dark:text-dark-text-secondary">
                  This account signs in with Google, so password changes are managed by Google.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Current password">
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                      />
                    </Field>
                    <Field label="New password" description="Use at least 8 characters.">
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </Field>
                    <Field label="Confirm new password">
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" loading={passwordSaving}>
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Card>

          <Card className="h-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-dark-text-primary">
                  Subscription
                </h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">
                  View your current Study Buddy plan.
                </p>
              </div>
            </div>
            {subscriptionLoading ? (
              <Skeleton height="4.5rem" />
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium capitalize text-neutral-900 dark:text-dark-text-primary">{plan} plan</p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">
                      {plan === 'pro' ? 'Your Pro learning tools are active.' : 'Upgrade when you need more Study Buddy capacity.'}
                    </p>
                  </div>
                  <Badge variant={plan === 'pro' ? 'success' : 'default'}>{plan === 'pro' ? 'Pro' : 'Free'}</Badge>
                </div>
                <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => navigate('/subscription')}>
                  Manage Plan
                </Button>
              </div>
            )}
          </Card>

          <Card className="border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-900/10 xl:col-span-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-xl font-bold text-red-900 dark:text-red-300">Danger Zone</h2>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300/80">
                  Account deletion is not enabled yet.
                </p>
                <Button
                  type="button"
                  variant="danger"
                  className="mt-4"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete account is not available"
        description="Study Buddy does not currently expose a safe account deletion endpoint, so no account data will be removed from this action."
        confirmLabel="Close"
        cancelLabel="Back"
        destructive
        onConfirm={() => setDeleteDialogOpen(false)}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  )
}
