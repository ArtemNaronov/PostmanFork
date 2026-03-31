import { useEffect, useMemo, useState } from 'react'
import type { HttpResult } from '../services/http'
import { tryParseJson } from '../utils/json'
import { JsonTreeView } from './JsonTreeView'

type Props = {
  result: HttpResult | null
  loading: boolean
}

function isJsonBody(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return tryParseJson(t).ok
}

export function ResponseViewer({ result, loading }: Props) {
  const [rawText, setRawText] = useState(false)

  const bodyText = result?.bodyFormatted ?? result?.bodyText ?? ''
  const showTree = useMemo(() => isJsonBody(bodyText), [bodyText])

  useEffect(() => {
    setRawText(false)
  }, [result?.bodyText, result?.status])

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 text-sm text-[var(--text-muted)]">Отправка…</div>
    )
  }

  if (!result) {
    return (
      <div className="glass rounded-2xl border border-dashed border-[var(--glass-border)] p-4 text-sm text-[var(--text-muted)]">
        Ответ появится здесь после отправки запроса.
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-[var(--danger)]">Ошибка</div>
        <pre className="glass max-h-64 overflow-x-auto whitespace-pre-wrap rounded-2xl p-4 font-mono text-xs text-[var(--text)]">
          {result.error}
        </pre>
      </div>
    )
  }

  const ok = result.status >= 200 && result.status < 300
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-medium text-[var(--text)]">Статус</span>
        <span
          className={`font-mono text-sm ${ok ? 'text-[var(--ok)]' : 'text-[var(--danger)]'}`}
        >
          {result.status} {result.statusText}
        </span>
      </div>
      <div>
        <div className="mb-1 text-sm font-medium text-[var(--text)]">Заголовки ответа</div>
        <div className="glass max-h-32 overflow-y-auto rounded-xl p-2 font-mono text-xs">
          {result.responseHeaders.map(({ key, value }, i) => (
            <div key={`${key}-${i}`} className="break-all">
              <span className="text-[var(--accent)]">{key}</span>
              <span className="text-[var(--text-muted)]">: </span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        {result.bodyTruncated && (
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            Показана только часть тела ответа — объём превышает лимит отображения.
          </p>
        )}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-[var(--text)]">Тело ответа</span>
          {showTree && (
            <button
              type="button"
              onClick={() => setRawText((v) => !v)}
              className="glass-input rounded-lg px-3 py-1 text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
            >
              {rawText ? 'Дерево' : 'Как текст'}
            </button>
          )}
        </div>
        {showTree && !rawText ? (
          <JsonTreeView json={bodyText} />
        ) : (
          <pre className="glass max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl p-4 font-mono text-xs text-[var(--text)]">
            {bodyText}
          </pre>
        )}
      </div>
    </div>
  )
}
