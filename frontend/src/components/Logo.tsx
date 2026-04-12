import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Logo({ 
  className = '', 
  showText = true, 
  size = 'md' 
}: LogoProps) {
  const [logoSrc, setLogoSrc] = useState<string>('')

  useEffect(() => {
    import('../assets/logo.png').then(module => {
      setLogoSrc(module.default)
    }).catch(() => {
      console.warn('Failed to load logo image')
    })
  }, [])

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }

  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      {logoSrc ? (
        <img 
          src={logoSrc} 
          alt="Study Buddy Logo" 
          className={`${sizeClasses[size]} rounded-lg object-contain`}
        />
      ) : (
        <div className={`${sizeClasses[size]} bg-primary rounded-lg flex items-center justify-center`}>
          <span className="text-white font-bold text-xs font-heading">SB</span>
        </div>
      )}
      {showText && (
        <span className={`font-heading font-bold text-neutral-900 dark:text-dark-text-primary ${textSizeClasses[size]} transition-colors`}>
          Study Buddy
        </span>
      )}
    </Link>
  )
}

