import type { LocationQuery, LocationQueryRaw } from 'vue-router';

import type { ICatalogSelection } from '@/entities/catalog';
import { CATALOG_MAX_PAGE } from '@/entities/catalog';
const first = (value: LocationQuery[string]) => (Array.isArray(value) ? value[0] : value);
const tagIds = (value: LocationQuery[string]) =>
    [
        ...new Set(
            (Array.isArray(value) ? value : [value]).filter(
                (id): id is string => typeof id === 'string' && /^g[1-9]\d*$/.test(id)
            )
        ),
    ].sort();
export const selectionFromQuery = (query: LocationQuery): ICatalogSelection => {
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
        page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, CATALOG_MAX_PAGE) : 1,
    };
};
export const selectionToQuery = (selection: ICatalogSelection): LocationQueryRaw => {
    return {
        ...(selection.includedTags.length ? { tag: selection.includedTags } : {}),
        ...(selection.excludedTags.length ? { exclude: selection.excludedTags } : {}),
        ...(!selection.strictMatch ? { strict: '0' } : {}),
        ...(selection.search ? { q: selection.search } : {}),
        ...(selection.language !== 'all' ? { language: selection.language } : {}),
        ...(selection.sort !== 'rating' ? { sort: selection.sort } : {}),
        ...(selection.page > 1 ? { page: String(selection.page) } : {}),
    };
};
