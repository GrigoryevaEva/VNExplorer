import type { IRequestOptions } from '@/api/client';
import { queryVndb } from '@/api/client';
import type { IVndbQuery, IVndbResponse } from '@/api/protocol';
import { CARD_FIELDS, VNDB_ENDPOINTS, VNDB_FIELDS, VNDB_OPERATORS } from '@/api/protocol';
import { mapNovelCard, novelCardSchema } from '@/api/visual-novels';
import type { ICatalogSelection } from '@/entities/catalog/model';
import {
    CATALOG_LANGUAGES,
    CATALOG_PAGE_SIZE,
    selectionWithoutFilters,
} from '@/entities/catalog/model';
import type { IVisualNovelCard } from '@/entities/visual-novel/model';

import { RELEASE_AVAILABILITY, TAG_RATING_THRESHOLD, TAG_SPOILER_LEVEL } from './constants';

export const compileCatalogQuery = (selection: ICatalogSelection): IVndbQuery => {
    const conditions: unknown[][] = [];
    if (selection.search) {
        conditions.push([VNDB_FIELDS.SEARCH, VNDB_OPERATORS.EQUAL, selection.search]);
    }
    const inclusions = selection.includedTags.map((id) => [
        VNDB_FIELDS.TAG,
        VNDB_OPERATORS.EQUAL,
        [id, TAG_RATING_THRESHOLD, TAG_SPOILER_LEVEL],
    ]);
    if (inclusions.length) {
        conditions.push(
            inclusions.length === 1
                ? inclusions[0]!
                : [selection.strictMatch ? VNDB_OPERATORS.AND : VNDB_OPERATORS.OR, ...inclusions]
        );
    }
    for (const id of selection.excludedTags) {
        conditions.push([
            VNDB_FIELDS.TAG,
            VNDB_OPERATORS.NOT_EQUAL,
            [id, TAG_RATING_THRESHOLD, TAG_SPOILER_LEVEL],
        ]);
    }
    // One release must satisfy both language and publication, including demos and partial translations.
    if (selection.language !== CATALOG_LANGUAGES.ALL) {
        conditions.push([
            VNDB_FIELDS.RELEASE,
            VNDB_OPERATORS.EQUAL,
            [
                VNDB_OPERATORS.AND,
                [VNDB_FIELDS.LANGUAGE, VNDB_OPERATORS.EQUAL, selection.language],
                [VNDB_FIELDS.RELEASED, VNDB_OPERATORS.LESS_OR_EQUAL, RELEASE_AVAILABILITY.TODAY],
                [VNDB_FIELDS.RELEASED, VNDB_OPERATORS.NOT_EQUAL, RELEASE_AVAILABILITY.UNKNOWN],
            ],
        ]);
    }
    return {
        filters:
            conditions.length > 1 ? [VNDB_OPERATORS.AND, ...conditions] : (conditions[0] ?? []),
        fields: CARD_FIELDS,
        sort: selection.sort,
        reverse: true,
        results: CATALOG_PAGE_SIZE,
        page: selection.page,
        count: true,
    };
};

export const fetchCatalogSelection = async (
    selection: ICatalogSelection,
    options: IRequestOptions = {}
): Promise<IVndbResponse<IVisualNovelCard>> => {
    const response = await queryVndb(VNDB_ENDPOINTS.NOVELS, compileCatalogQuery(selection), {
        ...options,
        schema: novelCardSchema,
    });
    return { ...response, results: response.results.map(mapNovelCard) };
};
export const needsTitleMatchCount = (selection: ICatalogSelection): boolean =>
    !!selection.search &&
    JSON.stringify(compileCatalogQuery(selection).filters) !==
        JSON.stringify(compileCatalogQuery(selectionWithoutFilters(selection)).filters);
export const fetchTitleMatchCount = async (
    search: string,
    options: IRequestOptions = {}
): Promise<number> => {
    const response = await queryVndb(
        VNDB_ENDPOINTS.NOVELS,
        {
            filters: [VNDB_FIELDS.SEARCH, VNDB_OPERATORS.EQUAL, search],
            fields: VNDB_FIELDS.ID,
            results: 0,
            count: true,
        },
        options
    );
    return response.count!;
};
