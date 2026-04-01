import { useEffect, useRef, useState } from 'react'
import type { BaseUrlEntry, Collection, HeaderEntry, HeaderPreset } from '../types'
import { HeadersEditor } from './HeadersEditor'

type Props = {
  collections: Collection[]
  baseUrls: BaseUrlEntry[]
  headerPresets: HeaderPreset[]
  selectedCollectionId: string | null
  selectedBaseUrlId: string | null
  selectedHeaderPresetId: string | null
  onSelectCollection: (id: string | null) => void
  onSelectRequest: (collectionId: string, requestId: string) => void
  onNewCollection: () => void
  onSaveRequestToCollection: (collectionId: string) => void
  onDeleteCollection: (id: string) => void
  onExport: () => void
  onImportFile: (file: File) => void
  onAddBaseUrl: (name: string, url: string) => void
  onRemoveBaseUrl: (id: string) => void
  onBaseUrlChange: (id: string | null) => void
  onSelectHeaderPreset: (id: string | null) => void
  onUpdateHeaderPresetHeaders: (presetId: string, headers: HeaderEntry[]) => void
  onAddHeaderPreset: (name: string) => void
  onRemoveHeaderPreset: (id: string) => void
}

export function CollectionsSidebar({
  collections,
  baseUrls,
  headerPresets,
  selectedCollectionId,
  selectedBaseUrlId,
  selectedHeaderPresetId,
  onSelectCollection,
  onSelectRequest,
  onNewCollection,
  onSaveRequestToCollection,
  onDeleteCollection,
  onExport,
  onImportFile,
  onAddBaseUrl,
  onRemoveBaseUrl,
  onBaseUrlChange,
  onSelectHeaderPreset,
  onUpdateHeaderPresetHeaders,
  onAddHeaderPreset,
  onRemoveHeaderPreset,
}: Props) {
  const [presetDraft, setPresetDraft] = useState<HeaderEntry[]>([])
  const lastPresetSigRef = useRef('')

  const fileRef = useRef<HTMLInputElement>(null)
  const baseNameRef = useRef<HTMLInputElement>(null)
  const baseUrlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedHeaderPresetId) {
      setPresetDraft([])
      lastPresetSigRef.current = ''
      return
    }
    const p = headerPresets.find((x) => x.id === selectedHeaderPresetId)
    const sig = JSON.stringify(p?.headers ?? [])
    if (sig !== lastPresetSigRef.current) {
      setPresetDraft(p?.headers ?? [])
      lastPresetSigRef.current = sig
    }
  }, [selectedHeaderPresetId, headerPresets])

  return (
    <aside className="glass glass-strong relative z-10 flex h-full min-h-0 w-80 shrink-0 flex-col rounded-none border-r border-[var(--glass-border)] md:rounded-3xl">
      <div className="shrink-0 border-b border-[var(--glass-border)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">Коллекции</h2>
          <button
            type="button"
            onClick={onNewCollection}
            className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            Новая
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onExport}
            className="glass-input flex-1 rounded-lg px-2 py-2 text-xs font-medium"
          >
            Экспорт JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="glass-input flex-1 rounded-lg px-2 py-2 text-xs font-medium"
          >
            Импорт
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ''
            }}
          />
        </div>
        <p className="mt-2 text-[10px] leading-snug text-[var(--text-muted)]">
          Поддерживаются экспорт приложения и файлы Postman Collection v2 (как postman_collection.json).
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="space-y-1 text-sm">
          {collections.map((c) => (
            <li key={c.id}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-expanded={selectedCollectionId === c.id}
                  onClick={() =>
                    onSelectCollection(selectedCollectionId === c.id ? null : c.id)
                  }
                  className={`flex-1 truncate rounded-lg px-2 py-1.5 text-left transition ${
                    selectedCollectionId === c.id
                      ? 'bg-[var(--accent)]/20 font-medium text-[var(--accent)]'
                      : 'hover:bg-[var(--glass-highlight)]'
                  }`}
                >
                  {c.name}
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--danger)] hover:underline"
                  onClick={() => onDeleteCollection(c.id)}
                  title="Удалить коллекцию"
                >
                  ×
                </button>
              </div>
              {selectedCollectionId === c.id && (
                <div className="ml-1 mt-1 space-y-2">
                  {c.requests.length > 0 && (
                    <ul className="border-l border-[var(--glass-border)] pl-2">
                      {c.requests.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => onSelectRequest(c.id, r.id)}
                            className="w-full truncate rounded px-2 py-0.5 text-left text-xs text-[var(--text-muted)] transition hover:bg-[var(--glass-highlight)] hover:text-[var(--text)]"
                          >
                            <span className="font-mono text-[var(--accent)]">{r.method}</span>{' '}
                            {r.name || r.url || 'Без названия'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 space-y-4 border-t border-[var(--glass-border)] p-4">
        <div>
          <div className="mb-1 text-xs font-medium text-[var(--text)]">Базовый URL</div>
          <p className="mb-2 text-[10px] leading-snug text-[var(--text-muted)]">
            Для пути вида <code className="font-mono">/web/colors/</code> обязательно выберите базу ниже. Новая база
            после «Сохранить» подставляется автоматически.
          </p>
          <select
            className="glass-input mb-2 w-full rounded-lg px-2 py-2 text-xs"
            value={selectedBaseUrlId ?? ''}
            onChange={(e) => onBaseUrlChange(e.target.value || null)}
          >
            <option value="">(не использовать — нужен полный https://… в поле)</option>
            {baseUrls.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}: {b.url}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <input
              ref={baseNameRef}
              className="glass-input w-24 rounded-lg px-2 py-1.5 text-xs"
              placeholder="Название"
            />
            <input
              ref={baseUrlRef}
              className="glass-input min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs"
              placeholder="https://api.example.com"
            />
            <button
              type="button"
              className="btn-primary shrink-0 rounded-lg px-2 py-1.5 text-xs"
              onClick={() => {
                const name = baseNameRef.current?.value?.trim() || 'База'
                const url = baseUrlRef.current?.value?.trim()
                if (!url) return
                onAddBaseUrl(name, url)
                if (baseNameRef.current) baseNameRef.current.value = ''
                if (baseUrlRef.current) baseUrlRef.current.value = ''
              }}
            >
              Сохранить
            </button>
          </div>
          <ul className="mt-2 max-h-20 space-y-0.5 overflow-y-auto text-xs">
            {baseUrls.map((b) => (
              <li key={b.id} className="flex justify-between gap-1">
                <span className="truncate text-[var(--text-muted)]">{b.name}</span>
                <button
                  type="button"
                  className="text-[var(--danger)] hover:underline"
                  onClick={() => onRemoveBaseUrl(b.id)}
                >
                  убрать
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-1 text-xs font-medium text-[var(--text)]">Сохранённые наборы заголовков</div>
          <p className="mb-2 text-[10px] leading-snug text-[var(--text-muted)]">
            Те же ключи и значения, что в «Заголовках запроса», но хранятся отдельно. Выберите набор — он
            подмешивается ко всем запросам; в конструкторе можно переопределить любое имя. Можно завести
            несколько (например Bitrix и другой API).
          </p>
          <div className="mb-2 flex flex-wrap gap-1">
            <select
              className="glass-input min-w-0 flex-1 rounded-lg px-2 py-2 text-xs"
              value={selectedHeaderPresetId ?? ''}
              onChange={(e) => onSelectHeaderPreset(e.target.value || null)}
            >
              <option value="">(не использовать)</option>
              {headerPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="glass-input rounded-lg px-2 py-2 text-xs"
              onClick={() => {
                const name = window.prompt('Название набора', 'Мой API')?.trim()
                if (!name) return
                onAddHeaderPreset(name)
              }}
            >
              + Набор
            </button>
            {selectedHeaderPresetId && (
              <button
                type="button"
                className="glass-input rounded-lg px-2 py-2 text-xs text-[var(--danger)]"
                onClick={() => {
                  if (window.confirm('Удалить этот набор заголовков?')) {
                    onRemoveHeaderPreset(selectedHeaderPresetId)
                  }
                }}
              >
                Удалить
              </button>
            )}
          </div>
          {selectedHeaderPresetId && (
            <HeadersEditor
              headers={presetDraft}
              onChange={(headers) => {
                setPresetDraft(headers)
                onUpdateHeaderPresetHeaders(selectedHeaderPresetId, headers)
              }}
            />
          )}
        </div>

        {selectedCollectionId && (
          <button
            type="button"
            className="glass-input w-full rounded-xl py-2.5 text-xs font-medium"
            onClick={() => onSaveRequestToCollection(selectedCollectionId)}
          >
            Сохранить текущий запрос в коллекцию
          </button>
        )}
      </div>
    </aside>
  )
}
