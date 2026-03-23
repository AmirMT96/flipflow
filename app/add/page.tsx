'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

interface Deck {
  id: string
  name: string
}

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

  useEffect(() => {
    supabase
      .from('decks')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
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

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    let targetDeckId = deckId

    // Create new deck if needed
    if (isNewDeck) {
      if (!newDeckName.trim()) {
        setError('Please enter a deck name.')
        setLoading(false)
        return
      }
      const { data: newDeck, error: deckErr } = await supabase
        .from('decks')
        .insert({ name: newDeckName.trim(), user_id: user.id })
        .select()
        .single()
      if (deckErr || !newDeck) {
        setError(deckErr?.message ?? 'Failed to create deck.')
        setLoading(false)
        return
      }
      targetDeckId = newDeck.id
      setDecks((prev) => [...prev, newDeck])
      setDeckId(newDeck.id)
    }

    const { data: card, error: cardErr } = await supabase
      .from('cards')
      .insert({
        front: front.trim(),
        back: back.trim(),
        example_sentence: example.trim() || null,
        deck_id: targetDeckId,
        user_id: user.id,
      })
      .select()
      .single()

    if (cardErr || !card) {
      setError(cardErr?.message ?? 'Failed to add card.')
      setLoading(false)
      return
    }

    // Create initial review entry
    await supabase.from('reviews').insert({
      card_id: card.id,
      user_id: user.id,
    })

    setFront('')
    setBack('')
    setExample('')
    setNewDeckName('')
    setIsNewDeck(false)
    setSuccess(true)
    setLoading(false)
    setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <>
      <Header />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-medium mb-8">
          Add card{' '}
          <span className="text-gray-400 font-normal">/ Karte hinzufügen</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            label="Front (English)"
            labelDe="Vorderseite"
            value={front}
            onChange={setFront}
            placeholder="e.g. butterfly"
            required
          />
          <Field
            label="Back (German)"
            labelDe="Rückseite"
            value={back}
            onChange={setBack}
            placeholder="e.g. der Schmetterling"
            required
          />
          <Field
            label="Example sentence"
            labelDe="Beispielsatz"
            value={example}
            onChange={setExample}
            placeholder="e.g. The butterfly landed on the flower."
          />

          {/* Deck selector */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Deck / Stapel
            </label>
            {!isNewDeck && decks.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#378ADD] bg-white"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsNewDeck(true)}
                  className="px-3 py-2.5 text-sm text-[#378ADD] border border-[#378ADD]/30 rounded-lg hover:bg-[#378ADD]/5 transition-colors"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="New deck name"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#378ADD]"
                />
                {decks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsNewDeck(false)}
                    className="px-3 py-2.5 text-sm text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && (
            <p className="text-sm text-green-600">
              Card added! / Karte hinzugefügt!
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#378ADD] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#2d72c4] transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add card / Karte hinzufügen'}
          </button>
        </form>
      </main>
    </>
  )
}

function Field({
  label,
  labelDe,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  labelDe: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">
        {label}{' '}
        <span className="text-gray-400 font-normal">/ {labelDe}</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#378ADD] transition-colors"
      />
    </div>
  )
}
