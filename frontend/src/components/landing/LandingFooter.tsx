import { Link } from 'react-router-dom'
import Logo from '../Logo'

export default function LandingFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-950 px-4 py-10 text-neutral-300 dark:border-white/10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo showText size="md" tone="inverse" to="/landing" />
          <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-400">
            Study Buddy is an AI-enhanced learning ecosystem for roadmaps, tutoring, quizzes, notes, documents, analytics, and mastery workflows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link to="/login" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
            Sign in
          </Link>
          <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-neutral-950 transition hover:bg-emerald-100">
            Get started
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-6 text-sm text-neutral-500">
        &copy; 2026 Study Buddy. Full-stack AI learning platform.
      </div>
    </footer>
  )
}
