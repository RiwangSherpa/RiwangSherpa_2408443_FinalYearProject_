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
  total_quizzes: number
  best_quiz_score: number
  weak_topics: string[]
  strong_topics: string[]
  quiz_stats?: {
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

export interface ActivityData {
  id: string
  type: 'goal_completed' | 'goal_created' | 'goal_progress' | 'quiz_attempt' | 'level_up' | 'study_session'
  title: string
  description: string
  timestamp: string
  goal_title?: string
  metadata?: Record<string, any>
}

export interface Note {
  id: number
  user_id: number
  goal_id?: number
  title: string
  content: string
  tags: string[]
  is_auto_generated: boolean
  source_type?: string
  source_id?: number
  created_at: string
  updated_at: string
  outgoing_links?: Note[]
  incoming_links?: Note[]
}

export interface NoteGraph {
  nodes: Array<{
    id: number
    title: string
    tag_count: number
  }>
  edges: Array<{
    source: number
    target: number
  }>
}

export interface BacklinkInfo {
  id: number
  title: string
  preview: string
}

export interface BrainstormSession {
  id: number
  user_id: number
  title: string
  created_at: string
  updated_at: string
  message_count: number
  file_count: number
}

export interface BrainstormMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export interface BrainstormFile {
  id: number
  session_id: number
  user_id: number
  original_filename: string
  stored_filename: string
  file_type: 'pdf' | 'png' | 'jpg' | 'jpeg' | 'webp' | 'txt' | 'md' | 'docx'
  mime_type: string
  file_size: number
  upload_status: 'processing' | 'ready' | 'failed'
  created_at: string
  extracted_text_preview?: string
  chunk_count: number
  preview_url?: string
}

export interface BrainstormChatResponse {
  success: boolean
  session_id: number
  user_message: BrainstormMessage
  ai_response: BrainstormMessage
}

export interface UploadResponse {
  success: boolean
  files: BrainstormFile[]
}

export type ArtifactSourceType = 'note' | 'brainstorm_session' | 'brainstorm_file' | 'manual'

export interface MindmapNode {
  id: string
  title: string
  description?: string
  category?: string
  level: number
  color?: string
}

export interface MindmapEdge {
  id?: string
  source: string
  target: string
  label?: string
  relation?: string
}

export interface Mindmap {
  id: number
  user_id: number
  title: string
  source_type?: ArtifactSourceType
  source_id?: number
  graph_data: {
    nodes: MindmapNode[]
    edges: MindmapEdge[]
  }
  summary?: string
  created_at: string
  updated_at: string
}

export interface Flashcard {
  id: number
  deck_id: number
  front: string
  back: string
  card_type: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  position: number
  review_state: 'new' | 'again' | 'difficult' | 'known'
  ease_factor: number
  interval_days: number
  due_at?: string
  last_reviewed_at?: string
  created_at: string
  updated_at: string
}

export interface FlashcardDeck {
  id: number
  user_id: number
  title: string
  description?: string
  source_type?: ArtifactSourceType
  source_id?: number
  review_count: number
  created_at: string
  updated_at: string
  card_count: number
  cards?: Flashcard[]
}
