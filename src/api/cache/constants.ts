export const RESPONSE_DATABASE = 'vndb-explorer:responses:v1';
export const RESPONSE_DATABASE_VERSION = 1;
export const RESPONSE_STORE = 'responses';
export const CACHE_LIFETIME_MS = {
    CATALOG: 5 * 60 * 1000,
    DETAILS: 6 * 60 * 60 * 1000,
    TAGS: 7 * 24 * 60 * 60 * 1000,
} as const;
