import type { VisualNovelCard, VndbQuery, VndbResponse } from './types'

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

export async function queryVndb<T>(endpoint: 'vn' | 'release' | 'tag', query: VndbQuery, options: { signal?: AbortSignal } = {}): Promise<VndbResponse<T>> {
  let response: Response
  try {
    response = await fetch(`${VNDB_API}/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query), signal: options.signal, credentials: 'omit',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new VndbError('VNDB is out of reach. Check your connection and try again.')
  }
  if (!response.ok) throw new VndbError(response.status === 429 ? 'VNDB needs a little time. Please try again shortly.' : 'We could not load stories from VNDB. Please try again.', response.status)
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object' || !('results' in data) || !Array.isArray(data.results)) throw new VndbError('VNDB returned an unexpected response. Please try again.')
  return data as VndbResponse<T>
}

export function fetchCatalog(options: { signal?: AbortSignal } = {}) {
  return queryVndb<VisualNovelCard>('vn', { filters: [], fields: CARD_FIELDS, sort: 'rating', reverse: true, results: 24, page: 1, count: true }, options)
}
