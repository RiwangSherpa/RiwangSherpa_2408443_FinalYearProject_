import { motion } from 'framer-motion'
import SectionHeading from './SectionHeading'
import { featureList, platformPillars } from './landingData'

export default function FeatureEcosystem() {
  return (
    <section id="features" className="relative overflow-hidden bg-white px-4 py-20 transition-colors dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,78,59,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(6,78,59,0.055)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Platform depth"
          title="A complete AI learning ecosystem, not a chatbot wrapper"
          description="Every feature feeds the next: AI planning, practice, tutor context, notes, graph systems, analytics, and reinforcement work together as one learning operating system."
        />

        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          {platformPillars.map((pillar, index) => {
            const Icon = pillar.icon
            return (
              <motion.article
                key={pillar.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className="rounded-3xl border border-neutral-200 bg-white/88 p-6 shadow-lg shadow-neutral-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/7"
              >
                <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${pillar.accent} text-white shadow-lg`}>
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="font-heading text-xl font-bold tracking-normal text-neutral-950 dark:text-white">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-7 text-neutral-600 dark:text-neutral-300">{pillar.description}</p>
              </motion.article>
            )
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureList.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: (index % 5) * 0.035, duration: 0.45 }}
                whileHover={{ y: -5, scale: 1.01 }}
                className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/8 dark:border-white/10 dark:bg-slate-900/88 dark:hover:border-emerald-400/35"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feature.accent}`} aria-hidden="true" />
                <div className="flex items-start gap-4">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white shadow-md transition group-hover:scale-105`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-heading text-base font-bold tracking-normal text-neutral-950 dark:text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{feature.description}</p>
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
