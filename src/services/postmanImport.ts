import type { BodyPayloadMode, HeaderEntry, HttpMethod, SavedRequest } from '../types'
import { HTTP_METHODS } from '../types'
import { createId } from '../utils/id'
import { tryParseJson } from '../utils/json'

/** Минимальная структура Postman Collection v2.x */
interface PostmanUrl {
  raw?: string
  host?: string[]
  path?: string[] | string
  protocol?: string
}

interface PostmanHeader {
  key?: string
  value?: string
  disabled?: boolean
}

interface PostmanFormPart {
  key?: string
  value?: string
  type?: string
  src?: string | string[]
  disabled?: boolean
}

interface PostmanBody {
  mode?: string
  raw?: string
  formdata?: PostmanFormPart[]
  urlencoded?: PostmanFormPart[]
  graphql?: { query?: string; variables?: string | Record<string, unknown> }
}

interface PostmanRequestObj {
  method?: string
  header?: PostmanHeader[]
  body?: PostmanBody
  url?: string | PostmanUrl
}

interface PostmanItem {
  name?: string
  item?: PostmanItem[]
  request?: PostmanRequestObj | string
}

interface PostmanCollectionRoot {
  info?: { name?: string; schema?: string }
  item?: PostmanItem[]
}

function isPostmanCollection(raw: unknown): raw is PostmanCollectionRoot {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return Array.isArray(o.item) && o.info != null && typeof o.info === 'object'
}

function normalizeMethod(m: string | undefined): HttpMethod {
  const u = (m ?? 'GET').toUpperCase()
  if (HTTP_METHODS.includes(u as HttpMethod)) return u as HttpMethod
  if (u === 'HEAD' || u === 'OPTIONS') return 'GET'
  return 'POST'
}

function urlFromPostman(u: string | PostmanUrl | undefined): string {
  if (!u) return ''
  if (typeof u === 'string') return u
  if (typeof u.raw === 'string' && u.raw.trim()) return u.raw
  const proto = u.protocol ? `${u.protocol}://` : ''
  const host = Array.isArray(u.host) ? u.host.join('.') : ''
  let path = ''
  if (Array.isArray(u.path)) path = u.path.map(String).join('/')
  else if (typeof u.path === 'string') path = u.path
  const joined = [host, path].filter(Boolean).join('/')
  return proto + joined || ''
}

function headersFromPostman(rows: PostmanHeader[] | undefined): HeaderEntry[] {
  if (!rows?.length) return []
  return rows
    .filter((h) => h.key && !h.disabled)
    .map((h) => ({
      id: createId(),
      key: String(h.key),
      value: String(h.value ?? ''),
      enabled: true,
    }))
}

function detectRawPayloadMode(raw: string): BodyPayloadMode {
  const t = raw.trim()
  if (!t) return 'none'
  const p = tryParseJson(t)
  return p.ok ? 'json' : 'text'
}

function bodyFromPostmanBody(body: PostmanBody | undefined): {
  body: string
  bodyPayloadMode: BodyPayloadMode
} {
  if (!body?.mode) return { body: '', bodyPayloadMode: 'none' }
  switch (body.mode) {
    case 'raw': {
      const raw = body.raw ?? ''
      return { body: raw, bodyPayloadMode: detectRawPayloadMode(raw) }
    }
    case 'formdata': {
      const pairs = body.formdata?.filter((f) => !f.disabled) ?? []
      const obj: Record<string, string> = {}
      for (const f of pairs) {
        const k = f.key ?? 'field'
        if (f.type === 'file') {
          const src = Array.isArray(f.src) ? f.src[0] : f.src
          obj[k] = src ? `[файл: ${src}]` : '[файл]'
        } else {
          obj[k] = f.value ?? ''
        }
      }
      return {
        body: JSON.stringify(obj, null, 2),
        bodyPayloadMode: 'formdata',
      }
    }
    case 'urlencoded': {
      const pairs = body.urlencoded?.filter((f) => !f.disabled) ?? []
      const obj: Record<string, string> = {}
      for (const f of pairs) {
        obj[f.key ?? 'field'] = f.value ?? ''
      }
      return {
        body: JSON.stringify(obj, null, 2),
        bodyPayloadMode: 'urlencoded',
      }
    }
    case 'graphql': {
      const q = body.graphql?.query ?? ''
      const vRaw = body.graphql?.variables
      let variables: unknown
      if (typeof vRaw === 'string') {
        const vs = vRaw.trim()
        if (vs) {
          const pv = tryParseJson(vs)
          variables = pv.ok ? pv.value : vs
        }
      } else if (vRaw != null && typeof vRaw === 'object') {
        variables = vRaw
      }
      const payload: Record<string, unknown> = { query: q }
      if (variables !== undefined) payload.variables = variables
      return { body: JSON.stringify(payload, null, 2), bodyPayloadMode: 'json' }
    }
    default:
      return { body: '', bodyPayloadMode: 'none' }
  }
}

function requestToSaved(
  namePath: string[],
  req: PostmanRequestObj,
): SavedRequest {
  const method = normalizeMethod(req.method)
  const url = urlFromPostman(req.url)
  const headers = headersFromPostman(req.header)
  const { body, bodyPayloadMode } = bodyFromPostmanBody(req.body)

  return {
    id: createId(),
    name: namePath.filter(Boolean).join(' / ') || 'Запрос',
    method,
    url,
    headers,
    body,
    bodyPayloadMode,
  }
}

const MAX_POSTMAN_FOLDER_DEPTH = 64

function walkItems(items: PostmanItem[], prefix: string[], depth: number): SavedRequest[] {
  if (depth > MAX_POSTMAN_FOLDER_DEPTH) return []
  const out: SavedRequest[] = []
  for (const it of items) {
    const label = it.name ?? ''
    const nextPrefix = [...prefix, label].filter(Boolean)
    if (Array.isArray(it.item) && it.item.length > 0) {
      out.push(...walkItems(it.item, nextPrefix, depth + 1))
    } else if (it.request && typeof it.request === 'object') {
      out.push(requestToSaved(nextPrefix, it.request))
    }
  }
  return out
}

export function parsePostmanCollection(text: string):
  | { ok: true; name: string; requests: SavedRequest[] }
  | { ok: false; error: string } {
  try {
    const raw = JSON.parse(text) as unknown
    if (!isPostmanCollection(raw)) {
      return { ok: false, error: 'Не похоже на коллекцию Postman (v2)' }
    }
    const name = raw.info?.name?.trim() || 'Импорт Postman'
    const items = raw.item ?? []
    const requests = walkItems(items, [], 0)
    if (requests.length === 0) {
      return { ok: false, error: 'В файле нет запросов' }
    }
    return { ok: true, name, requests }
  } catch {
    return { ok: false, error: 'Не удалось разобрать JSON' }
  }
}
