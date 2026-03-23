'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Logo from './Logo'
import { createClient } from '@/lib/supabase/client'

const AVATAR_EMOJI: Record<string, string> = {
  fuchs: '🦊', koala: '🐨', loewe: '🦁', frosch: '🐸',
  adler: '🦅', delfin: '🐬', schmetterling: '🦋', wolf: '🐺',
}

export default function Header({
  userName,
  userAvatar,
}: {
  userName?: string
  userAvatar?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const nav = [
    { href: '/', label: 'Übersicht' },
    { href: '/add', label: 'Karte hinzufügen' },
    { href: '/stats', label: 'Statistik' },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const emoji = userAvatar ? AVATAR_EMOJI[userAvatar] : null

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
              </Link>
            )
          })}
          <div className="flex items-center gap-2 ml-2">
            {emoji && (
              <span className="text-xl leading-none" title={userName}>
                {emoji}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abmelden
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
