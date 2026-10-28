import { CATALOG_LANGUAGES, CATALOG_SORTS } from './constants';
export type TCatalogLanguage = (typeof CATALOG_LANGUAGES)[keyof typeof CATALOG_LANGUAGES];
export type TCatalogSort = (typeof CATALOG_SORTS)[keyof typeof CATALOG_SORTS];
export interface ICatalogSelection {
    search: string;
    includedTags: string[];
    excludedTags: string[];
    strictMatch: boolean;
    language: TCatalogLanguage;
    sort: TCatalogSort;
    page: number;
}

export const createCatalogSelection = (): ICatalogSelection => ({
    search: '',
    includedTags: [],
    excludedTags: [],
    strictMatch: true,
    language: CATALOG_LANGUAGES.ALL,
    sort: CATALOG_SORTS.RATING,
    page: 1,
});
export const selectionWithoutFilters = (selection: ICatalogSelection): ICatalogSelection => ({
    ...createCatalogSelection(),
    search: selection.search,
    sort: selection.sort,
});
