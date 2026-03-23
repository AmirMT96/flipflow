import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/Logo'

const AVATARS = [
  { id: 'fuchs', emoji: '🦊', label: 'Fuchs' },
  { id: 'koala', emoji: '🐨', label: 'Koala' },
  { id: 'loewe', emoji: '🦁', label: 'Löwe' },
  { id: 'frosch', emoji: '🐸', label: 'Frosch' },
  { id: 'adler', emoji: '🦅', label: 'Adler' },
  { id: 'delfin', emoji: '🐬', label: 'Delfin' },
  { id: 'schmetterling', emoji: '🦋', label: 'Schmetterling' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
]

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const name = user.user_metadata?.name ?? 'dort'

  async function selectAvatar(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const avatar = formData.get('avatar') as string
    await supabase.auth.updateUser({ data: { avatar } })
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="w-full max-w-lg text-center">
        <div className="mb-8">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl font-medium text-gray-900 mb-2">
          Willkommen, {name}!
        </h1>
        <p className="text-gray-400 text-sm mb-10">
          Wähle deinen Avatar aus, um loszulegen.
        </p>

        <div className="grid grid-cols-4 gap-3">
          {AVATARS.map((avatar) => (
            <form key={avatar.id} action={selectAvatar}>
              <input type="hidden" name="avatar" value={avatar.id} />
              <button
                type="submit"
                className="w-full flex flex-col items-center gap-2 border border-gray-100 rounded-2xl py-5 px-2 hover:border-[#378ADD] hover:bg-[#378ADD]/5 transition-all group"
              >
                <span className="text-4xl">{avatar.emoji}</span>
                <span className="text-xs text-gray-400 group-hover:text-[#378ADD] transition-colors">
                  {avatar.label}
                </span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  )
}
