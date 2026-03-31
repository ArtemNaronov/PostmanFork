import type {
  AppSettings,
  BaseUrlEntry,
  BodyPayloadMode,
  Collection,
  DraftRequest,
  HeaderPreset,
} from '../types'
import { HTTP_METHODS } from '../types'
import {
  createDefaultHeaderEntries,
  mergeMissingStandardHeaders,
  syncHeadersForRequest,
} from '../utils/headers'
import { createId } from '../utils/id'
import * as db from './db'
import { parsePostmanCollection } from './postmanImport'

/** Старый формат до HeaderPreset */
type LegacyAuthToken = { id: string; name: string; token: string }

const defaultDraft = (): DraftRequest => ({
  method: 'GET',
  url: '',
  headers: createDefaultHeaderEntries(),
  body: '',
  bodyPayloadMode: 'json',
  selectedBaseUrlId: null,
  selectedHeaderPresetId: null,
  selectedCollectionId: null,
})

/** Начальное состояние черновика до гидратации из IndexedDB (и fallback в loadDraft). */
export function getDefaultDraft(): DraftRequest {
  return defaultDraft()
}

const defaultSettings = (): AppSettings => ({ theme: 'light' })

function normalizeBodyMode(m: unknown): BodyPayloadMode {
  const allowed: BodyPayloadMode[] = ['json', 'formdata', 'urlencoded', 'text', 'none']
  return typeof m === 'string' && allowed.includes(m as BodyPayloadMode)
    ? (m as BodyPayloadMode)
    : 'json'
}

function migrateDraftShape(d: DraftRequest): void {
  const any = d as DraftRequest & { selectedAuthTokenId?: string | null }
  if (any.selectedAuthTokenId != null && d.selectedHeaderPresetId == null) {
    d.selectedHeaderPresetId = any.selectedAuthTokenId
  }
  delete any.selectedAuthTokenId
  if (d.selectedHeaderPresetId === undefined) d.selectedHeaderPresetId = null
}

export async function loadCollections(): Promise<Collection[]> {
  return db.getAll<Collection>(db.STORES.collections)
}

export async function saveCollection(c: Collection): Promise<void> {
  const { authHeaders: _a, ...rest } = c as Collection & { authHeaders?: unknown }
  await db.put(db.STORES.collections, { ...rest, updatedAt: Date.now() })
}

export async function deleteCollection(id: string): Promise<void> {
  await db.remove(db.STORES.collections, id)
}

export async function loadBaseUrls(): Promise<BaseUrlEntry[]> {
  return db.getAll<BaseUrlEntry>(db.STORES.baseUrls)
}

export async function saveBaseUrl(entry: BaseUrlEntry): Promise<void> {
  await db.put(db.STORES.baseUrls, entry)
}

export async function deleteBaseUrl(id: string): Promise<void> {
  await db.remove(db.STORES.baseUrls, id)
}

/**
 * Наборы сохранённых заголовков. При первом запуске мигрирует старые «токены» в один заголовок Authorization.
 */
export async function loadHeaderPresets(): Promise<HeaderPreset[]> {
  const presets = await db.getAll<HeaderPreset>(db.STORES.headerPresets)
  if (presets.length > 0) return presets

  const legacy = await db.getAll<LegacyAuthToken>(db.STORES.authTokens)
  if (legacy.length === 0) return []

  for (const t of legacy) {
    const preset: HeaderPreset = {
      id: t.id,
      name: t.name,
      headers: [
        {
          id: createId(),
          key: 'Authorization',
          value: `Bearer ${t.token}`,
          enabled: true,
        },
      ],
    }
    await db.put(db.STORES.headerPresets, preset)
  }
  return db.getAll<HeaderPreset>(db.STORES.headerPresets)
}

export async function saveHeaderPreset(preset: HeaderPreset): Promise<void> {
  await db.put(db.STORES.headerPresets, preset)
}

