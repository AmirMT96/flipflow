export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'lg'
      ? 'text-3xl'
      : size === 'md'
        ? 'text-xl'
        : 'text-base'
  return (
    <span className={`font-medium tracking-tight ${cls}`}>
      <span className="text-black">Flip</span>
      <span style={{ color: '#378ADD' }}>Flow</span>
    </span>
  )
}
