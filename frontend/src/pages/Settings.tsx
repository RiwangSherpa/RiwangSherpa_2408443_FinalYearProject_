import { useState } from 'react'
import { Save, Bell, Moon, Sun, User } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    learningStyle: 'balanced' as 'visual' | 'text' | 'practice' | 'balanced',
  })

  const handleSave = () => {
    // Save settings to localStorage or API
    localStorage.setItem('studyBuddySettings', JSON.stringify(settings))
    alert('Settings saved!')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-lg text-gray-600">Customize your Study Buddy experience</p>
      </div>

      <div className="space-y-6">
        {/* Learning Style */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">Learning Style</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Choose your preferred learning style to get personalized roadmaps and quizzes.
          </p>
          <select
            value={settings.learningStyle}
            onChange={(e) => setSettings({ ...settings, learningStyle: e.target.value as any })}
            className="input"
          >
            <option value="balanced">Balanced (Mixed approach)</option>
            <option value="visual">Visual (Diagrams, videos, infographics)</option>
            <option value="text">Text (Reading materials, notes)</option>
            <option value="practice">Practice (Hands-on exercises, coding)</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Enable notifications</p>
              <p className="text-sm text-gray-600">Get reminders for study sessions and breaks</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        {/* Appearance */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            {settings.darkMode ? (
              <Moon className="w-6 h-6 text-primary-600" />
            ) : (
              <Sun className="w-6 h-6 text-primary-600" />
            )}
            <h2 className="text-xl font-bold text-gray-900">Appearance</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Dark mode</p>
              <p className="text-sm text-gray-600">Switch to dark theme (coming soon)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })}
                disabled
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 opacity-50"></div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

