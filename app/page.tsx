import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

interface Deck {
  id: string
  name: string
  created_at: string
}

interface CardCount {
  deck_id: string
  count: number
}

interface Review {
  card_id: string
  due_date: string
  repetitions: number
  interval: number
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Fetch decks
  const { data: decks } = await supabase
    .from('decks')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch all cards for this user
  const { data: cards } = await supabase
    .from('cards')
    .select('id, deck_id')

  // Fetch all reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('card_id, due_date, repetitions, interval')

  const today = new Date().toISOString().split('T')[0]

  // Compute stats
  const totalCards = cards?.length ?? 0

  const reviewMap = new Map<string, Review>()
  reviews?.forEach((r) => reviewMap.set(r.card_id, r))

  const dueToday = cards?.filter((c) => {
    const r = reviewMap.get(c.id)
    if (!r) return true // never reviewed = due
    return r.due_date <= today
  }).length ?? 0

  // Streak: simplified — count distinct days with reviews in last 30 days
  const { data: streakData } = await supabase
    .from('reviews')
    .select('last_reviewed')
    .not('last_reviewed', 'is', null)

  const reviewedDays = new Set(
    streakData?.map((r: { last_reviewed: string }) =>
      r.last_reviewed.split('T')[0]
    ) ?? []
  )

  let streak = 0
  const cur = new Date()
  while (true) {
    const d = cur.toISOString().split('T')[0]
    if (reviewedDays.has(d)) {
      streak++
      cur.setDate(cur.getDate() - 1)
    } else {
      break
    }
  }

  // Per-deck stats
  const deckStats = (decks ?? []).map((deck: Deck) => {
    const deckCards = cards?.filter((c) => c.deck_id === deck.id) ?? []
    const cardCount = deckCards.length
    const dueCount = deckCards.filter((c) => {
      const r = reviewMap.get(c.id)
      if (!r) return true
      return r.due_date <= today
    }).length
    const mature = deckCards.filter((c) => {
      const r = reviewMap.get(c.id)
      return r && r.interval >= 21
    }).length
    const pctMature = cardCount > 0 ? Math.round((mature / cardCount) * 100) : 0
    return { deck, cardCount, dueCount, pctMature }
  })

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Page title */}
        <h1 className="text-2xl font-medium mb-8">
          Dashboard <span className="text-gray-400 font-normal">/ Übersicht</span>
        </h1>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard
            label="Total cards"
            labelDe="Karten gesamt"
            value={totalCards}
          />
          <StatCard
            label="Due today"
            labelDe="Heute fällig"
            value={dueToday}
            accent
          />
          <StatCard
            label="Day streak"
            labelDe="Tages-Serie"
            value={streak}
            suffix={streak === 1 ? ' day' : ' days'}
          />
        </div>

        {/* Decks */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            My Decks / Meine Decks
          </h2>
        </div>

        {deckStats.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">
              No decks yet. Add your first card to get started.
            </p>
            <a
              href="/add"
              className="inline-block mt-4 px-4 py-2 bg-[#378ADD] text-white text-sm rounded-lg font-medium hover:bg-[#2d72c4] transition-colors"
            >
              Add card / Karte hinzufügen
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
                    <span className="font-medium text-gray-900 truncate">
                      {deck.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                    </span>
                    {dueCount > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-[#378ADD]/10 text-[#378ADD] rounded-full font-medium">
                        {dueCount} due
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#378ADD] rounded-full transition-all"
                        style={{ width: `${pctMature}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 tabular-nums w-12 text-right">
                      {pctMature}% mature
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
                  Study / Lernen
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

function StatCard({
  label,
  labelDe,
  value,
  accent,
  suffix,
}: {
  label: string
  labelDe: string
  value: number
  accent?: boolean
  suffix?: string
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-400 mb-1">
        {label} / {labelDe}
      </p>
      <p
        className={`text-3xl font-medium tabular-nums ${accent ? 'text-[#378ADD]' : 'text-gray-900'}`}
      >
        {value}
        {suffix && (
          <span className="text-base font-normal text-gray-400 ml-1">
            {suffix}
          </span>
        )}
      </p>
    </div>
  )
}
