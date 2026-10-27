import { queryVndb, CARD_FIELDS } from './client'
import type { VisualNovelCard } from './types'

export interface VisualNovelDetails extends VisualNovelCard {
  titles: { lang: string; title: string; latin: string | null; main: boolean; official: boolean }[]
  aliases: string[]
  description: string | null
  votecount: number | null
  length: number | null
  length_minutes: number | null
}

export const DETAIL_FIELDS = `${CARD_FIELDS},titles{lang,title,latin,main,official},aliases,description,votecount,length,length_minutes`

export async function fetchNovelDetails(id: string, signal?: AbortSignal) {
  const response = await queryVndb<VisualNovelDetails>('vn', { filters: ['id', '=', id], fields: DETAIL_FIELDS, results: 1 }, { signal })
  return response.results[0] ?? null
}

export function alternativeTitles(novel: VisualNovelDetails): string[] {
  return [...new Set([...(novel.titles ?? []).flatMap(title => [title.title, title.latin]), ...(novel.aliases ?? [])])]
    .filter((title): title is string => !!title && title !== novel.title)
}

export function formatPlayTime(novel: VisualNovelDetails): string {
  if (novel.length_minutes != null && novel.length_minutes > 0) {
    if (novel.length_minutes < 60) return 'About an hour or less'
    const hours = Math.round(novel.length_minutes / 60)
    return `About ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  return ({ 1: 'Very short · less than 2 hours', 2: 'Short · 2–10 hours', 3: 'Medium · 10–30 hours', 4: 'Long · 30–50 hours', 5: 'Very long · more than 50 hours' } as Record<number, string>)[novel.length ?? 0] ?? 'Play time unknown'
}
