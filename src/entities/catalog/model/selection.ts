import { CATALOG_LANGUAGES, CATALOG_SORTS, CATALOG_TAG_ACTIONS } from './constants';

export type TCatalogLanguage = (typeof CATALOG_LANGUAGES)[keyof typeof CATALOG_LANGUAGES];
export type TCatalogSort = (typeof CATALOG_SORTS)[keyof typeof CATALOG_SORTS];
export type TCatalogTagAction = (typeof CATALOG_TAG_ACTIONS)[keyof typeof CATALOG_TAG_ACTIONS];
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

export const toggleCatalogTag = (
    selection: Pick<ICatalogSelection, 'includedTags' | 'excludedTags'>,
    id: string,
    action: TCatalogTagAction
): Pick<ICatalogSelection, 'includedTags' | 'excludedTags'> => {
    const wasActive = (
        action === CATALOG_TAG_ACTIONS.INCLUDE ? selection.includedTags : selection.excludedTags
    ).includes(id);
    const includedTags = selection.includedTags.filter((tag) => tag !== id);
    const excludedTags = selection.excludedTags.filter((tag) => tag !== id);
    if (!wasActive) {
        (action === CATALOG_TAG_ACTIONS.INCLUDE ? includedTags : excludedTags).push(id);
    }
    return { includedTags, excludedTags };
};
