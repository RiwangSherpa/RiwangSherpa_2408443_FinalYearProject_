import { motion } from 'framer-motion'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description: string
}

export default function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="mx-auto mb-14 max-w-3xl text-center"
    >
      <p className="mb-3 text-sm font-semibold uppercase tracking-normal text-emerald-700 dark:text-emerald-300">
        {eyebrow}
      </p>
      <h2 className="font-heading text-3xl font-bold leading-tight tracking-normal text-neutral-950 dark:text-white sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-8 text-neutral-600 dark:text-neutral-300 sm:text-lg">
        {description}
      </p>
    </motion.div>
  )
}
