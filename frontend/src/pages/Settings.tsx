import { useState, useEffect } from 'react'
import { Save, Bell, User, Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [settings, setSettings] = useState({
    notifications: true,
    learningStyle: 'balanced' as 'visual' | 'text' | 'practice' | 'balanced',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('studyBuddySettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Failed to parse saved settings:', error)
      }
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save settings to localStorage
      localStorage.setItem('studyBuddySettings', JSON.stringify(settings))
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Show success message
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-dark-bg-secondary border border-neutral-200 dark:border-dark-border-primary rounded-card p-6 transition-colors duration-300">
          <h1 className="font-heading text-2xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">Settings</h1>
          <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">
            Customize your Study Buddy experience
          </p>
          
          <div className="mt-8 space-y-8">
            {/* Appearance / Theme */}
            <div>
              <h3 className="section-heading dark:text-dark-text-primary mb-4">
                Appearance
              </h3>
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-dark-bg-tertiary rounded-card border border-neutral-200 dark:border-dark-border-primary transition-colors duration-300">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-secondary dark:text-secondary-dark" />
                  ) : (
                    <Sun className="w-5 h-5 text-tertiary" />
                  )}
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-dark-text-primary transition-colors">Dark Mode</p>
                    <p className="text-sm text-neutral-400 dark:text-dark-text-tertiary transition-colors">
                      Toggle between light and dark themes
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark focus:ring-offset-2
                    ${
                      theme === 'dark'
                        ? 'bg-primary dark:bg-primary-dark'
                        : 'bg-neutral-300 dark:bg-dark-border-secondary'
                    }
                  `}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150
                      ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <h3 className="section-heading dark:text-dark-text-primary mb-4">
                Notifications
              </h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-neutral-400 dark:text-dark-text-tertiary transition-colors" />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-dark-text-primary transition-colors">
                        Email Notifications
                      </p>
                      <p className="text-sm text-neutral-400 dark:text-dark-text-tertiary transition-colors">
                        Receive study reminders and updates
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                    className="w-4 h-4 text-primary dark:text-primary-dark border-neutral-300 dark:border-dark-border-primary rounded focus:ring-primary dark:focus:ring-primary-dark transition-colors"
                  />
                </label>
              </div>
            </div>

            {/* Account */}
            <div>
              <h3 className="section-heading dark:text-dark-text-primary mb-4">
                Account
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-dark-bg-tertiary rounded-card border border-neutral-200 dark:border-dark-border-primary transition-colors">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-neutral-400 dark:text-dark-text-tertiary transition-colors" />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-dark-text-primary transition-colors">Account Settings</p>
                      <p className="text-sm text-neutral-400 dark:text-dark-text-tertiary transition-colors">
                        Manage your profile and preferences
                      </p>
                    </div>
                  </div>
                  <button className="text-primary dark:text-primary-dark hover:text-primary-light dark:hover:text-primary/90 font-medium text-sm transition-colors">
                    Manage
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-neutral-200 dark:border-dark-border-primary transition-colors">
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="btn-primary flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white dark:border-dark-bg-primary border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
