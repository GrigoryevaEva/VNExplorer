import { queryVndb } from './client'

export interface ReleaseAssignment { id: string; languages: { lang: string }[] }
export interface ReleaseDetails {
  id: string
  title: string
  released: string | null
  minage: number | null
  official: boolean
  platforms: string[]
  extlinks: { name: string; label: string; url: string }[]
}

export async function fetchReleaseDirectory(id: string, signal?: AbortSignal): Promise<ReleaseAssignment[]> {
  const releases = new Map<string, ReleaseAssignment>()
  for (let page = 1; ; page++) {
    const response = await queryVndb<ReleaseAssignment>('release', { filters: ['vn', '=', ['id', '=', id]], fields: 'id,languages.lang', sort: 'id', results: 100, page }, { signal })
    for (const release of response.results) releases.set(release.id, release)
    if (!response.more) return [...releases.values()]
  }
}

export async function fetchReleaseDetails(ids: string[], signal?: AbortSignal) {
  const response = await queryVndb<ReleaseDetails>('release', { filters: ['id', '=', ids], fields: 'title,released,minage,official,platforms,extlinks{url,label,name}', results: 100 }, { signal })
  return response.results
}

export function releaseWebsites(release: ReleaseDetails) {
  return (release.extlinks ?? []).filter((link, index, links) => {
    if (link.name !== 'website' || links.findIndex(other => other.url === link.url) !== index) return false
    try { return ['http:', 'https:'].includes(new URL(link.url).protocol) } catch { return false }
  })
}

function dateKey(value: string | null): string {
  return value && /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(value) ? value.padEnd(10, '-00') : ''
}
export function newestReleases(releases: ReleaseDetails[]) {
  return releases.sort((a, b) => dateKey(b.released).localeCompare(dateKey(a.released)) || a.id.localeCompare(b.id, undefined, { numeric: true }))
}
export function isPlanned(value: string | null): boolean {
  if (value === 'TBA') return true
  const key = dateKey(value)
  return !!key && key > new Date().toISOString().slice(0, 10)
}
export function languageName(code: string) {
  try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code } catch { return code }
}
const platforms: Record<string, string> = { win: 'Windows', lin: 'Linux', mac: 'macOS', and: 'Android', ios: 'iOS', web: 'Browser', swi: 'Switch', ps4: 'PS4', ps5: 'PS5', psp: 'PSP', psv: 'PS Vita', ps2: 'PS2', ps3: 'PS3', ps1: 'PlayStation', x3s: 'Xbox Series', xb1: 'Xbox One', dvd: 'DVD Player', bdp: 'Blu-ray Player' }
export function platformName(code: string) { return platforms[code] ?? code }
