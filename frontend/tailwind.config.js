/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#064E3B',
          light:   '#065F46',
          muted:   '#D1FAE5',
          dark:    '#10B981', // Dark mode primary
        },
        secondary: {
          DEFAULT: '#4F46E5',
          light:   '#EEF2FF',
          muted:   '#C7D2FE',
          dark:    '#6366F1', // Dark mode secondary
        },
        tertiary: {
          DEFAULT: '#F59E0B',
          light:   '#FEF3C7',
          muted:   '#FDE68A',
          dark:    '#F59E0B', // Same tertiary works in both modes
        },
        neutral: {
          50:  '#FAFAF8',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712', // Extra dark for backgrounds
        },
        // Dark mode specific colors
        dark: {
          bg: {
            primary: '#030712',   // Main background
            secondary: '#111827',  // Card backgrounds
            tertiary: '#1F2937',   // Elevated surfaces
          },
          text: {
            primary: '#F9FAFB',    // Main text
            secondary: '#D1D5DB',  // Secondary text
            tertiary: '#9CA3AF',   // Muted text
            inverse: '#111827',    // Text on light backgrounds
          },
          border: {
            primary: '#374151',    // Main borders
            secondary: '#4B5563',  // Subtle borders
            tertiary: '#6B7280',   // Very subtle borders
          },
          hover: {
            primary: '#1F2937',    // Hover state for primary
            secondary: '#374151',  // Hover state for secondary
          },
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        pill: '9999px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

