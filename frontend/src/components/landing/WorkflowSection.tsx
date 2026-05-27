import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import SectionHeading from './SectionHeading'
import { workflowSteps } from './landingData'

export default function WorkflowSection() {
  return (
    <section id="workflow" className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent dark:via-emerald-500/40" aria-hidden="true" />
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Learning workflow"
          title="From goal to mastery in one connected system"
          description="Study Buddy turns self-directed learning into a guided loop: goal, roadmap, study, quiz, reinforcement, tutor support, analytics, and adaptive improvement."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: index * 0.06, duration: 0.5, ease: 'easeOut' }}
                whileHover={{ y: -6 }}
                className="group relative min-h-[17rem] overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/8 dark:border-white/10 dark:bg-white/7 dark:hover:border-emerald-400/35"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(16,185,129,0.14),transparent_36%),radial-gradient(circle_at_100%_100%,rgba(79,70,229,0.12),transparent_36%)] opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                <div className="relative">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold uppercase tracking-normal text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
                      {String(index + 1).padStart(2, '0')} {step.eyebrow}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-400/12 dark:text-emerald-200">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold tracking-normal text-neutral-950 dark:text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-600 dark:text-neutral-300">{step.description}</p>
                  <div className="mt-6 flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700 dark:border-white/10 dark:bg-white/8 dark:text-neutral-200">
                    <span>{step.signal}</span>
                    <ArrowRight className="h-4 w-4 text-emerald-600 transition group-hover:translate-x-1 dark:text-emerald-300" />
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
