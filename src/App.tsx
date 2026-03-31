import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { CollectionsSidebar } from './components/CollectionsSidebar'
import { RequestBuilder } from './components/RequestBuilder'
import { ResponseViewer } from './components/ResponseViewer'
import { ThemeToggle } from './components/ThemeToggle'
import { useAppStorage } from './hooks/useAppStorage'
import { useDebouncedCallback } from './hooks/useDebouncedCallback'
import { useTheme } from './hooks/useTheme'
import { executeRequest, type HttpResult } from './services/http'
import * as storage from './services/storage'
import type { Collection, DraftRequest, HeaderEntry, HeaderPreset, SavedRequest } from './types'
import {
  createDefaultHeaderEntries,
  mergeHeadersForRequest,
  syncHeadersForRequest,
} from './utils/headers'
import { createId } from './utils/id'
import { tryParseJson } from './utils/json'
import { normalizeUserBaseUrl } from './utils/url'

function buildDraftFromSaved(r: SavedRequest): DraftRequest {
  const mode = r.bodyPayloadMode ?? 'json'
  const rawHeaders =
    r.headers.length > 0
      ? r.headers.map((h) => ({ ...h, id: h.id || createId() }))
      : createDefaultHeaderEntries()
  return {
    method: r.method,
    url: r.url,
    headers: syncHeadersForRequest(rawHeaders, r.method, mode),
    body: r.body,
    bodyPayloadMode: mode,
    selectedBaseUrlId: null,
    selectedHeaderPresetId: null,
    selectedCollectionId: null,
  }
}

function validateBeforeSend(draft: DraftRequest): string | null {
  const mode = draft.bodyPayloadMode ?? 'json'
  if (draft.method === 'GET' || mode === 'none') return null
  const raw = draft.body.trim()
  if (!raw) return null
  if (mode === 'json') {
    const p = tryParseJson(raw)
    return p.ok ? null : p.error
  }
  if (mode === 'formdata' || mode === 'urlencoded') {
    const p = tryParseJson(raw)
    if (!p.ok) return p.error
    if (p.value === null || typeof p.value !== 'object' || Array.isArray(p.value)) {
      return 'Нужен JSON-объект с полями формы'
    }
    return null
  }
  return null
}

