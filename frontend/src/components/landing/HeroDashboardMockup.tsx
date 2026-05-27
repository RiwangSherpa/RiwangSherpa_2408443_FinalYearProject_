import { motion } from 'framer-motion'
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Flame,
  GitBranch,
  MessageCircle,
  Network,
  Route,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import { dashboardBars, dashboardRoadmap } from './landingData'

const graphNodes = [
  { label: 'Goal', x: '16%', y: '52%', tone: 'bg-emerald-500' },
  { label: 'Roadmap', x: '40%', y: '24%', tone: 'bg-indigo-500' },
  { label: 'Quiz', x: '68%', y: '38%', tone: 'bg-amber-500' },
  { label: 'Tutor', x: '54%', y: '70%', tone: 'bg-sky-500' },
  { label: 'Mastery', x: '82%', y: '68%', tone: 'bg-rose-500' },
]

export default function HeroDashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.75, ease: 'easeOut' }}
      className="relative mx-auto mt-12 w-full max-w-6xl"
      aria-label="Study Buddy product dashboard preview"
    >
      <div className="absolute -inset-4 rounded-[2rem] bg-[linear-gradient(110deg,rgba(16,185,129,0.28),rgba(79,70,229,0.2),rgba(245,158,11,0.16))] blur-2xl" aria-hidden="true" />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/86 p-3 shadow-2xl shadow-emerald-950/15 backdrop-blur-xl dark:border-white/12 dark:bg-slate-950/82 dark:shadow-black/35">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,78,59,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(6,78,59,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-45 dark:bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)]" aria-hidden="true" />

        <div className="relative rounded-[1.35rem] border border-neutral-200/80 bg-[#F8FBF7]/95 p-4 dark:border-white/10 dark:bg-slate-900/95 sm:p-5 lg:p-6">
          <div className="mb-5 flex flex-col gap-4 border-b border-neutral-200 pb-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-400/12 dark:text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI mastery workspace
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200 dark:bg-white/8 dark:text-neutral-300 dark:ring-white/10">
                  Local AI provider active
                </span>
              </div>
              <h3 className="mt-3 font-heading text-xl font-bold tracking-normal text-neutral-950 dark:text-white sm:text-2xl">
                Machine Learning Goal
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['14', 'day streak'],
                ['2,840', 'XP'],
                ['87%', 'mastery'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/7">
                  <div className="text-lg font-bold text-neutral-950 dark:text-white">{value}</div>
                  <div className="text-[0.68rem] font-semibold uppercase tracking-normal text-neutral-500 dark:text-neutral-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/7">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-200">
                        <Route className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-neutral-950 dark:text-white">AI Roadmap</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Generated sequence</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="space-y-4">
                    {dashboardRoadmap.map((item) => (
                      <div key={item.label}>
                        <div className="mb-2 flex justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                          <span>{item.label}</span>
                          <span>{item.value}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${item.value}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/7">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-400/12 dark:text-indigo-200">
                        <BarChart3 className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-neutral-950 dark:text-white">Quiz intelligence</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Performance trend</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-400/12 dark:text-amber-200">+18%</span>
                  </div>
                  <div className="flex h-32 items-end gap-2">
                    {dashboardBars.map((height, index) => (
                      <motion.div
                        key={`${height}-${index}`}
                        initial={{ height: '18%' }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05, duration: 0.7, ease: 'easeOut' }}
                        className="flex-1 rounded-t-xl bg-gradient-to-t from-indigo-600 to-cyan-400"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/7">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-400/12 dark:text-sky-200">
                      <MessageCircle className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-neutral-950 dark:text-white">AI Tutor</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Context-aware help</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="rounded-2xl bg-neutral-100 p-3 text-neutral-700 dark:bg-white/10 dark:text-neutral-200">
                      Explain gradient descent from my roadmap step.
                    </div>
                    <div className="rounded-2xl bg-emerald-700 p-3 text-white shadow-lg shadow-emerald-900/15">
                      Think of it as repeatedly adjusting weights toward lower error, then testing with quizzes.
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/7">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-400/12 dark:text-rose-200">
                        <Network className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-neutral-950 dark:text-white">Knowledge graph</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Concept relationships</p>
                      </div>
                    </div>
                    <GitBranch className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div className="relative h-40 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_58%)] dark:bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.16),transparent_58%)]">
                    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                      <line x1="16%" y1="52%" x2="40%" y2="24%" stroke="currentColor" className="text-emerald-300/80 dark:text-emerald-400/40" strokeWidth="2" />
                      <line x1="40%" y1="24%" x2="68%" y2="38%" stroke="currentColor" className="text-indigo-300/80 dark:text-indigo-400/40" strokeWidth="2" />
                      <line x1="68%" y1="38%" x2="82%" y2="68%" stroke="currentColor" className="text-amber-300/80 dark:text-amber-400/40" strokeWidth="2" />
                      <line x1="40%" y1="24%" x2="54%" y2="70%" stroke="currentColor" className="text-sky-300/80 dark:text-sky-400/40" strokeWidth="2" />
                      <line x1="54%" y1="70%" x2="82%" y2="68%" stroke="currentColor" className="text-rose-300/80 dark:text-rose-400/40" strokeWidth="2" />
                    </svg>
                    {graphNodes.map((node) => (
                      <motion.div
                        key={node.label}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: node.x, top: node.y }}
                      >
                        <span className={`block h-4 w-4 rounded-full ${node.tone} shadow-lg ring-4 ring-white dark:ring-slate-900`} />
                        <span className="mt-1 block whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[0.62rem] font-bold text-neutral-600 shadow-sm ring-1 ring-neutral-200 dark:bg-slate-950/90 dark:text-neutral-200 dark:ring-white/10">
                          {node.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/7">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-400/12 dark:text-amber-200">
                      <Trophy className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-neutral-950 dark:text-white">Gamified progress</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Streaks, XP, achievements</p>
                    </div>
                  </div>
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Level 12', 'Scholar path'],
                    ['8 badges', 'Unlocked'],
                    ['14 days', 'Current streak'],
                    ['3 weak', 'Concepts to review'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200 dark:bg-white/8 dark:ring-white/10">
                      <p className="text-lg font-bold text-neutral-950 dark:text-white">{value}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-neutral-950 p-5 text-white shadow-sm dark:border-white/10 dark:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white dark:text-neutral-950">Adaptive recommendation</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300 dark:text-neutral-600">
                      Review probability, decision trees, and model evaluation before the next quiz.
                    </p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-neutral-950">
                    <Brain className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {['Flashcards', 'Tutor', 'Mindmap'].map((item) => (
                    <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15 dark:bg-neutral-950/8 dark:text-neutral-700 dark:ring-neutral-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-2 top-16 hidden rounded-2xl border border-white/70 bg-white/88 p-4 shadow-xl shadow-emerald-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/88 lg:block"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-200">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-neutral-950 dark:text-white">Roadmap regenerated</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Weak concept detected</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-1 bottom-20 hidden rounded-2xl border border-white/70 bg-white/88 p-4 shadow-xl shadow-indigo-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/88 lg:block"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-400/12 dark:text-indigo-200">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-neutral-950 dark:text-white">24 flashcards created</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">From brainstorm notes</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
