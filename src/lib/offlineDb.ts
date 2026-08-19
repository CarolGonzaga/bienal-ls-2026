const DB_NAME = 'mapasafico-offline-v1'
const DB_VERSION = 1

export type OfflineDatasetKey = 'exhibitors' | 'books' | 'schedule' | 'authors' | 'passport' | 'passport_codes'
export type OfflineDataset<T = unknown> = { key: OfflineDatasetKey; version: number; updatedAt: string; data: T }

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains('datasets')) db.createObjectStore('datasets', { keyPath: 'key' })
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
    if (!db.objectStoreNames.contains('personal')) db.createObjectStore('personal', { keyPath: 'key' })
    if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { keyPath: 'id' })
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

export const getOfflineDataset = async <T>(key: OfflineDatasetKey): Promise<OfflineDataset<T> | null> => {
  if (!('indexedDB' in window)) return null
  const db = await openDatabase()
  try { return (await requestResult(db.transaction('datasets').objectStore('datasets').get(key))) || null }
  finally { db.close() }
}

export const putOfflineDataset = async <T>(dataset: OfflineDataset<T>) => {
  const db = await openDatabase()
  try { await requestResult(db.transaction('datasets', 'readwrite').objectStore('datasets').put(dataset)) }
  finally { db.close() }
}

export const getOfflineMeta = async <T>(key: string): Promise<T | null> => {
  if (!('indexedDB' in window)) return null
  const db = await openDatabase()
  try { return (await requestResult<any>(db.transaction('meta').objectStore('meta').get(key)))?.value ?? null }
  finally { db.close() }
}

export const putOfflineMeta = async (key: string, value: unknown) => {
  const db = await openDatabase()
  try { await requestResult(db.transaction('meta', 'readwrite').objectStore('meta').put({ key, value })) }
  finally { db.close() }
}

export const putPersonalOfflineData = async (userId: string, type: string, value: unknown) => {
  const db = await openDatabase()
  try { await requestResult(db.transaction('personal', 'readwrite').objectStore('personal').put({ key: `${userId}:${type}`, userId, type, value, updatedAt: new Date().toISOString() })) }
  finally { db.close() }
}

export const getPersonalOfflineData = async <T>(userId: string, type: string): Promise<T | null> => {
  if (!('indexedDB' in window)) return null
  const db = await openDatabase()
  try { return (await requestResult<any>(db.transaction('personal').objectStore('personal').get(`${userId}:${type}`)))?.value ?? null }
  finally { db.close() }
}

export const clearPersonalOfflineData = async (userId: string) => {
  if (!('indexedDB' in window)) return
  const db = await openDatabase()
  try {
    for (const storeName of ['personal', 'syncQueue']) {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const cursorRequest = store.openCursor()
      await new Promise<void>((resolve, reject) => {
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result
          if (!cursor) return resolve()
          if (cursor.value.userId === userId || String(cursor.key).startsWith(`${userId}:`)) cursor.delete()
          cursor.continue()
        }
        cursorRequest.onerror = () => reject(cursorRequest.error)
      })
    }
  } finally { db.close() }
}

export const enqueueOfflineMutation = async (item: { id: string; userId: string; type: string; payload: unknown; createdAt: string; attempts?: number; lastError?: string }) => {
  const db = await openDatabase()
  try { await requestResult(db.transaction('syncQueue', 'readwrite').objectStore('syncQueue').put({ ...item, attempts: item.attempts || 0 })) }
  finally { db.close() }
}

export const listOfflineMutations = async <T = any>(userId: string): Promise<T[]> => {
  if (!('indexedDB' in window)) return []
  const db = await openDatabase()
  try {
    const all = await requestResult<any[]>(db.transaction('syncQueue').objectStore('syncQueue').getAll())
    return all.filter(item => item.userId === userId)
  } finally { db.close() }
}

export const removeOfflineMutation = async (id: string) => {
  const db = await openDatabase()
  try { await requestResult(db.transaction('syncQueue', 'readwrite').objectStore('syncQueue').delete(id)) }
  finally { db.close() }
}
