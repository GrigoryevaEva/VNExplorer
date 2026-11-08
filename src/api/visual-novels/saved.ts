import type { IRequestOptions } from '@/api/client';
import { queryVndb } from '@/api/client';
import { CARD_FIELDS, VNDB_ENDPOINTS, VNDB_FIELDS, VNDB_OPERATORS } from '@/api/protocol';
import type { IVisualNovelCard } from '@/entities/visual-novel/model';

import { mapNovelCard, novelCardSchema } from './cards';
import { SAVED_CARD_BATCH_SIZE, SAVED_CARD_RESULTS_LIMIT } from './constants';

export const fetchSavedCards = async (
    ids: readonly string[],
    options: IRequestOptions = {}
): Promise<IVisualNovelCard[]> => {
    const novels: IVisualNovelCard[] = [];
    for (let offset = 0; offset < ids.length; offset += SAVED_CARD_BATCH_SIZE) {
        const filters = ids
            .slice(offset, offset + SAVED_CARD_BATCH_SIZE)
            .map((id) => [VNDB_FIELDS.ID, VNDB_OPERATORS.EQUAL, id]);
        const response = await queryVndb(
            VNDB_ENDPOINTS.NOVELS,
            {
                filters: filters.length === 1 ? filters[0] : [VNDB_OPERATORS.OR, ...filters],
                fields: CARD_FIELDS,
                results: SAVED_CARD_RESULTS_LIMIT,
            },
            { ...options, schema: novelCardSchema }
        );
        novels.push(...response.results.map(mapNovelCard));
    }
    return novels;
};
