import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import Goals from './pages/Goals'
import StudyRoadmap from './pages/StudyRoadmap'
import Quiz from './pages/Quiz'
import ProgressDashboard from './pages/ProgressDashboard'
import Productivity from './pages/Productivity'
import Settings from './pages/Settings'
import Subscription from './pages/Subscription'

// Default route handler - redirects based on auth status
function DefaultRoute() {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
    <ToastProvider>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
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
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/roadmaps" element={<StudyRoadmap />} />
                    <Route path="/roadmaps/:goalId" element={<StudyRoadmap />} />
                    <Route path="/quiz" element={<Quiz />} />
                    <Route path="/quiz/:goalId" element={<Quiz />} />
                    <Route path="/progress" element={<ProgressDashboard />} />
                    <Route path="/productivity" element={<Productivity />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

