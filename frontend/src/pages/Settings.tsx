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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Customize your Study Buddy experience
          </p>
          
          <div className="mt-8 space-y-8">
            {/* Appearance / Theme */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Appearance
              </h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-yellow-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Toggle between light and dark themes
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    ${
                      theme === 'dark'
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }
                  `}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out
                      ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Notifications
              </h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Email Notifications
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive study reminders and updates
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            {/* Learning Style */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Learning Style
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'visual', label: 'Visual', desc: 'Learn through images and diagrams' },
                  { value: 'text', label: 'Text-based', desc: 'Prefer reading and writing' },
                  { value: 'practice', label: 'Hands-on', desc: 'Learn by doing exercises' },
                  { value: 'balanced', label: 'Balanced', desc: 'Mix of all methods' }
                ].map((style) => (
                  <label key={style.value} className="relative">
                    <input
                      type="radio"
                      name="learningStyle"
                      value={style.value}
                      checked={settings.learningStyle === style.value}
                      onChange={(e) => setSettings(prev => ({ ...prev, learningStyle: e.target.value as any }))}
                      className="sr-only peer"
                    />
                    <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-500/10 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <p className="font-medium text-gray-900 dark:text-white">{style.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{style.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Account */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Account
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Account Settings</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage your profile and preferences
                      </p>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                    Manage
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
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
