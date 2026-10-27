import { queryVndb } from '../vndb/client'
import mapping from './sections.json'
export interface DirectoryTag { id: string; name: string; description: string; searchable: boolean }
export const tagSections = mapping
let directory: DirectoryTag[] | undefined
let pending: Promise<DirectoryTag[]> | undefined
export function loadTagDirectory(progress: (count: number) => void): Promise<DirectoryTag[]> {
  if (directory) return Promise.resolve(directory)
  if (pending) return pending
  pending = (async () => {
    const tags = new Map<string, DirectoryTag>()
    for (let page = 1; ; page++) {
      const response = await queryVndb<DirectoryTag>('tag', { fields: 'name,description,searchable', sort: 'id', results: 100, page })
      for (const tag of response.results) if (tag.searchable) tags.set(tag.id, tag)
      progress(tags.size)
      if (!response.more) break
    }
    directory = [...tags.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'))
    return directory
  })().finally(() => { pending = undefined })
  return pending
}
