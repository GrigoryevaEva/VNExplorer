import type { LocationQuery, LocationQueryRaw } from 'vue-router';

import { CARD_FIELDS, type QueryOptions, queryVndb } from '../vndb/client';
import type { VndbQuery } from '../vndb/types';
import type { VisualNovelCard } from '../vndb/types';

export const CATALOG_PAGE_SIZE = 24;
export type CatalogLanguage = 'all' | 'ru' | 'en';
export interface CatalogSelection {
    search: string;
    includedTags: string[];
    excludedTags: string[];
    strictMatch: boolean;
    language: CatalogLanguage;
    sort: 'rating' | 'released';
    page: number;
}
const first = (value: LocationQuery[string]) => (Array.isArray(value) ? value[0] : value);
const tagIds = (value: LocationQuery[string]) =>
    [
        ...new Set(
            (Array.isArray(value) ? value : [value]).filter(
                (id): id is string => typeof id === 'string' && /^g[1-9]\d*$/.test(id)
            )
        ),
    ].sort();
export function selectionFromQuery(query: LocationQuery): CatalogSelection {
    const page = Number(first(query.page));
    const language = first(query.language);
    const excludedTags = tagIds(query.exclude);
    return {
        includedTags: tagIds(query.tag).filter((id) => !excludedTags.includes(id)),
        excludedTags,
        strictMatch: first(query.strict) !== '0',
        search: (first(query.q) ?? '').trim(),
        language: language === 'ru' || language === 'en' ? language : 'all',
        sort: first(query.sort) === 'released' ? 'released' : 'rating',
        page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1,
    };
}
export function selectionToQuery(selection: CatalogSelection): LocationQueryRaw {
    return {
        ...(selection.includedTags.length ? { tag: selection.includedTags } : {}),
        ...(selection.excludedTags.length ? { exclude: selection.excludedTags } : {}),
        ...(!selection.strictMatch ? { strict: '0' } : {}),
        ...(selection.search ? { q: selection.search } : {}),
        ...(selection.language !== 'all' ? { language: selection.language } : {}),
        ...(selection.sort !== 'rating' ? { sort: selection.sort } : {}),
        ...(selection.page > 1 ? { page: String(selection.page) } : {}),
    };
}
export function selectionWithoutFilters(selection: CatalogSelection): CatalogSelection {
    return selectionFromQuery({ q: selection.search, sort: selection.sort });
}
export function compileCatalogQuery(selection: CatalogSelection): VndbQuery {
    const conditions: unknown[][] = [];
    if (selection.search) {
        conditions.push(['search', '=', selection.search]);
    }
    const inclusions = selection.includedTags.map((id) => ['tag', '=', [id, 0, 0]]);
    if (inclusions.length) {
        conditions.push(
            inclusions.length === 1
                ? inclusions[0]!
                : [selection.strictMatch ? 'and' : 'or', ...inclusions]
        );
    }
    for (const id of selection.excludedTags) {
        conditions.push(['tag', '!=', [id, 0, 0]]);
    }
    // One release must satisfy both language and publication, including demos and partial translations.
    if (selection.language !== 'all') {
        conditions.push([
            'release',
            '=',
            [
                'and',
                ['lang', '=', selection.language],
                ['released', '<=', 'today'],
                ['released', '!=', 'unknown'],
            ],
        ]);
    }
    return {
        filters: conditions.length > 1 ? ['and', ...conditions] : (conditions[0] ?? []),
        fields: CARD_FIELDS,
        sort: selection.sort,
        reverse: true,
        results: CATALOG_PAGE_SIZE,
        page: selection.page,
        count: true,
    };
}
export function fetchCatalogSelection(selection: CatalogSelection, options: QueryOptions = {}) {
    return queryVndb<VisualNovelCard>('vn', compileCatalogQuery(selection), options);
}
