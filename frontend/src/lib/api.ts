/**
 * API client for backend communication
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API] Response error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Goals API
export const goalsApi = {
  getAll: () => api.get('/api/goals'),
  getById: (id: number) => api.get(`/api/goals/${id}`),
  create: (data: any) => api.post('/api/goals', data),
  update: (id: number, data: any) => api.put(`/api/goals/${id}`, data),
  delete: (id: number) => api.delete(`/api/goals/${id}`),
  complete: (id: number) => api.patch(`/api/goals/${id}/complete`),
}

// Roadmaps API
export const roadmapsApi = {
  generate: (goalId: number, numSteps: number = 10) =>
    api.post('/api/roadmaps/generate', { goal_id: goalId, num_steps: numSteps }),
  getByGoal: (goalId: number) => api.get(`/api/roadmaps/goal/${goalId}`),
  completeStep: (stepId: number) => api.patch(`/api/roadmaps/steps/${stepId}/complete`),
  uncompleteStep: (stepId: number) => api.patch(`/api/roadmaps/steps/${stepId}/uncomplete`),
}

// Quizzes API
export const quizzesApi = {
  generate: (goalId: number, topic: string, numQuestions: number = 3, difficulty: string = 'medium') =>
    api.post('/api/quizzes/generate', {
      goal_id: goalId,
      topic,
      num_questions: numQuestions,
      difficulty,
    }),
  submit: (quizData: any, answers: number[], goalId?: number, topic?: string) =>
    api.post('/api/quizzes/submit', {
      quiz_data: {
        ...quizData,
        goal_id: goalId,
        topic: topic,
      },
      answers: {
        answers,
        quiz_id: goalId,
      },
    }),
  getResults: (goalId: number) => api.get(`/api/quizzes/results/${goalId}`),
}

// Progress API
export const progressApi = {
  create: (data: any) => api.post('/api/progress', data),
  getByGoal: (goalId: number) => api.get(`/api/progress/goal/${goalId}`),
  getAnalytics: () => api.get('/api/progress/analytics'),
  getStreak: () => api.get('/api/progress/streak'),
}

// Productivity API
export const productivityApi = {
  createSession: (data: any) => api.post('/api/productivity/sessions', data),
  completeSession: (sessionId: number) => api.patch(`/api/productivity/sessions/${sessionId}/complete`),
  getSessions: (skip: number = 0, limit: number = 50) =>
    api.get('/api/productivity/sessions', { params: { skip, limit } }),
  getTips: () => api.get('/api/productivity/tips'),
}

// AI Explanation API
export const aiApi = {
  explainStep: (stepId: number, question?: string) =>
    api.post('/api/ai/explain', {
      roadmap_step_id: stepId,
      question,
    }),
}

// Authentication API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  register: (email: string, password: string, fullName?: string) =>
    api.post('/api/auth/register', { email, password, full_name: fullName }),
  getMe: (token?: string) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return api.get('/api/auth/me', { headers })
  },
  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { token, new_password: newPassword }),
}

// Subscriptions API
export const subscriptionsApi = {
  getStatus: () => api.get('/api/subscriptions/status'),
  upgrade: (plan: string, paymentMethod: string = 'demo') =>
    api.post('/api/subscriptions/upgrade', { plan, payment_method: paymentMethod }),
  getFeatures: () => api.get('/api/subscriptions/features'),
}

// Analytics API
export const analyticsApi = {
  getOverview: () => api.get('/api/analytics/overview'),
  getCurrentGoal: () => api.get('/api/analytics/goals/current'),
  getCurrentRoadmap: () => api.get('/api/analytics/roadmap/current'),
  getQuizAnalytics: () => api.get('/api/analytics/quizzes'),
}

// Users API (Settings)
export const usersApi = {
  getTheme: () => api.get('/api/users/theme'),
  updateTheme: (theme: string) => api.put('/api/users/theme', { theme }),
  getSettings: () => api.get('/api/users/settings'),
}

export default api

