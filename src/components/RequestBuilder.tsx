import type { DraftRequest, HeaderEntry, HttpMethod } from '../types'
import { BODY_PAYLOAD_MODES, HTTP_METHODS } from '../types'
import { syncHeadersForRequest } from '../utils/headers'
import { tryParseJson } from '../utils/json'
import { HeadersEditor } from './HeadersEditor'

type Props = {
  draft: DraftRequest
  onChange: (next: DraftRequest) => void
  onSend: () => void
  sending: boolean
  jsonError: string | null
  /** Уже с учётом коллекции и общего Bearer */
  effectiveHeaders: HeaderEntry[]
}

export function RequestBuilder({
  draft,
  onChange,
  onSend,
  sending,
  jsonError,
  effectiveHeaders,
}: Props) {
  const set = (patch: Partial<DraftRequest>) => onChange({ ...draft, ...patch })

  const bodyHasContent = draft.body.trim().length > 0
  const methodsWithBody: HttpMethod[] = ['POST', 'PUT', 'PATCH', 'DELETE']
  const showBody = methodsWithBody.includes(draft.method)

  const mode = draft.bodyPayloadMode ?? 'json'
  const jsonHint =
    mode === 'json' && bodyHasContent
      ? tryParseJson(draft.body).ok
        ? 'валидный JSON'
        : 'неверный JSON'
      : null

  return (
    <div className="glass glass-strong space-y-4 rounded-2xl p-5">
      <div className="flex flex-wrap gap-2">
        <select
          className="glass-input rounded-xl px-3 py-2.5 font-mono text-sm"
          value={draft.method}
          onChange={(e) => {
            const method = e.target.value as HttpMethod
            set({
              method,
              headers: syncHeadersForRequest(draft.headers, method, draft.bodyPayloadMode ?? 'json'),
            })
          }}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          className="glass-input min-w-[200px] flex-1 rounded-xl px-4 py-2.5 font-mono text-sm"
          placeholder="/users или https://api.example.com/users"
          value={draft.url}
          onChange={(e) => set({ url: e.target.value })}
        />
        <button
          type="button"
          disabled={sending}
          onClick={onSend}
          className="btn-primary rounded-xl px-8 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {sending ? 'Отправка…' : 'Отправить'}
        </button>
      </div>

      <HeadersEditor headers={draft.headers} onChange={(headers) => set({ headers })} />
      <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
        Метод и формат тела обновляют строку <strong className="text-[var(--text)]">Content-Type</strong> (для
        Form Data заголовок отключается — границу задаёт браузер). Здесь — только заголовки текущего запроса; в
        боковой панели можно выбрать сохранённый набор — он подмешивается первым (см. ниже).
      </p>

      {effectiveHeaders.length > 0 && (
        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-highlight)]/30 p-3">
          <div className="mb-1 text-xs font-medium text-[var(--text)]">
            Итоговые заголовки к отправке
          </div>
          <p className="mb-2 text-[10px] leading-snug text-[var(--text-muted)]">
            Порядок: сохранённый набор (если выбран в боковой панели) → заголовки конструктора (перекрывают
            совпадающие имена).
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto font-mono text-[10px] leading-snug">
            {effectiveHeaders.map((h) => (
              <li key={h.id} className="break-all">
                <span className="text-[var(--accent)]">{h.key}</span>
                <span className="text-[var(--text-muted)]">: </span>
                <span>{h.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showBody && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-[var(--text)]">Тело запроса</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-[var(--text-muted)]">Формат</label>
              <select
                className="glass-input max-w-[min(100%,280px)] rounded-lg px-2 py-1.5 text-xs"
                value={mode}
                onChange={(e) => {
                  const bodyPayloadMode = e.target.value as DraftRequest['bodyPayloadMode']
                  set({
                    bodyPayloadMode,
                    headers: syncHeadersForRequest(draft.headers, draft.method, bodyPayloadMode),
                  })
                }}
              >
                {BODY_PAYLOAD_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {mode === 'none' ? (
            <p className="text-sm text-[var(--text-muted)]">Тело не отправляется.</p>
          ) : (
            <>
              {mode === 'json' && bodyHasContent && (
                <p className="mb-1 text-xs text-[var(--text-muted)]">
                  Проверка JSON:{' '}
                  <span className={tryParseJson(draft.body).ok ? 'text-[var(--ok)]' : 'text-[var(--danger)]'}>
                    {jsonHint}
                  </span>
                </p>
              )}
              {(mode === 'formdata' || mode === 'urlencoded') && (
                <p className="mb-1 text-xs text-[var(--text-muted)]">
                  Укажите объект JSON с полями формы, например{' '}
                  <code className="font-mono text-[var(--accent)]">{`{"login":"a","password":"b"}`}</code>
                </p>
              )}
              <textarea
                className="glass-input h-40 w-full resize-y rounded-xl p-3 font-mono text-xs"
                placeholder={
                  mode === 'json'
                    ? '{"ключ": "значение"}'
                    : mode === 'text'
                      ? 'Произвольный текст'
                      : '{ "поле": "значение" }'
                }
                value={draft.body}
                onChange={(e) => set({ body: e.target.value })}
                spellCheck={false}
              />
              {jsonError && <p className="mt-1 text-xs text-[var(--danger)]">{jsonError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
