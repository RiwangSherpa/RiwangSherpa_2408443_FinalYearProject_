import { useEffect, useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Moon,
  Save,
  Shield,
  Sun,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../components/ui/ToastContext'
import { usersApi } from '../lib/api'
import type { UserSettings, UserSettingsUpdate } from '../types'

type ThemePreference = 'light' | 'dark'

type SettingsForm = {
  theme_preference: ThemePreference
  email_notifications: boolean
}

const defaultSettings: SettingsForm = {
  theme_preference: 'light',
  email_notifications: false,
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response
    return response?.data?.detail || fallback
  }
  return fallback
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-primary-dark ${
        checked ? 'bg-primary dark:bg-primary-dark' : 'bg-neutral-300 dark:bg-dark-border-secondary'
      }`}
      aria-pressed={checked}
      aria-label={label}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
          {title}
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">
          {description}
        </p>
      </div>
    </div>
  )
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-[6rem] flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-dark-border-primary dark:bg-dark-bg-tertiary sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-neutral-900 dark:text-dark-text-primary">{title}</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">{description}</p>
      </div>
      <div className="shrink-0 sm:ml-6">{children}</div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const [settings, setSettings] = useState<SettingsForm>({ ...defaultSettings, theme_preference: theme })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const response = await usersApi.getSettings()
        const data = response.data as UserSettings
        setSettings({
          ...defaultSettings,
          ...data,
          theme_preference: data.theme_preference === 'dark' ? 'dark' : 'light',
        })
      } catch (error) {
        setLoadError(getErrorMessage(error, 'Settings could not be loaded.'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettings()
  }, [])

  const updateSetting = <Key extends keyof SettingsForm>(key: Key, value: SettingsForm[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const updateThemePreference = (nextTheme: ThemePreference) => {
    updateSetting('theme_preference', nextTheme)
    setTheme(nextTheme)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload: UserSettingsUpdate = {
        theme_preference: settings.theme_preference,
        email_notifications: settings.email_notifications,
      }
      const response = await usersApi.updateSettings(payload)
      const data = response.data as UserSettings
      setSettings({
        ...defaultSettings,
        ...data,
        theme_preference: data.theme_preference === 'dark' ? 'dark' : 'light',
      })
      toast.success(payload.email_notifications ? 'Email notifications enabled.' : 'Settings saved successfully.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save settings. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary dark:text-primary-dark">Settings</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-dark-text-secondary">
            Customize your Study Buddy experience.
          </p>
        </div>
        <Button type="button" onClick={handleSave} loading={isSaving} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="space-y-4">
              <Skeleton width="35%" height="1.25rem" />
              <Skeleton lines={2} variant="text" />
              <Skeleton height={index === 0 ? '8rem' : '4rem'} />
            </Card>
          ))}
        </div>
      ) : loadError ? (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
              Settings unavailable
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">{loadError}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="flex h-full flex-col gap-5">
                <SectionHeader
                  icon={theme === 'dark' ? Moon : Sun}
                  title="Appearance"
                  description="Choose how Study Buddy looks while you learn."
                />
                <SettingRow title="Dark mode" description="Use a darker interface for low-light study sessions.">
                  <Toggle
                    checked={settings.theme_preference === 'dark'}
                    onChange={(checked) => updateThemePreference(checked ? 'dark' : 'light')}
                    label="Toggle dark mode"
                  />
                </SettingRow>
              </div>

              <div className="flex h-full flex-col gap-5">
                <SectionHeader
                  icon={Bell}
                  title="Notifications"
                  description="Control reminders and progress updates."
                />
                <SettingRow title="Email notifications" description="Receive important Study Buddy updates by email.">
                  <Toggle
                    checked={settings.email_notifications}
                    onChange={(checked) => updateSetting('email_notifications', checked)}
                    label="Toggle email notifications"
                  />
                </SettingRow>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
                  Account
                </h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-dark-text-secondary">
                  Manage your profile, email, password, and account security.
                </p>
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={() => navigate('/settings/account')}>
              Manage Account
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        </>
      )}
    </div>
  )
}
