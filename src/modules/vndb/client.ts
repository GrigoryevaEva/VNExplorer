import type { VisualNovelCard, VndbQuery, VndbResponse } from './types'
import { cacheLifetime, queryKey, readResponse, writeResponse } from './cache'

export const VNDB_API = 'https://api.vndb.org/kana'
export const CARD_FIELDS = 'title,released,rating,image{url,thumbnail,dims}'

export class VndbError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'VndbError'
    this.status = status
  }
}
export function isTemporaryVndbError(error: unknown): boolean {
  return error instanceof VndbError && (error.status === undefined || error.status === 429 || error.status >= 500)
}

export interface QueryOptions { signal?: AbortSignal; onStale?: () => void }
const pending = new Map<string, Promise<VndbResponse<unknown>>>()

export async function queryVndb<T>(endpoint: 'vn' | 'release' | 'tag', query: VndbQuery, options: QueryOptions = {}): Promise<VndbResponse<T>> {
  if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError')
  const key = queryKey(endpoint, query)
  let shared = pending.get(key)
  if (!shared) {
    shared = cachedQuery(endpoint, query, key).finally(() => { pending.delete(key) })
    pending.set(key, shared)
  }
  const data = await forConsumer(shared, options.signal) as VndbResponse<T>
  if (data.stale) options.onStale?.()
  return data
}

// A departing screen cancels only its subscription. The shared request can still
// serve another screen (or a return to the same selection) and fill the cache.
function forConsumer<T>(shared: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return shared
  return new Promise((resolve, reject) => {
    const abort = () => { reject(new DOMException('Request cancelled', 'AbortError')) }
    signal.addEventListener('abort', abort, { once: true })
    shared.then(value => { signal.removeEventListener('abort', abort); if (!signal.aborted) resolve(value) }, error => { signal.removeEventListener('abort', abort); if (!signal.aborted) reject(error) })
    if (signal.aborted) abort()
  })
}

async function cachedQuery(endpoint: string, query: VndbQuery, key: string): Promise<VndbResponse<unknown>> {
  const cached = await readResponse(key)
  const age = cached ? Date.now() - cached.fetchedAt : -1
  if (cached && age >= 0 && age < cacheLifetime(endpoint, query)) return { ...cached.data, stale: false, fetchedAt: cached.fetchedAt }
  try {
    const data = { ...await requestVndb(endpoint, query), fetchedAt: Date.now() }
    // Keep successful partial rows useful, but never cache an incomplete ID batch
    // as a complete answer that would prevent a later missing-row retry.
    const idFilters = query.filters?.[0] === 'or' ? query.filters.slice(1) : [query.filters]
    const incomplete = endpoint === 'release' && query.fields.includes('title') && idFilters.some(filter => Array.isArray(filter) && filter[0] === 'id' && !data.results.some(row => !!row && typeof row === 'object' && 'id' in row && row.id === filter[2]))
    if (!incomplete) await writeResponse(key, data, data.fetchedAt)
    return data
  } catch (error) {
    if (cached && isTemporaryVndbError(error)) {
      return { ...cached.data, stale: true, fetchedAt: cached.fetchedAt }
    }
    throw error
  }
}

async function requestVndb<T>(endpoint: string, query: VndbQuery, signal?: AbortSignal): Promise<VndbResponse<T>> {
  let response: Response
  try {
    response = await fetch(`${VNDB_API}/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query), signal, credentials: 'omit',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new VndbError('VNDB is out of reach. Check your connection and try again.')
  }
  if (!response.ok) throw new VndbError(response.status === 429 ? 'VNDB needs a little time. Please try again shortly.' : 'We could not load stories from VNDB. Please try again.', response.status)
  let data: unknown
  try { data = await response.json() } catch { throw new VndbError('VNDB returned an unexpected response. Please try again.') }
  if (!data || typeof data !== 'object' || !('results' in data) || !Array.isArray(data.results)) throw new VndbError('VNDB returned an unexpected response. Please try again.')
  if (query.count && query.results === 0 && (!('count' in data) || !Number.isSafeInteger(data.count) || Number(data.count) < 0)) throw new VndbError('VNDB returned an unexpected match count. Please try again.')
  return { ...data, stale: false } as VndbResponse<T>
}

export function fetchCatalog(options: QueryOptions = {}) {
  return queryVndb<VisualNovelCard>('vn', { filters: [], fields: CARD_FIELDS, sort: 'rating', reverse: true, results: 24, page: 1, count: true }, options)
}
