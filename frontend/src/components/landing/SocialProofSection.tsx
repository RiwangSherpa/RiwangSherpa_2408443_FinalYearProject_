import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import AnimatedCounter from './AnimatedCounter'
import SectionHeading from './SectionHeading'
import { metrics, proofChecks, testimonialCards } from './landingData'

export default function SocialProofSection() {
  return (
    <section id="proof" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Learning outcomes"
          title="Built to make progress visible"
          description="The landing metrics communicate the intended SaaS value proposition: more completed goals, stronger retention loops, better practice habits, and measurable learner confidence."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07, duration: 0.48 }}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/7"
            >
              <div className="font-heading text-4xl font-extrabold tracking-normal text-neutral-950 dark:text-white">
                <AnimatedCounter value={metric.value} suffix={metric.suffix} decimals={metric.value % 1 === 0 ? 0 : 1} />
              </div>
              <p className="mt-3 text-sm font-bold text-neutral-800 dark:text-neutral-100">{metric.label}</p>
              <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{metric.detail}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {testimonialCards.map((card, index) => {
            const ProofIcon = proofChecks[index]
            return (
              <motion.article
                key={card.name}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className="relative rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/7"
              >
                <div className="mb-5 flex items-center justify-between">
                  <Quote className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-200">
                    <ProofIcon className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-sm leading-7 text-neutral-700 dark:text-neutral-200">{card.quote}</p>
                <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-white/10">
                  <p className="font-heading text-sm font-bold tracking-normal text-neutral-950 dark:text-white">{card.name}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{card.role}</p>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
