/**
 * TypeScript type definitions
 */

export interface User {
  id: number
  email: string
  full_name?: string
  provider?: 'local' | 'google'
  avatar_url?: string
  subscription_plan?: string
  is_active?: boolean
}

export interface Goal {
  id: number
  title: string
  description?: string
  learning_style: 'visual' | 'text' | 'practice' | 'balanced'
  target_date?: string
  created_at: string
  updated_at: string
  is_completed: boolean
}

export interface RoadmapStep {
  id: number
  goal_id: number
  step_number: number
  title: string
  description: string
  estimated_hours: number
  is_completed: boolean
  completed_at?: string
  ai_explanation?: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation?: string
}

export interface QuizResult {
  score: number
  correct_answers: number
  total_questions: number
  feedback: Array<{
    question_index: number
    is_correct: boolean
    selected_answer: number
    correct_answer: number
    explanation?: string
  }>
}

export interface Progress {
  id: number
  goal_id: number
  date: string
  time_spent_minutes: number
  steps_completed: number
  notes?: string
}

export interface ProductivitySession {
  id: number
  session_type: 'pomodoro' | 'break' | 'focus'
  duration_minutes: number
  started_at: string
  completed_at?: string
  was_completed: boolean
}

export interface Analytics {
  total_study_time_minutes: number
  total_goals: number
  completed_goals: number
  current_streak_days: number
  average_quiz_score: number
  weak_topics: string[]
  strong_topics: string[]
}

export interface User {
  id: number
  email: string
  full_name?: string
  provider?: 'local' | 'google'
  avatar_url?: string
  subscription_plan?: string | 'free' | 'pro'
  is_active?: boolean
  subscription_expires_at?: string
  created_at?: string
}

export interface SubscriptionStatus {
  plan: 'free' | 'pro'
  is_active: boolean
  expires_at?: string
}

// Analytics Types
export interface StudyTimeData {
  date: string
  minutes: number
}

export interface StreakData {
  current_streak: number
  longest_streak: number
}

export interface GoalProgressData {
  goal_id: number
  title: string
  description?: string
  learning_style?: string
  completion_percentage: number
  is_completed: boolean
  status: string
  target_date?: string
}

export interface RoadmapProgressData {
  total_steps: number
  completed_steps: number
  estimated_hours: number
  actual_study_hours: number
  completion_percentage: number
  steps_timeline: Array<{
    step_number: number
    title: string
    is_completed: boolean
    completed_at?: string
    estimated_hours: number
  }>
}

export interface QuizAnalyticsData {
  total_quizzes: number
  average_score: number
  best_score: number
  worst_score: number
  score_history: Array<{
    date: string
    score: number
    topic: string
  }>
  topic_performance: Array<{
    topic: string
    average_score: number
    quiz_count: number
  }>
}

export interface StrengthsWeaknessesData {
  strong_topics: Array<{
    topic: string
    average_score: number
    quiz_count: number
  }>
  weak_topics: Array<{
    topic: string
    average_score: number
    quiz_count: number
  }>
  suggestions: string[]
}

export interface OverviewAnalytics {
  total_study_time_hours: number
  study_time_last_7_days: StudyTimeData[]
  study_time_last_30_days: StudyTimeData[]
  streak_data: StreakData
  completed_roadmap_steps: number
  active_goal_progress: GoalProgressData | null
}

export interface CurrentGoalAnalytics {
  goal: GoalProgressData
  roadmap_progress: RoadmapProgressData
}

export interface QuizAnalytics {
  analytics: QuizAnalyticsData
  strengths_weaknesses: StrengthsWeaknessesData
}

export interface UserSettings {
  theme_preference: string
  full_name?: string
  subscription_plan: string
}
