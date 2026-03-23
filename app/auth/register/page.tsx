import Link from 'next/link'
import { redirect } from 'next/navigation'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/server'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  async function register(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      options: {
        data: {
          name: (formData.get('name') as string).trim(),
        },
      },
    })
    if (error) {
      redirect(`/auth/register?error=${encodeURIComponent(error.message)}`)
    }
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Logo size="lg" />
        </div>
        <form action={register} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Name</label>
            <input
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#378ADD] transition-colors"
              placeholder="Dein Name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">E-Mail</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#378ADD] transition-colors"
              placeholder="du@beispiel.de"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Passwort</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#378ADD] transition-colors"
              placeholder="mind. 6 Zeichen"
            />
          </div>
          {params.error && (
            <p className="text-sm text-red-500">{params.error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-[#378ADD] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#2d72c4] transition-colors"
          >
            Konto erstellen
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-6">
          Bereits ein Konto?{' '}
          <Link href="/auth/login" className="text-[#378ADD] hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
