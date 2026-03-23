'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Logo from './Logo'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const nav = [
    { href: '/', label: 'Dashboard', de: 'Übersicht' },
    { href: '/add', label: 'Add card', de: 'Karte hinzufügen' },
    { href: '/stats', label: 'Stats', de: 'Statistik' },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-[#378ADD]/10 text-[#378ADD] font-medium'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.label}
                <span className="hidden sm:inline text-gray-400 ml-1 font-normal">
                  / {item.de}
                </span>
              </Link>
            )
          })}
          <button
            onClick={handleSignOut}
            className="ml-2 px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  )
}
