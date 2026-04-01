import { useCallback, useEffect, useState } from 'react'
import type {
  BaseUrlEntry,
  Collection,
  DraftRequest,
  HeaderPreset,
} from '../types'
import * as storage from '../services/storage'

export interface AppData {
  collections: Collection[]
  baseUrls: BaseUrlEntry[]
  headerPresets: HeaderPreset[]
  draft: DraftRequest
}

export function useAppStorage() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => (prev ? updater(prev) : prev))
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [collections, baseUrls, headerPresets, draft] = await Promise.all([
        storage.loadCollections(),
        storage.loadBaseUrls(),
        storage.loadHeaderPresets(),
        storage.loadDraft(),
      ])
      setData({ collections, baseUrls, headerPresets, draft })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    data,
    error,
    loading: data === null && error === null,
    refresh,
    mutateData,
  }
}
