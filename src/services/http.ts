import type { BodyPayloadMode, HeaderEntry, HttpMethod } from '../types'
import { tryParseJson } from '../utils/json'
import { resolveRequestUrl } from '../utils/url'

export interface ExecuteRequestInput {
  method: HttpMethod
  urlInput: string
  baseUrl: string | null
  headers: HeaderEntry[]
  body: string
  bodyPayloadMode: BodyPayloadMode
}

export interface HttpResult {
  status: number
  statusText: string
  responseHeaders: { key: string; value: string }[]
  bodyText: string
  bodyFormatted: string | null
  error?: string
  /** Тело обрезано для отображения (слишком большой ответ). */
  bodyTruncated?: boolean
}

/** Защита от зависания UI на очень больших ответах (символы, не байты). */
const MAX_RESPONSE_BODY_CHARS = 2_000_000

function stripHeaderInjection(s: string): string {
  return s.replace(/[\r\n]/g, '')
}

function headersToInit(rows: HeaderEntry[]): Headers {
  const h = new Headers()
  for (const row of rows) {
    if (!row.enabled) continue
    const key = stripHeaderInjection(row.key).trim()
    if (!key) continue
    try {
      h.set(key, stripHeaderInjection(row.value))
    } catch {
      // недопустимое имя/значение для Fetch — пропускаем строку
    }
  }
  return h
}

function stripContentType(h: Headers): void {
  h.delete('Content-Type')
}

function buildBodyForFetch(
  mode: BodyPayloadMode,
  raw: string,
  headers: Headers,
): { body: BodyInit | undefined; error?: string } {
  const trimmed = raw.trim()
  if (mode === 'none' || !trimmed) {
    return { body: undefined }
  }

  if (mode === 'text') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'text/plain; charset=utf-8')
    }
    return { body: raw }
  }

  if (mode === 'json') {
    const parsed = tryParseJson(trimmed)
    if (!parsed.ok) {
      return { body: undefined, error: `Тело не JSON: ${parsed.error}` }
    }
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json; charset=utf-8')
    }
    return { body: trimmed }
  }

  if (mode === 'formdata') {
    const parsed = tryParseJson(trimmed)
    if (!parsed.ok || parsed.value === null || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
      return {
        body: undefined,
        error: 'Для Form Data нужен JSON-объект с полями, например {"login":"x","password":"y"}',
      }
    }
    stripContentType(headers)
    const fd = new FormData()
    for (const [k, v] of Object.entries(parsed.value as Record<string, unknown>)) {
      fd.append(k, v === null || v === undefined ? '' : String(v))
    }
    return { body: fd }
  }

  if (mode === 'urlencoded') {
    const parsed = tryParseJson(trimmed)
    if (!parsed.ok || parsed.value === null || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
      return {
        body: undefined,
        error: 'Для urlencoded нужен JSON-объект с полями',
      }
    }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(parsed.value as Record<string, unknown>)) {
      params.append(k, v === null || v === undefined ? '' : String(v))
    }
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8')
    }
    return { body: params.toString() }
  }

  return { body: undefined }
}

export async function executeRequest(input: ExecuteRequestInput): Promise<HttpResult> {
  let url: string
  try {
    url = resolveRequestUrl(input.baseUrl, input.urlInput)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      status: 0,
      statusText: '',
      responseHeaders: [],
      bodyText: '',
      bodyFormatted: null,
      error: msg,
    }
  }
  const headers = headersToInit(input.headers)

  let bodyInit: BodyInit | undefined
  const mode = input.bodyPayloadMode ?? 'json'

  if (input.method !== 'GET') {
    const built = buildBodyForFetch(mode, input.body, headers)
    if (built.error) {
      return {
        status: 0,
        statusText: '',
        responseHeaders: [],
        bodyText: '',
        bodyFormatted: null,
        error: built.error,
      }
    }
    bodyInit = built.body
  }

  try {
    const res = await fetch(url, {
      method: input.method,
      headers,
      body: bodyInit,
    })

    const responseHeaders: { key: string; value: string }[] = []
    res.headers.forEach((value, key) => {
      responseHeaders.push({ key, value })
    })

    let bodyText = await res.text()
    let bodyTruncated = false
    if (bodyText.length > MAX_RESPONSE_BODY_CHARS) {
      bodyText = bodyText.slice(0, MAX_RESPONSE_BODY_CHARS)
      bodyTruncated = true
    }

    let bodyFormatted: string | null = null
    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('application/json') || bodyText.trim().startsWith('{') || bodyText.trim().startsWith('[')) {
      const p = tryParseJson(bodyText)
      if (p.ok && p.value !== null) {
        bodyFormatted = JSON.stringify(p.value, null, 2)
      }
    }

    return {
      status: res.status,
      statusText: res.statusText,
      responseHeaders,
      bodyText,
      bodyFormatted: bodyFormatted ?? bodyText,
      bodyTruncated,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      status: 0,
      statusText: '',
      responseHeaders: [],
      bodyText: '',
      bodyFormatted: null,
      error: msg,
    }
  }
}
