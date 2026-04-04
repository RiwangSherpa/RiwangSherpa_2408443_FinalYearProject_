import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

export default function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variants = {
    default: 'bg-neutral-100 dark:bg-dark-bg-tertiary text-neutral-600 dark:text-dark-text-secondary',
    success: 'bg-primary-muted dark:bg-primary/20 text-primary dark:text-primary-dark',
    warning: 'bg-tertiary-light dark:bg-tertiary/20 text-amber-700 dark:text-amber-400',
    error: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    info: 'bg-secondary-light dark:bg-secondary/20 text-secondary dark:text-secondary-dark'
  }

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  }

  return (
    <span className={`inline-flex items-center rounded-pill font-semibold transition-colors duration-300 ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}

