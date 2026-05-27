import { motion } from 'framer-motion'
import { ArrowRight, PlayCircle, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import HeroDashboardMockup from './HeroDashboardMockup'
import { trustedSignals } from './landingData'

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.24),transparent_38%),linear-gradient(120deg,rgba(79,70,229,0.12),transparent_34%),linear-gradient(240deg,rgba(245,158,11,0.14),transparent_36%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.18),transparent_40%),linear-gradient(120deg,rgba(99,102,241,0.16),transparent_36%),linear-gradient(240deg,rgba(245,158,11,0.09),transparent_36%)]" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(6,78,59,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(6,78,59,0.08)_1px,transparent_1px)] bg-[size:46px_46px] opacity-60 dark:bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)]" aria-hidden="true" />
      <motion.div
        animate={{ opacity: [0.42, 0.75, 0.42], x: ['-8%', '8%', '-8%'] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-0 right-0 top-20 -z-10 h-48 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.72),transparent)] blur-2xl dark:bg-[linear-gradient(90deg,transparent,rgba(52,211,153,0.18),transparent)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="mx-auto max-w-5xl text-center"
        >
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm backdrop-blur-xl dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              <Sparkles className="h-4 w-4" />
              AI-powered adaptive learning system
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/72 px-4 py-2 text-sm font-semibold text-neutral-600 backdrop-blur-xl dark:border-white/10 dark:bg-white/8 dark:text-neutral-300">
              <Star className="h-4 w-4 text-amber-500" />
              Built for goals, mastery, and measurable progress
            </span>
          </div>

          <h1 className="font-heading text-4xl font-extrabold leading-[1.04] tracking-normal text-neutral-950 dark:text-white sm:text-6xl lg:text-7xl">
            Your personal AI learning operating system
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-neutral-700 dark:text-neutral-300 sm:text-xl">
            Transform any learning goal into an adaptive workflow with AI roadmaps, tutor conversations, smart quizzes, notes, flashcards, mindmaps, document chat, analytics, streaks, and recommendations.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="group inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-neutral-950 px-7 py-3 text-base font-bold text-white shadow-xl shadow-emerald-950/18 transition hover:-translate-y-0.5 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-white dark:text-neutral-950 dark:hover:bg-emerald-100 sm:w-auto"
            >
              Start building mastery
              <ArrowRight className="ml-2 h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <a
              href="#workflow"
              className="inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-full border border-neutral-300 bg-white/78 px-7 py-3 text-base font-bold text-neutral-800 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/12 dark:bg-white/8 dark:text-white dark:hover:bg-white/12 sm:w-auto"
            >
              <PlayCircle className="mr-2 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              Explore workflow
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {trustedSignals.map((signal) => (
              <span
                key={signal}
                className="rounded-full border border-neutral-200 bg-white/70 px-3.5 py-2 text-xs font-bold text-neutral-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/7 dark:text-neutral-300"
              >
                {signal}
              </span>
            ))}
          </div>
        </motion.div>

        <HeroDashboardMockup />
      </div>
    </section>
  )
}
