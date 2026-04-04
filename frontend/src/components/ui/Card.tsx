import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { borderColor: '#064E3B' } : {}}
      className={`
        bg-white dark:bg-dark-bg-secondary border border-neutral-200 dark:border-dark-border-primary rounded-card p-6
        transition-colors duration-150
        ${hover ? 'hover:border-primary dark:hover:border-primary-dark cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

