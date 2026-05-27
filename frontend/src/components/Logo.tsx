import { Link } from 'react-router-dom'
import owlLogo from '../assets/brand/studybuddy-owl-logo.png'

export const BRAND = {
  name: 'Study Buddy',
  compactName: 'StudyBuddy',
  logoSrc: owlLogo,
}

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'default' | 'inverse'
  to?: string
  animated?: boolean
  textClassName?: string
}

export default function Logo({ 
  className = '', 
  showText = true, 
  size = 'md',
  tone = 'default',
  to = '/',
  animated = false,
  textClassName = '',
}: LogoProps) {
  const sizeClasses = {
    sm: {
      mark: 'w-8 h-8',
      image: 'w-7 h-7',
      text: 'text-lg',
      gap: 'gap-2',
    },
    md: {
      mark: 'w-10 h-10',
      image: 'w-9 h-9',
      text: 'text-xl',
      gap: 'gap-2.5',
    },
    lg: {
      mark: 'w-11 h-11',
      image: 'w-10 h-10',
      text: 'text-xl',
      gap: 'gap-3',
    },
    xl: {
      mark: 'w-20 h-20',
      image: 'w-[4.6rem] h-[4.6rem]',
      text: 'text-3xl',
      gap: 'gap-4',
    },
  }

  const currentSize = sizeClasses[size]
  const textTone =
    tone === 'inverse'
      ? 'text-white'
      : 'text-neutral-900 dark:text-dark-text-primary'
  const motionClass = animated ? 'transition-transform duration-200 hover:scale-[1.03]' : 'transition-colors'

  return (
    <Link
      to={to}
      aria-label={BRAND.name}
      className={`inline-flex items-center ${currentSize.gap} leading-none ${motionClass} ${className}`}
    >
      <span
        className={`${currentSize.mark} shrink-0 rounded-xl bg-white/95 dark:bg-white shadow-sm ring-1 ring-neutral-200/80 dark:ring-white/10 flex items-center justify-center overflow-hidden`}
      >
        <img
          src={BRAND.logoSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={`${currentSize.image} object-contain select-none`}
        />
      </span>
      {showText && (
        <span className={`font-heading font-bold ${currentSize.text} ${textTone} tracking-normal whitespace-nowrap ${textClassName}`}>
          {BRAND.name}
        </span>
      )}
    </Link>
  )
}

