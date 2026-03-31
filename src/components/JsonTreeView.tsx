import { useCallback, useMemo, useState } from 'react'

type Props = {
  json: string | unknown
  className?: string
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function JsonLeaf({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-[var(--text-muted)]">null</span>
  }
  if (typeof value === 'boolean') {
    return <span className="text-[var(--ok)]">{String(value)}</span>
  }
  if (typeof value === 'number') {
    return <span className="text-[#c45c26] dark:text-[#f5a623]">{value}</span>
  }
  if (typeof value === 'string') {
    return (
      <span className="break-all text-[#2d6a4f] dark:text-[#95d5b2]">
        &quot;{value}&quot;
      </span>
    )
  }
  return <span className="text-[var(--danger)]">{String(value)}</span>
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return `${n} ${many}`
  if (m10 === 1) return `${n} ${one}`
  if (m10 >= 2 && m10 <= 4) return `${n} ${few}`
  return `${n} ${many}`
}

const MAX_JSON_TREE_DEPTH = 48

function JsonNode({ value, keyName, depth }: { value: unknown; keyName?: string; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  const toggle = useCallback(() => setExpanded((e) => !e), [])

  if (depth >= MAX_JSON_TREE_DEPTH) {
    return (
      <span className="font-mono text-xs text-[var(--text-muted)]">
        {keyName !== undefined ? (
          <>
            <span className="text-[var(--accent)]">&quot;{keyName}&quot;</span>
            <span className="text-[var(--text-muted)]">: </span>
          </>
        ) : null}
        …
      </span>
    )
  }

  const keyPrefix =
    keyName !== undefined ? (
      <span className="text-[var(--accent)]">
        &quot;{keyName}&quot;
        <span className="text-[var(--text-muted)]">: </span>
      </span>
    ) : null

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className="font-mono text-xs">
          {keyPrefix}
          <span className="text-[var(--text-muted)]">[]</span>
        </div>
      )
    }
    const n = value.length
    const summary = `[ ${pluralRu(n, 'элемент', 'элемента', 'элементов')} ]`
    return (
      <div className="font-mono text-xs leading-relaxed">
        {keyPrefix}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-muted)] transition hover:bg-[var(--glass-highlight)] hover:text-[var(--text)]"
            title={expanded ? 'Свернуть' : 'Развернуть'}
          >
            <span className="text-[10px]">{expanded ? '▼' : '▶'}</span>
          </button>
          <div className="min-w-0 flex-1">
            {!expanded ? (
              <span className="text-[var(--text-muted)]">{summary}</span>
            ) : (
              <>
                <span className="text-[var(--text-muted)]">[</span>
                <div className="ml-1 border-l border-[var(--glass-border)] pl-3">
                  {value.map((item, i) => (
                    <div key={i} className="py-0.5">
                      <span className="text-[var(--text-muted)]">{i}: </span>
                      <JsonNode value={item} depth={depth + 1} />
                    </div>
                  ))}
                </div>
                <span className="text-[var(--text-muted)]">]</span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 0) {
      return (
        <div className="font-mono text-xs">
          {keyPrefix}
          <span className="text-[var(--text-muted)]">{'{}'}</span>
        </div>
      )
    }
    const n = keys.length
    const summary = `{ ${pluralRu(n, 'поле', 'поля', 'полей')} }`
    return (
      <div className="font-mono text-xs leading-relaxed">
        {keyPrefix}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-muted)] transition hover:bg-[var(--glass-highlight)] hover:text-[var(--text)]"
            title={expanded ? 'Свернуть' : 'Развернуть'}
          >
            <span className="text-[10px]">{expanded ? '▼' : '▶'}</span>
          </button>
          <div className="min-w-0 flex-1">
            {!expanded ? (
              <span className="text-[var(--text-muted)]">{summary}</span>
            ) : (
              <>
                <span className="text-[var(--text-muted)]">{'{'}</span>
                <div className="ml-1 border-l border-[var(--glass-border)] pl-3">
                  {keys.map((k) => (
                    <div key={k} className="py-0.5">
                      <JsonNode value={value[k]} keyName={k} depth={depth + 1} />
                    </div>
                  ))}
                </div>
                <span className="text-[var(--text-muted)]">{'}'}</span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <span className="inline font-mono text-xs">
      {keyPrefix}
      <JsonLeaf value={value} />
    </span>
  )
}

export function JsonTreeView({ json, className = '' }: Props) {
  const parsed = useMemo(() => {
    if (typeof json === 'string') {
      try {
        return JSON.parse(json) as unknown
      } catch {
        return null
      }
    }
    return json
  }, [json])

  if (parsed === null && typeof json === 'string') {
    return (
      <pre
        className={`glass max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl p-4 font-mono text-xs text-[var(--text)] ${className}`}
      >
        {json}
      </pre>
    )
  }

  return (
    <div className={`glass max-h-[min(70vh,560px)] overflow-auto rounded-2xl p-4 ${className}`}>
      <JsonNode value={parsed} depth={0} />
    </div>
  )
}
