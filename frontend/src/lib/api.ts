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
  getMyRoadmaps: () => api.get('/api/roadmaps/my-roadmaps'),
  completeStep: (stepId: number) => api.patch(`/api/roadmaps/steps/${stepId}/complete`),
  uncompleteStep: (stepId: number) => api.patch(`/api/roadmaps/steps/${stepId}/uncomplete`),
  delete: (goalId: number) => api.delete(`/api/roadmaps/goal/${goalId}`),
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
  getMyQuizzes: () => api.get('/api/quizzes/my-quizzes'),
  getById: (quizId: number) => api.get(`/api/quizzes/${quizId}`),
  delete: (quizId: number) => api.delete(`/api/quizzes/${quizId}`),
}

// Progress API
export const progressApi = {
  create: (data: any) => api.post('/api/progress', data),
  getByGoal: (goalId: number) => api.get(`/api/progress/goal/${goalId}`),
  getAnalytics: () => api.get('/api/progress/analytics'),
  getStreak: () => api.get('/api/progress/streak'),
  recordSession: (minutes: number) => api.post('/api/progress/session', { minutes }),
  trackTime: (minutes: number) => api.post('/api/progress/track-time', { minutes }),
  getStudyHistory: (days: number = 30) => api.get('/api/progress/study-history', { params: { days } }),
  getStreakHistory: (days: number = 30) => api.get('/api/progress/streak-history', { params: { days } }),
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

// Tutor API
export const tutorApi = {
  getStats: () => api.get('/api/tutor/stats'),
  getSessions: (activeOnly = false) => api.get(`/api/tutor/sessions?active_only=${activeOnly}`),
  getSession: (sessionId: number) => api.get(`/api/tutor/sessions/${sessionId}`),
  createSession: (data: { title?: string; goal_id?: number; step_id?: number }) => 
    api.post('/api/tutor/sessions', data),
  sendMessage: (sessionId: number, content: string) => 
    api.post(`/api/tutor/sessions/${sessionId}/message`, { content }),
  rateMessage: (messageId: number, wasHelpful: boolean) => 
    api.post(`/api/tutor/messages/${messageId}/rate`, { was_helpful: wasHelpful }),
  closeSession: (sessionId: number) => 
    api.post(`/api/tutor/sessions/${sessionId}/close`),
  explainConcept: (conceptName: string, context?: string, difficultyLevel = 'intermediate') =>
    api.post('/api/tutor/explain-concept', null, { 
      params: { 
        concept_name: conceptName, 
        context, 
        difficulty_level: difficultyLevel 
      } 
    }),
}

// Gamification API
export const gamificationApi = {
  getProfile: () => api.get('/api/gamification/profile'),
  getAchievements: () => api.get('/api/gamification/achievements'),
  checkAchievements: () => api.post('/api/gamification/check-achievements', {}),
  getLevel: () => api.get('/api/gamification/level'),
  getLeaderboard: (limit: number = 10) => api.get('/api/gamification/leaderboard', { params: { limit } }),
  getStats: () => api.get('/api/gamification/stats'),
}

// Knowledge Graph API
export const knowledgeGraphApi = {
  getGraph: (goalId: number) => api.get(`/api/knowledge-graph/goals/${goalId}`),
  createNode: (goalId: number, label: string, nodeType: string = 'concept', description?: string) =>
    api.post(`/api/knowledge-graph/goals/${goalId}/nodes`, { label, node_type: nodeType, description }),
  createEdge: (goalId: number, sourceNodeId: number, targetNodeId: number, edgeType: string = 'prerequisite') =>
    api.post(`/api/knowledge-graph/goals/${goalId}/edges`, { source_node_id: sourceNodeId, target_node_id: targetNodeId, edge_type: edgeType }),
  autoGenerate: (goalId: number) => api.post(`/api/knowledge-graph/goals/${goalId}/auto-generate`, {}),
  updateMastery: (nodeId: number, masteryLevel: number) =>
    api.patch(`/api/knowledge-graph/nodes/${nodeId}/mastery`, { mastery_level: masteryLevel }),
  getLearningPath: (goalId: number) => api.get(`/api/knowledge-graph/goals/${goalId}/learning-path`),
  getCoverage: (goalId: number) => api.get(`/api/knowledge-graph/goals/${goalId}/coverage`),
  getUnlocked: (goalId: number) => api.get(`/api/knowledge-graph/goals/${goalId}/unlocked`),
}

// Predictive Analytics API
export const predictionsApi = {
  getVelocity: (days: number = 14) => api.get('/api/predictions/velocity', { params: { days } }),
  getGoalPrediction: (goalId: number) => api.get(`/api/predictions/goal/${goalId}`),
  getAtRiskGoals: () => api.get('/api/predictions/at-risk-goals'),
  getOptimalStudyTimes: () => api.get('/api/predictions/optimal-study-times'),
  getLearningEfficiency: () => api.get('/api/predictions/learning-efficiency'),
  getDashboard: () => api.get('/api/predictions/dashboard'),
  getAllGoalPredictions: () => api.get('/api/predictions/all-goals'),
}

// Adaptive Learning API
export const adaptiveLearningApi = {
  getConcepts: (domain?: string) => api.get('/api/adaptive/concepts', { params: { domain } }),
  createConcept: (name: string, description?: string, domain?: string) =>
    api.post('/api/adaptive/concepts', { name, description, domain }),
  getGoalMastery: (goalId: number) => api.get(`/api/adaptive/mastery/goal/${goalId}`),
  getWeakConcepts: (threshold: number = 0.5) => api.get('/api/adaptive/mastery/weak', { params: { threshold } }),
  updateMastery: (conceptId: number, isCorrect: boolean) =>
    api.post('/api/adaptive/mastery/update', { concept_id: conceptId, is_correct: isCorrect }),
  getRecommendations: () => api.get('/api/adaptive/recommendations'),
  linkConceptToGoal: (goalId: number, conceptId: number, importance: number = 1.0) =>
    api.post('/api/adaptive/link-concept-to-goal', { goal_id: goalId, concept_id: conceptId, importance }),
  checkGoalReadiness: (goalId: number) => api.get(`/api/adaptive/goal-readiness/${goalId}`),
  getSuggestedDifficulty: (goalId: number) => api.get(`/api/adaptive/suggested-difficulty/${goalId}`),
}

export default api

