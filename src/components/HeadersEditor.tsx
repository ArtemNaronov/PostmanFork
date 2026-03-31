import type { HeaderEntry } from '../types'
import { createId } from '../utils/id'

type Props = {
  headers: HeaderEntry[]
  onChange: (headers: HeaderEntry[]) => void
}

export function HeadersEditor({ headers, onChange }: Props) {
  const update = (id: string, patch: Partial<HeaderEntry>) => {
    onChange(headers.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  }

  const add = () => {
    onChange([
      ...headers,
      { id: createId(), key: '', value: '', enabled: true },
    ])
  }

  const remove = (id: string) => {
    onChange(headers.filter((h) => h.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text)]">Заголовки запроса</span>
        <button
          type="button"
          onClick={add}
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          + Добавить
        </button>
      </div>
      <div className="glass max-h-48 space-y-1 overflow-y-auto rounded-xl p-2">
        {headers.map((h) => (
          <div key={h.id} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={h.enabled}
              onChange={(e) => update(h.id, { enabled: e.target.checked })}
              className="mt-1.5 shrink-0"
              title="Вкл."
            />
            <input
              className="glass-input min-w-0 flex-1 rounded-lg px-2 py-1.5 font-mono text-xs"
              placeholder="Ключ"
              value={h.key}
              onChange={(e) => update(h.id, { key: e.target.value })}
            />
            <input
              className="glass-input min-w-0 flex-[2] rounded-lg px-2 py-1.5 font-mono text-xs"
              placeholder="Значение"
              value={h.value}
              onChange={(e) => update(h.id, { value: e.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(h.id)}
              className="shrink-0 px-1 text-[var(--danger)] hover:underline"
              title="Удалить"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
