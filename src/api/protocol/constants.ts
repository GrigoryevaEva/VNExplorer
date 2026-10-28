export const VNDB_API = 'https://api.vndb.org/kana';
export const VNDB_ENDPOINTS = { NOVELS: 'vn', RELEASES: 'release', TAGS: 'tag' } as const;
export const VNDB_FIELDS = {
    ID: 'id',
    TITLE: 'title',
    SEARCH: 'search',
    TAG: 'tag',
    RELEASE: 'release',
    LANGUAGE: 'lang',
    RELEASED: 'released',
} as const;
export const VNDB_OPERATORS = {
    OR: 'or',
    AND: 'and',
    EQUAL: '=',
    NOT_EQUAL: '!=',
    LESS_OR_EQUAL: '<=',
} as const;
export const HTTP_STATUS = { RATE_LIMIT: 429, SERVER_ERROR_MIN: 500 } as const;
export const CARD_FIELDS = 'title,released,rating,image{url,thumbnail,dims}';

export const VNDB_SITE_URL = 'https://vndb.org';
