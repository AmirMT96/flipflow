'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'
import { computeNextReview, type Rating, type SM2State } from '@/lib/sm2'

interface Card { id: string; front: string; back: string; example_sentence: string | null }
interface ReviewRow { card_id: string; ease_factor: number; interval: number; repetitions: number; due_date: string }

// Points awarded per rating
const RATING_POINTS: Record<Rating, number> = { 0: 0, 1: 5, 2: 10, 3: 20 }

const RATINGS: { rating: Rating; label: string; color: string }[] = [
  { rating: 0, label: 'Nochmal', color: 'border-red-200 text-red-600 hover:bg-red-50' },
  { rating: 1, label: 'Schwer',  color: 'border-orange-200 text-orange-600 hover:bg-orange-50' },
  { rating: 2, label: 'Gut',     color: 'border-[#378ADD]/30 text-[#378ADD] hover:bg-[#378ADD]/5' },
  { rating: 3, label: 'Leicht',  color: 'border-green-200 text-green-600 hover:bg-green-50' },
]

export default function StudyPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const supabase = createClient()

  const [deckName, setDeckName] = useState('')
  const [queue, setQueue] = useState<Card[]>([])
  const [reviewMap, setReviewMap] = useState<Map<string, ReviewRow>>(new Map())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [lastPoints, setLastPoints] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const { data: cardIds } = await supabase.from('cards').select('id').eq('deck_id', deckId)
      const ids = cardIds?.map((c: { id: string }) => c.id) ?? []

      const [{ data: deck }, { data: cards }, { data: reviews }] = await Promise.all([
        supabase.from('decks').select('name').eq('id', deckId).single(),
        supabase.from('cards').select('id, front, back, example_sentence').eq('deck_id', deckId),
        ids.length > 0
          ? supabase.from('reviews').select('*').in('card_id', ids)
          : Promise.resolve({ data: [] }),
      ])

      if (deck) setDeckName(deck.name)

      const rMap = new Map<string, ReviewRow>()
      reviews?.forEach((r: ReviewRow) => rMap.set(r.card_id, r))
      setReviewMap(rMap)

      const due = (cards ?? []).filter((c: Card) => {
        const r = rMap.get(c.id)
        return !r || r.due_date <= today
      })

      setQueue(due)
      setLoading(false)
      if (due.length === 0) setDone(true)
    }
    load()
  }, [deckId])

  const handleRate = useCallback(async (rating: Rating) => {
    const card = queue[currentIndex]
    if (!card) return

    const existing = reviewMap.get(card.id)
    const state: SM2State = {
      ease_factor: existing?.ease_factor ?? 2.5,
      interval: existing?.interval ?? 1,
      repetitions: existing?.repetitions ?? 0,
    }

    const next = computeNextReview(state, rating)
    const due_date = next.due_date.toISOString().split('T')[0]
    const points = RATING_POINTS[rating]
    const { data: { user } } = await supabase.auth.getUser()

    // Update SM-2 review state
    await supabase.from('reviews').upsert({
      card_id: card.id,
      user_id: user?.id,
      ease_factor: next.ease_factor,
      interval: next.interval,
      repetitions: next.repetitions,
      due_date,
      last_reviewed: new Date().toISOString(),
    }, { onConflict: 'card_id' })

    // Log points for statistics
    await supabase.from('study_logs').insert({
      card_id: card.id,
      user_id: user?.id,
      rating,
      points,
    })

    setSessionPoints((p) => p + points)
    setLastPoints(points)
    setFlipped(false)

    if (currentIndex + 1 >= queue.length) {
      setDone(true)
    } else {
      setTimeout(() => {
        setLastPoints(null)
        setCurrentIndex((i) => i + 1)
      }, 80)
    }
  }, [queue, currentIndex, reviewMap, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Laden…</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        <Logo size="md" />
        <h2 className="text-2xl font-medium text-gray-900">Sitzung abgeschlossen!</h2>
        <p className="text-gray-400 text-sm">
          Alle {queue.length} {queue.length === 1 ? 'Karte' : 'Karten'} aus <strong>{deckName}</strong> gelernt.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-3xl font-medium text-[#378ADD] tabular-nums">+{sessionPoints}</span>
          <span className="text-gray-400 text-sm">Punkte verdient</span>
        </div>
        <Link
          href="/"
          className="mt-4 px-5 py-2.5 bg-[#378ADD] text-white rounded-lg text-sm font-medium hover:bg-[#2d72c4] transition-colors"
        >
          Zurück zur Übersicht
        </Link>
      </div>
    )
  }

  const card = queue[currentIndex]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{deckName}</span>
            <span className="text-sm text-gray-500">
              {queue.length - currentIndex} {queue.length - currentIndex === 1 ? 'Karte' : 'Karten'} übrig
            </span>
            <div className="flex items-center gap-1 bg-[#378ADD]/10 text-[#378ADD] rounded-full px-3 py-1">
              <span className="text-xs font-medium tabular-nums">{sessionPoints} Pkt.</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-[#378ADD] transition-all"
          style={{ width: `${(currentIndex / queue.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Card */}
        <div
          className="flip-card w-full max-w-lg cursor-pointer"
          style={{ height: 260 }}
          onClick={() => !flipped && setFlipped(true)}
        >
          <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
            <div className="flip-card-front bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center p-8">
              <p className="text-2xl font-medium text-gray-900 text-center">{card.front}</p>
              {!flipped && (
                <p className="mt-4 text-sm text-gray-400">Tippen zum Aufdecken</p>
              )}
            </div>
            <div className="flip-card-back bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center p-8">
              <p className="text-xl font-medium text-[#378ADD] text-center">{card.back}</p>
              {card.example_sentence && (
                <p className="mt-3 text-sm text-gray-500 italic text-center max-w-xs">
                  {card.example_sentence}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Rating buttons */}
        <div
          className={`mt-8 grid grid-cols-4 gap-3 w-full max-w-lg transition-opacity duration-300 ${
            flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {RATINGS.map(({ rating, label, color }) => {
            const pts = RATING_POINTS[rating]
            return (
              <button
                key={rating}
                onClick={() => handleRate(rating)}
                className={`flex flex-col items-center border rounded-xl py-3 px-2 transition-colors ${color}`}
              >
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs mt-1 opacity-60 tabular-nums">
                  {pts === 0 ? '0 Pkt.' : `+${pts} Pkt.`}
                </span>
              </button>
            )
          })}
        </div>

        {/* Point flash */}
        {lastPoints !== null && (
          <div className="mt-4 text-sm font-medium text-[#378ADD] animate-pulse">
            {lastPoints === 0 ? '0 Punkte' : `+${lastPoints} Punkte`}
          </div>
        )}
      </div>
    </div>
  )
}
