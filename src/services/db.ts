/**
 * Low-level IndexedDB wrapper: single connection, typed get/put/delete per store.
 */

const DB_NAME = 'local-http-client'
const DB_VERSION = 2

export const STORES = {
  collections: 'collections',
  baseUrls: 'baseUrls',
  /** @deprecated миграция в headerPresets */
  authTokens: 'authTokens',
  headerPresets: 'headerPresets',
  kv: 'kv',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORES.collections)) {
        db.createObjectStore(STORES.collections, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.baseUrls)) {
        db.createObjectStore(STORES.baseUrls, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.authTokens)) {
        db.createObjectStore(STORES.authTokens, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.headerPresets)) {
        db.createObjectStore(STORES.headerPresets, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.kv)) {
        db.createObjectStore(STORES.kv)
      }
    }
  })
}

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((e) => {
      dbPromise = null
      return Promise.reject(e)
    })
  }
  return dbPromise
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const os = tx.objectStore(store)
    const req = os.getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve((req.result as T[]) ?? [])
  })
}

export async function getOne<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result as T | undefined)
  })
}

export async function put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(value)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

export async function remove(store: StoreName, id: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

const KV_KEYS = {
  settings: 'settings',
  draft: 'draft',
} as const

export async function getKv<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.kv, 'readonly')
    const req = tx.objectStore(STORES.kv).get(key)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result as T | undefined)
  })
}

export async function setKv(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.kv, 'readwrite')
    const req = tx.objectStore(STORES.kv).put(value, key)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

export { KV_KEYS }
