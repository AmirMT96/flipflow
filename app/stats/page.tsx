import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import StatsCharts from './StatsCharts'

export default async function StatsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: cards }, { data: decks }, { data: reviews }] = await Promise.all([
    supabase.from('cards').select('id, deck_id'),
    supabase.from('decks').select('id, name'),
    supabase.from('reviews').select('card_id, last_reviewed, interval, repetitions, due_date'),
  ])

  // Cards learned per day (last 7 days)
  const today = new Date()
  const days: { date: string; label: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })
    const count =
      reviews?.filter((r) => r.last_reviewed?.split('T')[0] === iso).length ?? 0
    days.push({ date: iso, label, count })
  }

  // Per-deck card count
  const deckData = (decks ?? []).map((deck) => ({
    name: deck.name,
    count: cards?.filter((c) => c.deck_id === deck.id).length ?? 0,
  }))

  // Streak
  const reviewedDays = new Set(
    reviews?.filter((r) => r.last_reviewed).map((r) => r.last_reviewed!.split('T')[0]) ?? []
  )
  let streak = 0
  const cur = new Date()
  while (true) {
    const d = cur.toISOString().split('T')[0]
    if (reviewedDays.has(d)) {
      streak++
      cur.setDate(cur.getDate() - 1)
    } else break
  }

  // Longest streak (simplified: count consecutive days in reviewedDays)
  const sortedDays = [...reviewedDays].sort()
  let longest = 0
  let tempStreak = 0
  let prev: string | null = null
  for (const day of sortedDays) {
    if (prev) {
      const diff = (new Date(day).getTime() - new Date(prev).getTime()) / 86400000
      if (diff === 1) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    } else {
      tempStreak = 1
    }
    if (tempStreak > longest) longest = tempStreak
    prev = day
  }

  // % mature
  const totalCards = cards?.length ?? 0
  const matureCards = reviews?.filter((r) => r.interval >= 21).length ?? 0
  const pctMature =
    totalCards > 0 ? Math.round((matureCards / totalCards) * 100) : 0

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-medium mb-8">
          Stats <span className="text-gray-400 font-normal">/ Statistik</span>
        </h1>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <MiniStat label="Current streak" value={`${streak}d`} />
          <MiniStat label="Longest streak" value={`${longest}d`} />
          <MiniStat label="Mature cards" value={`${pctMature}%`} accent />
          <MiniStat label="Total cards" value={String(totalCards)} />
        </div>

        <StatsCharts weekData={days} deckData={deckData} />
      </main>
    </>
  )
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p
        className={`text-2xl font-medium tabular-nums ${accent ? 'text-[#378ADD]' : 'text-gray-900'}`}
      >
        {value}
      </p>
    </div>
  )
}