export async function deleteHeaderPreset(id: string): Promise<void> {
  await db.remove(db.STORES.headerPresets, id)
}

export async function loadSettings(): Promise<AppSettings> {
  const s = await db.getKv<AppSettings>(db.KV_KEYS.settings)
  return s ?? defaultSettings()
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await db.setKv(db.KV_KEYS.settings, s)
}

export async function loadDraft(): Promise<DraftRequest> {
  const d = await db.getKv<DraftRequest>(db.KV_KEYS.draft)
  if (!d) return getDefaultDraft()
  migrateDraftShape(d)
  if (!HTTP_METHODS.includes(d.method)) d.method = 'GET'
  if (!Array.isArray(d.headers) || d.headers.length === 0) {
    d.headers = createDefaultHeaderEntries()
  } else {
    d.headers = mergeMissingStandardHeaders(d.headers)
  }
  d.bodyPayloadMode = normalizeBodyMode(d.bodyPayloadMode)
  d.headers = syncHeadersForRequest(d.headers, d.method, d.bodyPayloadMode)
  return d
}

export async function saveDraft(draft: DraftRequest): Promise<void> {
  await db.setKv(db.KV_KEYS.draft, draft)
}

/** Экспорт в наш формат */
export interface CollectionsExportFile {
  version: 1
  exportedAt: string
  collections: Omit<Collection, 'updatedAt'>[]
}

export function serializeCollectionsForExport(
  collections: Collection[],
): CollectionsExportFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: collections.map(({ updatedAt: _u, ...rest }) => rest),
  }
}

export function parseCollectionsImport(
  text: string,
): { ok: true; data: CollectionsExportFile } | { ok: false; error: string } {
  try {
    const raw = JSON.parse(text) as unknown
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'Неверный файл' }
    const o = raw as Record<string, unknown>
    if (o.version !== 1) return { ok: false, error: 'Неподдерживаемая версия экспорта' }
    if (!Array.isArray(o.collections)) return { ok: false, error: 'Нет коллекций в файле' }
    return { ok: true, data: o as unknown as CollectionsExportFile }
  } catch {
    return { ok: false, error: 'Не удалось разобрать JSON' }
  }
}

/** Импорт коллекций из нашего JSON */
export async function importCollectionsFromFile(
  data: CollectionsExportFile,
): Promise<Collection[]> {
  const created: Collection[] = []
  for (const c of data.collections) {
    const col: Collection = {
      id: createId(),
      name: c.name || 'Импорт',
      requests: (c.requests ?? []).map((r) => ({
        ...r,
        id: createId(),
        bodyPayloadMode: r.bodyPayloadMode ?? 'json',
        headers: (r.headers ?? []).map((h) => ({
          ...h,
          id: createId(),
        })),
      })),
      updatedAt: Date.now(),
    }
    await saveCollection(col)
    created.push(col)
  }
  return created
}

/** Защита от OOM при разборе гигантских JSON в памяти. */
const MAX_COLLECTION_IMPORT_CHARS = 25 * 1024 * 1024

/**
 * Универсальный импорт: сначала наш формат, затем Postman Collection v2.x.
 */
export async function importCollectionFile(
  text: string,
): Promise<{ ok: true; importedCount: number } | { ok: false; error: string }> {
  if (text.length > MAX_COLLECTION_IMPORT_CHARS) {
    return { ok: false, error: 'Файл слишком большой (максимум ~25 МБ).' }
  }
  const own = parseCollectionsImport(text)
  if (own.ok) {
    const list = await importCollectionsFromFile(own.data)
    return { ok: true, importedCount: list.length }
  }

  const pm = parsePostmanCollection(text)
  if (pm.ok) {
    const col: Collection = {
      id: createId(),
      name: pm.name,
      requests: pm.requests,
      updatedAt: Date.now(),
    }
    await saveCollection(col)
    return { ok: true, importedCount: 1 }
  }

  return { ok: false, error: pm.error || own.error }
}
