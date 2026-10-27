import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { VndbQuery } from '../vndb/types'
import { CARD_FIELDS, queryVndb } from '../vndb/client'
import type { VisualNovelCard } from '../vndb/types'

export const CATALOG_PAGE_SIZE = 24
export interface CatalogSelection {
  search: string
  includedTag: string
  sort: 'rating' | 'released'
  page: number
}
const first = (value: LocationQuery[string]) => Array.isArray(value) ? value[0] : value
export function selectionFromQuery(query: LocationQuery): CatalogSelection {
  const page = Number(first(query.page))
  return { includedTag: /^g[1-9]\d*$/.test(first(query.tag) ?? '') ? first(query.tag)! : '', search: (first(query.q) ?? '').trim(), sort: first(query.sort) === 'released' ? 'released' : 'rating', page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1 }
}
export function selectionToQuery(selection: CatalogSelection): LocationQueryRaw {
  return { ...(selection.includedTag ? { tag: selection.includedTag } : {}), ...(selection.search ? { q: selection.search } : {}), ...(selection.sort !== 'rating' ? { sort: selection.sort } : {}), ...(selection.page > 1 ? { page: String(selection.page) } : {}) }
}
export function compileCatalogQuery(selection: CatalogSelection): VndbQuery {
  const filters: unknown[][] = []
  if (selection.search) filters.push(['search', '=', selection.search])
  if (selection.includedTag) filters.push(['tag', '=', [selection.includedTag, 0, 0]])
  return { filters: filters.length > 1 ? ['and', ...filters] : filters[0] ?? [], fields: CARD_FIELDS, sort: selection.sort, reverse: true, results: CATALOG_PAGE_SIZE, page: selection.page, count: true }
}
export function fetchCatalogSelection(selection: CatalogSelection, options: { signal?: AbortSignal } = {}) {
  return queryVndb<VisualNovelCard>('vn', compileCatalogQuery(selection), options)
}

