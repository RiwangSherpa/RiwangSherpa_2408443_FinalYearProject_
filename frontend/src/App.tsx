import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { DataProvider } from './contexts/DataContext'
import { ToastProvider } from './components/ui/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import Home from './pages/Home'
import Activity from './pages/Activity'
import Goals from './pages/Goals'
import StudyRoadmap from './pages/StudyRoadmap'
import Quiz from './pages/Quiz'
import QuizReview from './pages/QuizReview'
import Productivity from './pages/Productivity'
import Settings from './pages/Settings'
import AccountSettings from './pages/AccountSettings'
import Subscription from './pages/Subscription'
import SubscriptionCallback from './pages/SubscriptionCallback'
import EsewaSuccess from './pages/EsewaSuccess'
import EsewaFailure from './pages/EsewaFailure'
import ProfileAnalytics from './pages/ProfileAnalytics'
import Tutor from './pages/Tutor'
import Gamification from './pages/Gamification'
import Notes from './pages/Notes'
import Brainstorm from './pages/Brainstorm'
import Mindmap from './pages/Mindmap'
import Flashcards from './pages/Flashcards'
import Logo from './components/Logo'

function DefaultRoute() {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg-primary transition-colors">
        <div className="flex flex-col items-center gap-4">
          <Logo size="xl" showText={false} animated />
          <div className="h-1 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-dark-bg-tertiary">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary dark:bg-primary-dark" />
          </div>
        </div>
      </div>
    )
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <Navigate to="/landing" replace />
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DataProvider>
          <ToastProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/landing" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                {/* Default route - redirect to landing if not authenticated, dashboard if authenticated */}
                <Route path="/" element={<DefaultRoute />} />
                
                {/* Protected routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/dashboard" element={<Home />} />
                          <Route path="/activity" element={<Activity />} />
                          <Route path="/goals" element={<Goals />} />
                          <Route path="/roadmaps" element={<StudyRoadmap />} />
                          <Route path="/roadmaps/:goalId" element={<StudyRoadmap />} />
                          <Route path="/quiz" element={<Quiz />} />
                          <Route path="/quiz/:goalId" element={<Quiz />} />
                          <Route path="/quiz/review/:quizId" element={<QuizReview />} />
                          <Route path="/productivity" element={<Productivity />} />
                          <Route path="/subscription" element={<Subscription />} />
                          <Route path="/subscription/esewa/success" element={<EsewaSuccess />} />
                          <Route path="/subscription/esewa/failure" element={<EsewaFailure />} />
                          <Route path="/subscription/callback" element={<SubscriptionCallback />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/settings/account" element={<AccountSettings />} />
                          <Route path="/progress" element={<ProfileAnalytics />} />
                          <Route path="/profile" element={<ProfileAnalytics />} />
                          {/* Feature routes */}
                          <Route path="/tutor" element={<Tutor />} />
                          <Route path="/gamification" element={<Gamification />} />
                          <Route path="/brainstorm" element={<Brainstorm />} />
                          <Route path="/notes" element={<Notes />} />
                          <Route path="/notes/:noteId" element={<Notes />} />
                          <Route path="/mindmap" element={<Mindmap />} />
                          <Route path="/flashcards" element={<Flashcards />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </ToastProvider>
        </DataProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App

