import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import StatsCharts from './StatsCharts'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = user.user_metadata?.name as string | undefined
  const avatar = user.user_metadata?.avatar as string | undefined

  const [{ data: cards }, { data: decks }, { data: reviews }, { data: logs }] = await Promise.all([
    supabase.from('cards').select('id, deck_id'),
    supabase.from('decks').select('id, name'),
    supabase.from('reviews').select('card_id, last_reviewed, interval, repetitions, due_date'),
    supabase.from('study_logs').select('points, reviewed_at'),
  ])

  const today = new Date()

  // Points per day (last 7 days)
  const days: { date: string; label: string; points: number; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('de-DE', { weekday: 'short' })
    const dayLogs = logs?.filter((l) => l.reviewed_at?.split('T')[0] === iso) ?? []
    const points = dayLogs.reduce((sum, l) => sum + (l.points ?? 0), 0)
    const count = dayLogs.length
    days.push({ date: iso, label, points, count })
  }

  // Cards per deck
  const deckData = (decks ?? []).map((deck) => ({
    name: deck.name,
    count: cards?.filter((c) => c.deck_id === deck.id).length ?? 0,
  }))

  // Streak (based on days where at least 1 card was reviewed)
  const reviewedDays = new Set(
    reviews?.filter((r) => r.last_reviewed).map((r) => r.last_reviewed!.split('T')[0]) ?? []
  )
  let streak = 0
  const cur = new Date()
  while (true) {
    const d = cur.toISOString().split('T')[0]
    if (reviewedDays.has(d)) { streak++; cur.setDate(cur.getDate() - 1) } else break
  }

  const sortedDays = [...reviewedDays].sort()
  let longest = 0, tempStreak = 0
  let prev: string | null = null
  for (const day of sortedDays) {
    if (prev) {
      const diff = (new Date(day).getTime() - new Date(prev).getTime()) / 86400000
      tempStreak = diff === 1 ? tempStreak + 1 : 1
    } else { tempStreak = 1 }
    if (tempStreak > longest) longest = tempStreak
    prev = day
  }

  const totalCards = cards?.length ?? 0
  const matureCards = reviews?.filter((r) => r.interval >= 21).length ?? 0
  const pctMature = totalCards > 0 ? Math.round((matureCards / totalCards) * 100) : 0
  const totalPoints = logs?.reduce((sum, l) => sum + (l.points ?? 0), 0) ?? 0

  return (
    <>
      <Header userName={name} userAvatar={avatar} />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-medium mb-8">Statistik</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <MiniStat label="Gesamtpunkte" value={String(totalPoints)} accent suffix=" Pkt." />
          <MiniStat label="Aktuelle Serie" value={String(streak)} suffix={streak === 1 ? ' Tag' : ' Tage'} />
          <MiniStat label="Längste Serie" value={String(longest)} suffix={longest === 1 ? ' Tag' : ' Tage'} />
          <MiniStat label="Reife Karten" value={`${pctMature}%`} />
        </div>

        <StatsCharts weekData={days} deckData={deckData} />
      </main>
    </>
  )
}

function MiniStat({ label, value, accent, suffix }: { label: string; value: string; accent?: boolean; suffix?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-medium tabular-nums ${accent ? 'text-[#378ADD]' : 'text-gray-900'}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-gray-400 ml-0.5">{suffix}</span>}
      </p>
    </div>
  )
}