export default function App() {
  const { data, error, loading, refresh } = useAppStorage()
  const { theme, toggle, ready: themeReady } = useTheme()
  const [draft, setDraft] = useState<DraftRequest>(() => storage.getDefaultDraft())
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [response, setResponse] = useState<HttpResult | null>(null)
  const [sending, setSending] = useState(false)
  const [sendJsonError, setSendJsonError] = useState<string | null>(null)

  /** Синхронно до отрисовки: один раз подставляем черновик из IndexedDB после появления data (Strict Mode — state сбрасывается, флаг тоже). */
  useLayoutEffect(() => {
    if (!data) return
    if (draftHydrated) return
    setDraft(data.draft ?? storage.getDefaultDraft())
    setDraftHydrated(true)
  }, [data, draftHydrated])

  const debouncedPersist = useDebouncedCallback(async (d: DraftRequest) => {
    await storage.saveDraft(d)
  }, 450)

  const updateDraft = useCallback(
    (next: DraftRequest | ((prev: DraftRequest) => DraftRequest)) => {
      setDraft((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        debouncedPersist(resolved)
        return resolved
      })
    },
    [debouncedPersist],
  )

  const setDraftAndPersist = useCallback((next: DraftRequest) => {
    setDraft(next)
    void storage.saveDraft(next)
  }, [])

  const baseUrlString = useMemo(() => {
    if (!data || !draft.selectedBaseUrlId) return null
    const b = data.baseUrls.find((x) => x.id === draft.selectedBaseUrlId)
    return b?.url ?? null
  }, [data, draft.selectedBaseUrlId])

  const presetHeadersForMerge = useMemo(() => {
    if (!data || !draft.selectedHeaderPresetId) return undefined
    return data.headerPresets.find((p) => p.id === draft.selectedHeaderPresetId)?.headers
  }, [data, draft.selectedHeaderPresetId])

  const effectiveHeadersPreview = useMemo(
    () => mergeHeadersForRequest(presetHeadersForMerge, draft.headers),
    [presetHeadersForMerge, draft],
  )

  const handleSend = useCallback(async () => {
    const err = validateBeforeSend(draft)
    if (err) {
      setSendJsonError(err)
      return
    }
    setSendJsonError(null)
    setSending(true)
    setResponse(null)
    let presetHeaders: HeaderEntry[] | undefined
    if (draft.selectedHeaderPresetId) {
      const presets = await storage.loadHeaderPresets()
      presetHeaders = presets.find((p) => p.id === draft.selectedHeaderPresetId)?.headers
    }
    const mergedHeaders = mergeHeadersForRequest(presetHeaders, draft.headers)
    const result = await executeRequest({
      method: draft.method,
      urlInput: draft.url,
      baseUrl: baseUrlString,
      headers: mergedHeaders,
      body: draft.body,
      bodyPayloadMode: draft.bodyPayloadMode ?? 'json',
    })
    setResponse(result)
    setSending(false)
  }, [draft, baseUrlString])

  const handleNewCollection = useCallback(async () => {
    const name = window.prompt('Название коллекции')
    if (!name?.trim()) return
    const col: Collection = {
      id: createId(),
      name: name.trim(),
      requests: [],
      updatedAt: Date.now(),
    }
    await storage.saveCollection(col)
    await refresh()
    updateDraft((d) => ({ ...d, selectedCollectionId: col.id }))
  }, [refresh, updateDraft])

  const handleSaveRequestToCollection = useCallback(
    async (collectionId: string) => {
      const name =
        window.prompt('Имя запроса', draft.url.slice(0, 40) || 'Запрос')?.trim() ?? ''
      if (!name) return
      const collections = await storage.loadCollections()
      const col = collections.find((c) => c.id === collectionId)
      if (!col) return
      const saved: SavedRequest = {
        id: createId(),
        name,
        method: draft.method,
        url: draft.url,
        headers: draft.headers.map(({ id, key, value, enabled }) => ({
          id,
          key,
          value,
          enabled,
        })),
        body: draft.body,
        bodyPayloadMode: draft.bodyPayloadMode,
      }
      col.requests.push(saved)
      col.updatedAt = Date.now()
      await storage.saveCollection(col)
      await refresh()
    },
    [draft, refresh],
  )

  const handleSelectRequest = useCallback(
    (collectionId: string, requestId: string) => {
      if (!data) return
      const col = data.collections.find((c) => c.id === collectionId)
      const r = col?.requests.find((x) => x.id === requestId)
      if (!r) return
      const next = buildDraftFromSaved(r)
      next.selectedCollectionId = collectionId
      next.selectedBaseUrlId = draft.selectedBaseUrlId ?? null
      next.selectedHeaderPresetId = draft.selectedHeaderPresetId ?? null
      setDraftAndPersist(next)
    },
    [data, draft.selectedHeaderPresetId, draft.selectedBaseUrlId, setDraftAndPersist],
  )

  const handleExport = useCallback(async () => {
    const collections = await storage.loadCollections()
    const payload = storage.serializeCollectionsForExport(collections)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `collections-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [])

  const handleImportFile = useCallback(
    async (file: File) => {
      const text = await file.text()
      const result = await storage.importCollectionFile(text)
      if (!result.ok) {
        window.alert(result.error)
        return
      }
      window.alert(
        result.importedCount === 1
          ? 'Импортирована 1 коллекция.'
          : `Импортировано коллекций: ${result.importedCount}.`,
      )
      await refresh()
    },
    [refresh],
  )

  const handleAddBaseUrl = useCallback(
    async (name: string, url: string) => {
      let normalized: string
      try {
        normalized = normalizeUserBaseUrl(url)
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Некорректный URL')
        return
      }
      const id = createId()
      await storage.saveBaseUrl({ id, name, url: normalized })
      await refresh()
      updateDraft((d) => ({ ...d, selectedBaseUrlId: id }))
    },
    [refresh, updateDraft],
  )

  const handleRemoveBaseUrl = useCallback(
    async (id: string) => {
      await storage.deleteBaseUrl(id)
      if (draft.selectedBaseUrlId === id) {
        updateDraft((d) => ({ ...d, selectedBaseUrlId: null }))
      }
      await refresh()
    },
    [draft.selectedBaseUrlId, refresh, updateDraft],
  )

  const debouncedSaveHeaderPreset = useDebouncedCallback(
    async (payload: { id: string; headers: HeaderEntry[] }) => {
      const presets = await storage.loadHeaderPresets()
      const p = presets.find((x) => x.id === payload.id)
      if (!p) return
      p.headers = payload.headers
      await storage.saveHeaderPreset(p)
      await refresh()
    },
    450,
  )

  const handleUpdateHeaderPresetHeaders = useCallback(
    (id: string, headers: HeaderEntry[]) => {
      debouncedSaveHeaderPreset({ id, headers })
    },
    [debouncedSaveHeaderPreset],
  )

  const handleAddHeaderPreset = useCallback(
    async (name: string) => {
      const preset: HeaderPreset = {
        id: createId(),
        name,
        headers: [],
      }
      await storage.saveHeaderPreset(preset)
      await refresh()
      updateDraft((d) => ({ ...d, selectedHeaderPresetId: preset.id }))
    },
    [refresh, updateDraft],
  )

  const handleRemoveHeaderPreset = useCallback(
    async (id: string) => {
      await storage.deleteHeaderPreset(id)
      if (draft.selectedHeaderPresetId === id) {
        updateDraft((d) => ({ ...d, selectedHeaderPresetId: null }))
      }
      await refresh()
    },
    [draft.selectedHeaderPresetId, refresh, updateDraft],
  )

  const handleDeleteCollection = useCallback(
    async (id: string) => {
      if (!window.confirm('Удалить эту коллекцию?')) return
      await storage.deleteCollection(id)
      if (draft.selectedCollectionId === id) {
        updateDraft((d) => ({ ...d, selectedCollectionId: null }))
      }
      await refresh()
    },
    [draft.selectedCollectionId, refresh, updateDraft],
  )

  if (error) {
    return (
      <div className="app-noise relative flex min-h-screen items-center justify-center text-[var(--danger)]">
        {error}
      </div>
    )
  }

  if (loading || !themeReady || (data && !draftHydrated)) {
    return (
      <div className="app-noise relative flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Загрузка…
      </div>
    )
  }

  return (
    <div className="app-noise relative z-10 flex min-h-screen flex-col">
      <header className="glass relative z-10 flex shrink-0 items-center justify-between border-b border-[var(--glass-border)] px-5 py-3">
        <h1 className="text-base font-semibold tracking-tight text-[var(--text)]">
          Локальный HTTP-клиент
        </h1>
        <ThemeToggle dark={theme === 'dark'} onToggle={() => void toggle()} />
      </header>
      <div className="flex min-h-0 flex-1 gap-0 p-3 md:p-4">
        <CollectionsSidebar
          collections={data?.collections ?? []}
          baseUrls={data?.baseUrls ?? []}
          headerPresets={data?.headerPresets ?? []}
          selectedCollectionId={draft.selectedCollectionId}
          selectedBaseUrlId={draft.selectedBaseUrlId}
          selectedHeaderPresetId={draft.selectedHeaderPresetId}
          onSelectCollection={(id) => updateDraft((d) => ({ ...d, selectedCollectionId: id }))}
          onSelectRequest={handleSelectRequest}
          onNewCollection={() => void handleNewCollection()}
          onSaveRequestToCollection={(cid) => void handleSaveRequestToCollection(cid)}
          onDeleteCollection={(id) => void handleDeleteCollection(id)}
          onExport={() => void handleExport()}
          onImportFile={(f) => void handleImportFile(f)}
          onAddBaseUrl={handleAddBaseUrl}
          onRemoveBaseUrl={(id) => void handleRemoveBaseUrl(id)}
          onBaseUrlChange={(id) => updateDraft((d) => ({ ...d, selectedBaseUrlId: id }))}
          onSelectHeaderPreset={(id) => updateDraft((d) => ({ ...d, selectedHeaderPresetId: id }))}
          onUpdateHeaderPresetHeaders={handleUpdateHeaderPresetHeaders}
          onAddHeaderPreset={(name) => void handleAddHeaderPreset(name)}
          onRemoveHeaderPreset={(id) => void handleRemoveHeaderPreset(id)}
        />
        <main className="relative z-10 min-w-0 flex-1 overflow-y-auto rounded-3xl">
          <div className="mx-auto max-w-5xl space-y-6 px-2 pb-8 pt-2 md:px-4">
            <RequestBuilder
              draft={draft}
              onChange={updateDraft}
              onSend={() => void handleSend()}
              sending={sending}
              jsonError={sendJsonError}
              effectiveHeaders={effectiveHeadersPreview}
            />
            <section>
              <h2 className="mb-3 text-sm font-semibold tracking-tight text-[var(--text)]">Ответ</h2>
              <ResponseViewer result={response} loading={sending} />
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
