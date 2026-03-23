import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

interface Deck { id: string; name: string; created_at: string }
interface Review { card_id: string; due_date: string; repetitions: number; interval: number; last_reviewed: string | null }

const AVATAR_EMOJI: Record<string, string> = {
  fuchs: '🦊', koala: '🐨', loewe: '🦁', frosch: '🐸',
  adler: '🦅', delfin: '🐬', schmetterling: '🦋', wolf: '🐺',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = user.user_metadata?.name as string | undefined
  const avatar = user.user_metadata?.avatar as string | undefined

  const [{ data: decks }, { data: cards }, { data: reviews }] = await Promise.all([
    supabase.from('decks').select('*').order('created_at', { ascending: false }),
    supabase.from('cards').select('id, deck_id'),
    supabase.from('reviews').select('card_id, due_date, repetitions, interval, last_reviewed'),
  ])

  const today = new Date().toISOString().split('T')[0]
  const totalCards = cards?.length ?? 0

  const reviewMap = new Map<string, Review>()
  reviews?.forEach((r) => reviewMap.set(r.card_id, r))

  const dueToday = cards?.filter((c) => {
    const r = reviewMap.get(c.id)
    return !r || r.due_date <= today
  }).length ?? 0

  const reviewedDays = new Set(
    reviews?.filter((r) => r.last_reviewed).map((r) => r.last_reviewed!.split('T')[0]) ?? []
  )
  let streak = 0
  const cur = new Date()
  while (true) {
    const d = cur.toISOString().split('T')[0]
    if (reviewedDays.has(d)) { streak++; cur.setDate(cur.getDate() - 1) }
    else break
  }

  const deckStats = (decks ?? []).map((deck: Deck) => {
    const deckCards = cards?.filter((c) => c.deck_id === deck.id) ?? []
    const cardCount = deckCards.length
    const dueCount = deckCards.filter((c) => {
      const r = reviewMap.get(c.id)
      return !r || r.due_date <= today
    }).length
    const mature = deckCards.filter((c) => { const r = reviewMap.get(c.id); return r && r.interval >= 21 }).length
    const pctMature = cardCount > 0 ? Math.round((mature / cardCount) * 100) : 0
    return { deck, cardCount, dueCount, pctMature }
  })

  return (
    <>
      <Header userName={name} userAvatar={avatar} />
      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Greeting */}
        {name && (
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900">
              {avatar && <span className="mr-2">{AVATAR_EMOJI[avatar]}</span>}
              Hallo, {name}!
            </h1>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard label="Karten gesamt" value={totalCards} />
          <StatCard label="Heute fällig" value={dueToday} accent />
          <StatCard label="Tages-Serie" value={streak} suffix={streak === 1 ? ' Tag' : ' Tage'} />
        </div>

        {/* Decks */}
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Meine Decks
        </h2>

        {deckStats.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">Noch keine Decks. Füge deine erste Karte hinzu.</p>
            <a
              href="/add"
              className="inline-block mt-4 px-4 py-2 bg-[#378ADD] text-white text-sm rounded-lg font-medium hover:bg-[#2d72c4] transition-colors"
            >
              Karte hinzufügen
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {deckStats.map(({ deck, cardCount, dueCount, pctMature }) => (
              <div
                key={deck.id}
                className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-gray-900 truncate">{deck.name}</span>
                    <span className="text-xs text-gray-400">
                      {cardCount} {cardCount === 1 ? 'Karte' : 'Karten'}
                    </span>
                    {dueCount > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-[#378ADD]/10 text-[#378ADD] rounded-full font-medium">
                        {dueCount} fällig
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#378ADD] rounded-full transition-all" style={{ width: `${pctMature}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 tabular-nums w-16 text-right">
                      {pctMature}% reif
                    </span>
                  </div>
                </div>
                <a
                  href={`/study/${deck.id}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dueCount > 0
                      ? 'bg-[#378ADD] text-white hover:bg-[#2d72c4]'
                      : 'bg-gray-100 text-gray-400 cursor-default pointer-events-none'
                  }`}
                >
                  Lernen
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

function StatCard({ label, value, accent, suffix }: { label: string; value: number; accent?: boolean; suffix?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-medium tabular-nums ${accent ? 'text-[#378ADD]' : 'text-gray-900'}`}>
        {value}
        {suffix && <span className="text-base font-normal text-gray-400 ml-1">{suffix}</span>}
      </p>
    </div>
  )
}
