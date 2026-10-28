import { CARD_FIELDS, queryVndb } from './client';
import type { VisualNovelCard } from './types';

export async function fetchSavedCards(ids: string[], signal?: AbortSignal, onStale?: () => void) {
    const novels: VisualNovelCard[] = [];
    for (let offset = 0; offset < ids.length; offset += 50) {
        const filters = ids.slice(offset, offset + 50).map((id) => ['id', '=', id]);
        const response = await queryVndb<VisualNovelCard>(
            'vn',
            {
                filters: filters.length === 1 ? filters[0] : ['or', ...filters],
                fields: CARD_FIELDS,
                results: 100,
            },
            { signal, onStale }
        );
        novels.push(...response.results);
    }
    return novels;
}
