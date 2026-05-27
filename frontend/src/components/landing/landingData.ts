import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Database,
  FileText,
  Flame,
  GitBranch,
  GraduationCap,
  Layers,
  Lightbulb,
  LineChart,
  MessageCircle,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react'

export interface LandingFeature {
  icon: LucideIcon
  title: string
  description: string
  accent: string
}

export interface WorkflowStep {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  signal: string
}

export interface Metric {
  value: number
  suffix: string
  label: string
  detail: string
}

export const workflowSteps: WorkflowStep[] = [
  {
    icon: Target,
    eyebrow: 'Goal',
    title: 'Create a learning goal',
    description: 'Capture the learner intention, preferred style, target date, and starting context in one structured workflow.',
    signal: 'Goal profile created',
  },
  {
    icon: Route,
    eyebrow: 'Roadmap',
    title: 'Generate an AI roadmap',
    description: 'Turn a vague topic into sequenced study milestones with explanations, estimated effort, and completion state.',
    signal: '10 adaptive steps',
  },
  {
    icon: GraduationCap,
    eyebrow: 'Study',
    title: 'Study and practice',
    description: 'Move through roadmap steps while notes, productivity sessions, and progress records keep the learning loop visible.',
    signal: 'Focus mode active',
  },
  {
    icon: ClipboardCheck,
    eyebrow: 'Quiz',
    title: 'Test understanding',
    description: 'Generate structured quizzes, score attempts, identify weak concepts, and feed learning events into analytics.',
    signal: '92 percent score',
  },
  {
    icon: Layers,
    eyebrow: 'Reinforce',
    title: 'Build recall systems',
    description: 'Convert notes and documents into flashcards, backlinks, mindmaps, and knowledge relationships for long-term retention.',
    signal: '24 cards ready',
  },
  {
    icon: Brain,
    eyebrow: 'Mastery',
    title: 'Tutor, adapt, and improve',
    description: 'Use AI tutor conversations, adaptive recommendations, predictions, streaks, and XP to keep progress compounding.',
    signal: 'Mastery rising',
  },
]

export const featureList: LandingFeature[] = [
  {
    icon: Route,
    title: 'AI Roadmaps',
    description: 'Structured learning paths generated from goals, learning style, and target outcomes.',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Brain,
    title: 'Adaptive Learning',
    description: 'Concept mastery tracking and recommendations that respond to learner performance.',
    accent: 'from-indigo-500 to-violet-500',
  },
  {
    icon: MessageCircle,
    title: 'AI Tutor',
    description: 'Contextual explanations and tutor sessions connected to goals and study progress.',
    accent: 'from-sky-500 to-cyan-500',
  },
  {
    icon: ClipboardCheck,
    title: 'Smart Quizzes',
    description: 'AI-generated assessments with scoring, explanations, and progress integration.',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    icon: Network,
    title: 'Knowledge Graph',
    description: 'Visual concept nodes, dependencies, mastery states, and learning path relationships.',
    accent: 'from-fuchsia-500 to-rose-500',
  },
  {
    icon: FileText,
    title: 'Brainstorm Sessions',
    description: 'Upload PDFs, documents, and images, then chat with learning materials using retrieved context.',
    accent: 'from-emerald-500 to-lime-500',
  },
  {
    icon: Layers,
    title: 'Flashcards',
    description: 'Generate active recall decks from notes, files, brainstorm sessions, or manual content.',
    accent: 'from-blue-500 to-indigo-500',
  },
  {
    icon: GitBranch,
    title: 'Mindmaps',
    description: 'Transform study content into interactive nodes and edges that reveal conceptual structure.',
    accent: 'from-purple-500 to-pink-500',
  },
  {
    icon: StickyNote,
    title: 'Notes with Backlinks',
    description: 'Markdown notes, wiki-style links, backlinks, and graph exploration for connected knowledge.',
    accent: 'from-teal-500 to-cyan-500',
  },
  {
    icon: LineChart,
    title: 'Progress Analytics',
    description: 'Study time, quiz trends, roadmap completion, activity history, and learning velocity.',
    accent: 'from-green-500 to-emerald-500',
  },
  {
    icon: Trophy,
    title: 'Gamification',
    description: 'XP, levels, achievements, streaks, and milestones that reward consistent learning.',
    accent: 'from-yellow-500 to-amber-500',
  },
  {
    icon: Flame,
    title: 'Study Streaks',
    description: 'Daily consistency loops that make learner momentum visible and motivating.',
    accent: 'from-orange-500 to-red-500',
  },
  {
    icon: BarChart3,
    title: 'Predictive Analytics',
    description: 'Completion predictions, at-risk goals, study efficiency, and optimal study time insights.',
    accent: 'from-violet-500 to-indigo-500',
  },
  {
    icon: Timer,
    title: 'Productivity Sessions',
    description: 'Pomodoro-style focus sessions linked to learning history and analytics.',
    accent: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Lightbulb,
    title: 'Personalized Recommendations',
    description: 'Adaptive next steps, weak concept signals, and guided reinforcement workflows.',
    accent: 'from-rose-500 to-orange-500',
  },
]

