import type { BodyPayloadMode, HeaderEntry, HttpMethod } from '../types'
import { createId } from './id'

const CT_KEY = 'content-type'

function findHeaderIndex(headers: HeaderEntry[], key: string): number {
  const k = key.toLowerCase()
  return headers.findIndex((h) => h.key.trim().toLowerCase() === k)
}

/** Добавляет Accept / Accept-Language, если пользователь их ещё не задавал */
export function mergeMissingStandardHeaders(headers: HeaderEntry[]): HeaderEntry[] {
  const defaults = createDefaultHeaderEntries()
  const keys = new Set(headers.map((h) => h.key.trim().toLowerCase()))
  const merged = [...headers]
  for (const row of defaults) {
    const k = row.key.trim().toLowerCase()
    if (!keys.has(k)) {
      merged.push({ ...row, id: createId() })
      keys.add(k)
    }
  }
  return merged
}

/** Стартовый набор заголовков для новых запросов */
export function createDefaultHeaderEntries(): HeaderEntry[] {
  return [
    {
      id: createId(),
      key: 'Accept',
      value: 'application/json, text/plain, */*',
      enabled: true,
    },
    {
      id: createId(),
      key: 'Accept-Language',
      value: 'ru-RU,ru;q=0.9,en;q=0.8',
      enabled: true,
    },
    {
      id: createId(),
      key: 'Content-Type',
      value: 'application/json; charset=utf-8',
      enabled: false,
    },
  ]
}

/**
 * Подстраивает Content-Type под метод и формат тела.
 * GET/без тела — Content-Type обычно не нужен (отключён).
 * Form Data — границу задаёт браузер, заголовок отключаем.
 */
export function syncHeadersForRequest(
  headers: HeaderEntry[],
  method: HttpMethod,
  bodyPayloadMode: BodyPayloadMode,
): HeaderEntry[] {
  const next = headers.map((h) => ({ ...h }))
  const methodsWithBody: HttpMethod[] = ['POST', 'PUT', 'PATCH', 'DELETE']
  const hasBody = methodsWithBody.includes(method) && bodyPayloadMode !== 'none'

  let ctValue = 'application/json; charset=utf-8'
  let ctEnabled = false

  if (hasBody) {
    ctEnabled = bodyPayloadMode !== 'formdata'
    if (bodyPayloadMode === 'json') ctValue = 'application/json; charset=utf-8'
    else if (bodyPayloadMode === 'urlencoded') {
      ctValue = 'application/x-www-form-urlencoded; charset=utf-8'
    } else if (bodyPayloadMode === 'text') {
      ctValue = 'text/plain; charset=utf-8'
    } else if (bodyPayloadMode === 'formdata') {
      ctEnabled = false
    }
  }

  let idx = findHeaderIndex(next, CT_KEY)
  if (idx < 0) {
    next.push({
      id: createId(),
      key: 'Content-Type',
      value: ctValue,
      enabled: ctEnabled,
    })
  } else {
    next[idx] = {
      ...next[idx],
      value: ctEnabled ? ctValue : next[idx].value || ctValue,
      enabled: ctEnabled,
    }
  }

  return next
}

/**
 * Итоговые заголовки: сначала выбранный сохранённый набор, затем заголовки конструктора
 * (перекрывают совпадающие имена).
 */
export function mergeHeadersForRequest(
  presetHeaders: HeaderEntry[] | undefined,
  draftHeaders: HeaderEntry[],
): HeaderEntry[] {
  const map = new Map<string, HeaderEntry>()
  const put = (h: HeaderEntry) => {
    const k = h.key.trim().toLowerCase()
    if (!k || !h.enabled) return
    map.set(k, { ...h, key: h.key.trim() })
  }
  for (const h of presetHeaders ?? []) put(h)
  for (const h of draftHeaders) put(h)
  return Array.from(map.values())
}
