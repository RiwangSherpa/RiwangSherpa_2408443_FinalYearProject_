import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../Logo'

const navItems = [
  { label: 'Workflow', href: '#workflow' },
  { label: 'Features', href: '#features' },
  { label: 'Proof', href: '#proof' },
  { label: 'Pricing', href: '#pricing' },
]

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/78 shadow-sm shadow-emerald-950/5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-slate-950/72 dark:shadow-black/20">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Primary">
        <Logo size="lg" animated to="/landing" />

        <div className="hidden items-center gap-1 rounded-full border border-neutral-200/80 bg-white/72 p-1 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-neutral-200 dark:hover:bg-white/10"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-white dark:text-neutral-950 dark:hover:bg-emerald-100"
          >
            Get started free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-white/10 dark:text-white sm:hidden"
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-neutral-200 bg-white/96 px-4 py-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/96 sm:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-emerald-50 dark:text-neutral-200 dark:hover:bg-white/10"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link
                to="/login"
                className="rounded-xl border border-neutral-200 px-4 py-3 text-center text-sm font-semibold text-neutral-800 dark:border-white/10 dark:text-white"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