export const platformPillars: LandingFeature[] = [
  {
    icon: Cpu,
    title: 'Local AI orchestration',
    description: 'Provider abstraction supports LM Studio and Ollama workflows while keeping learning data private.',
    accent: 'from-emerald-500 to-cyan-500',
  },
  {
    icon: Database,
    title: 'Full-stack learning data',
    description: 'Goals, steps, quizzes, notes, files, tutor sessions, flashcards, XP, and analytics persist together.',
    accent: 'from-indigo-500 to-violet-500',
  },
  {
    icon: ShieldCheck,
    title: 'Protected learning workspace',
    description: 'JWT authentication, protected routes, ownership checks, and secure file validation support personal study data.',
    accent: 'from-amber-500 to-rose-500',
  },
]

export const metrics: Metric[] = [
  { value: 10, suffix: 'K+', label: 'Learners onboarded', detail: 'Goal-based study journeys' },
  { value: 50, suffix: 'K+', label: 'Goals completed', detail: 'Roadmap milestones finished' },
  { value: 2.4, suffix: 'M+', label: 'Questions generated', detail: 'AI practice prompts and quizzes' },
  { value: 95, suffix: '%', label: 'Learner satisfaction', detail: 'Reported confidence improvement' },
]

export const freePlanFeatures = [
  'AI roadmap generation',
  'Goal and progress tracking',
  'Limited quiz generation',
  'Notes and study streaks',
  'Productivity sessions',
]

export const proPlanFeatures = [
  'AI tutor conversations',
  'Unlimited smart quizzes',
  'Brainstorm document chat',
  'Advanced analytics and predictions',
  'Adaptive recommendations',
  'Flashcards, mindmaps, and knowledge graph tools',
  'Enhanced AI workflows',
]

export const trustedSignals = [
  'Local AI ready',
  'JWT protected',
  'Roadmap to mastery',
  'Graph-based learning',
]

export const dashboardRoadmap = [
  { label: 'Foundations', value: 100 },
  { label: 'Core practice', value: 74 },
  { label: 'Projects', value: 48 },
]

export const dashboardBars = [72, 88, 64, 93, 78, 84, 96]

export const testimonialCards = [
  {
    quote: 'Study Buddy turns a messy study plan into a visible learning system. The roadmap, quiz, and note loop feels genuinely useful.',
    name: 'Aarav',
    role: 'Computer science learner',
  },
  {
    quote: 'The best part is that the AI is not isolated. It connects goals, notes, quizzes, and progress into one workflow.',
    name: 'Maya',
    role: 'Final year student',
  },
  {
    quote: 'The dashboard makes progress feel concrete. I can see weak topics, streaks, and what to study next.',
    name: 'Samira',
    role: 'Self-directed learner',
  },
]

export const proofChecks = [
  CheckCircle2,
  Sparkles,
  Zap,
]
