import { Link } from 'react-router-dom'

// Import logo image - Vite will handle the asset bundling
// Logo should be at: frontend/src/assets/logo.png
// Using dynamic import to handle cases where logo might not exist
let logoSrc: string | null = null
try {
  // Try to import the logo - this will work if logo.png exists in assets/
  logoSrc = new URL('../assets/logo.png', import.meta.url).href
} catch (e) {
  // If import fails, try public folder path
  logoSrc = '/logo.png'
}

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }

  const hasLogoImage = logoSrc !== null 

  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      {hasLogoImage && logoSrc ? (
        <img
          src={logoSrc}
          alt="Study Buddy Logo"
          className={`${sizeClasses[size]} object-contain`}
        />
      ) : (
        <svg
          className={sizeClasses[size]}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Book/Brain Icon - Modern, minimal design */}
          <path
            d="M16 4C10 4 6 7 6 12V24C6 27 9 28 12 28H20C23 28 26 27 26 24V12C26 7 22 4 16 4Z"
            fill="url(#gradient1)"
            className="transition-all duration-300"
          />
          <path
            d="M12 10H20M12 14H20M12 18H16"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Spark/AI indicator */}
          <circle cx="24" cy="8" r="3" fill="#8B5CF6" />
          <path
            d="M23 8L24 7L25 8L24 9L23 8Z"
            stroke="white"
            strokeWidth="0.5"
            fill="white"
          />
          <defs>
            <linearGradient id="gradient1" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0284C7" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      )}
      {showText && (
        <span className={`font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${textSizes[size]}`}>
          Study Buddy
        </span>
      )}
    </Link>
  )
}

