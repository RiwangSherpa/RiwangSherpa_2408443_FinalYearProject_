import { motion } from 'framer-motion'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import SectionHeading from './SectionHeading'
import { freePlanFeatures, proPlanFeatures } from './landingData'

export default function PricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden bg-white px-4 py-20 transition-colors dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.14),transparent_38%),linear-gradient(120deg,rgba(79,70,229,0.1),transparent_34%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.12),transparent_40%),linear-gradient(120deg,rgba(99,102,241,0.12),transparent_35%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free, upgrade into the full AI study operating system"
          description="The pricing story reinforces the product architecture: a capable free learning workspace and a Pro tier for advanced AI tutoring, analytics, document chat, and adaptive workflows."
        />

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.article
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/7"
          >
            <p className="text-sm font-bold uppercase tracking-normal text-neutral-500 dark:text-neutral-400">Free</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-heading text-5xl font-extrabold tracking-normal text-neutral-950 dark:text-white">Rs. 0</span>
              <span className="pb-2 text-neutral-500 dark:text-neutral-400">/month</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
              A strong starting workspace for goal-based study planning, progress visibility, and core AI assistance.
            </p>
            <ul className="mt-7 space-y-3">
              {freePlanFeatures.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm text-neutral-700 dark:text-neutral-200">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="mt-8 inline-flex min-h-[3rem] w-full items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-900 transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/12 dark:text-white dark:hover:bg-white/10"
            >
              Create free account
            </Link>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="relative overflow-hidden rounded-3xl border border-emerald-300 bg-neutral-950 p-[1px] shadow-2xl shadow-emerald-950/20 dark:border-emerald-400/40"
          >
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.38),rgba(79,70,229,0.26),rgba(245,158,11,0.2))]" aria-hidden="true" />
            <div className="relative h-full rounded-3xl bg-neutral-950 p-7 text-white">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold uppercase tracking-normal text-emerald-200">Pro</p>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-white/15">
                  <Sparkles className="h-3.5 w-3.5" />
                  Most powerful
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-heading text-5xl font-extrabold tracking-normal text-white">Rs. 999</span>
                <span className="pb-2 text-neutral-300">/month</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-neutral-300">
                Unlock the full adaptive learning engine: tutor context, document intelligence, advanced analytics, and reinforcement tools.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {proPlanFeatures.map((feature) => (
                  <div key={feature} className="flex gap-3 rounded-2xl bg-white/8 p-3 text-sm text-neutral-100 ring-1 ring-white/10">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/subscription"
                className="mt-8 inline-flex min-h-[3rem] w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-neutral-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                Upgrade to Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  )
}
