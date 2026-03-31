export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/** Как интерпретировать поле body при отправке */
export type BodyPayloadMode = 'json' | 'formdata' | 'urlencoded' | 'text' | 'none'

export interface HeaderEntry {
  id: string
  key: string
  value: string
  enabled: boolean
}

export interface SavedRequest {
  id: string
  name: string
  method: HttpMethod
  /** Полный URL или путь (с базовым URL при отправке) */
  url: string
  headers: HeaderEntry[]
  body: string
  bodyPayloadMode?: BodyPayloadMode
}

export interface Collection {
  id: string
  name: string
  requests: SavedRequest[]
  updatedAt: number
}

export interface BaseUrlEntry {
  id: string
  name: string
  url: string
}

/**
 * Сохранённый набор заголовков (как в конструкторе), без привязки к коллекции.
 * Можно завести несколько — например «Bitrix», «Публичный API» — и переключать один раз.
 */
export interface HeaderPreset {
  id: string
  name: string
  headers: HeaderEntry[]
}

export interface DraftRequest {
  method: HttpMethod
  url: string
  headers: HeaderEntry[]
  body: string
  bodyPayloadMode: BodyPayloadMode
  selectedBaseUrlId: string | null
  /** Какой набор заголовков подмешивать ко всем запросам */
  selectedHeaderPresetId: string | null
  selectedCollectionId: string | null
}

export interface AppSettings {
  theme: 'light' | 'dark'
}

export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
]

export const BODY_PAYLOAD_MODES: { value: BodyPayloadMode; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'formdata', label: 'Form Data (ключи из JSON-объекта)' },
  { value: 'urlencoded', label: 'x-www-form-urlencoded (JSON → поля)' },
  { value: 'text', label: 'Текст (как есть)' },
  { value: 'none', label: 'Без тела' },
]
