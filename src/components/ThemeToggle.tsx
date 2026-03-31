type Props = {
  dark: boolean
  onToggle: () => void
}

export function ThemeToggle({ dark, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="glass glass-input rounded-full px-4 py-2 text-xs font-medium text-[var(--text)] transition hover:brightness-105"
      title={dark ? 'Дневная тема' : 'Ночная тема'}
    >
      {dark ? '☀️ День' : '🌙 Ночь'}
    </button>
  )
}
