'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

interface Deck { id: string; name: string }

export default function AddCardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [decks, setDecks] = useState<Deck[]>([])
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [example, setExample] = useState('')
  const [deckId, setDeckId] = useState('')
  const [newDeckName, setNewDeckName] = useState('')
  const [isNewDeck, setIsNewDeck] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [userName, setUserName] = useState<string | undefined>()
  const [userAvatar, setUserAvatar] = useState<string | undefined>()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserName(user?.user_metadata?.name)
      setUserAvatar(user?.user_metadata?.avatar)
    })
    supabase.from('decks').select('id, name').order('name').then(({ data }) => {
      if (data) {
        setDecks(data)
        if (data.length > 0) setDeckId(data[0].id)
        else setIsNewDeck(true)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    let targetDeckId = deckId

    if (isNewDeck) {
      if (!newDeckName.trim()) { setError('Bitte einen Deck-Namen eingeben.'); setLoading(false); return }
      const { data: newDeck, error: deckErr } = await supabase
        .from('decks').insert({ name: newDeckName.trim(), user_id: user.id }).select().single()
      if (deckErr || !newDeck) { setError(deckErr?.message ?? 'Deck konnte nicht erstellt werden.'); setLoading(false); return }
      targetDeckId = newDeck.id
      setDecks((prev) => [...prev, newDeck])
      setDeckId(newDeck.id)
    }

    const { data: card, error: cardErr } = await supabase
      .from('cards')
      .insert({ front: front.trim(), back: back.trim(), example_sentence: example.trim() || null, deck_id: targetDeckId, user_id: user.id })
      .select().single()

    if (cardErr || !card) { setError(cardErr?.message ?? 'Karte konnte nicht hinzugefügt werden.'); setLoading(false); return }

    await supabase.from('reviews').insert({ card_id: card.id, user_id: user.id })

    setFront(''); setBack(''); setExample(''); setNewDeckName(''); setIsNewDeck(false)
    setSuccess(true); setLoading(false)
    setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <>
      <Header userName={userName} userAvatar={userAvatar} />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-medium mb-8">Karte hinzufügen</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Vorderseite" value={front} onChange={setFront} placeholder="z. B. butterfly" required />
          <Field label="Rückseite" value={back} onChange={setBack} placeholder="z. B. der Schmetterling" required />
          <Field label="Beispielsatz" value={example} onChange={setExample} placeholder="z. B. The butterfly landed on the flower." />

          <div>
            <label className="block text-sm text-gray-500 mb-1">Stapel</label>
            {!isNewDeck && decks.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#378ADD] bg-white"
                >
                  {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setIsNewDeck(true)}
                  className="px-3 py-2.5 text-sm text-[#378ADD] border border-[#378ADD]/30 rounded-lg hover:bg-[#378ADD]/5 transition-colors"
                >
                  + Neu
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Neuer Stapelname"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#378ADD]"
                />
                {decks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsNewDeck(false)}
                    className="px-3 py-2.5 text-sm text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">Karte hinzugefügt!</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#378ADD] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#2d72c4] transition-colors disabled:opacity-50"
          >
            {loading ? 'Wird hinzugefügt…' : 'Karte hinzufügen'}
          </button>
        </form>
      </main>
    </>
  )
}

function Field({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#378ADD] transition-colors"
      />
    </div>
  )
}
