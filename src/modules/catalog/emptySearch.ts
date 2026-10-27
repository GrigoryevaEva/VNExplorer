import { queryVndb, type QueryOptions } from '../vndb/client'
import { compileCatalogQuery, selectionWithoutFilters, type CatalogSelection } from './selection'

export function needsTitleMatchCount(selection: CatalogSelection): boolean {
  return !!selection.search && JSON.stringify(compileCatalogQuery(selection).filters) !== JSON.stringify(compileCatalogQuery(selectionWithoutFilters(selection)).filters)
}

export async function fetchTitleMatchCount(search: string, options: QueryOptions = {}): Promise<number> {
  try {
    const response = await queryVndb<never>('vn', { filters: ['search', '=', search], fields: 'id', results: 0, count: true }, options)
    if (!Number.isSafeInteger(response.count) || response.count! < 0) throw new Error('VNDB returned an invalid match count.')
    return response.count!
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') throw reason
    throw new Error('Could not check title matches. Please try again.')
  }
}
