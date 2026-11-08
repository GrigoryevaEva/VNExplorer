import type { IVndbQuery, IVndbResponse } from '@/api/protocol';
import { VNDB_ENDPOINTS, VNDB_FIELDS, VNDB_OPERATORS } from '@/api/protocol';

import {
    CACHE_LIFETIME_MS,
    RESPONSE_DATABASE,
    RESPONSE_DATABASE_VERSION,
    RESPONSE_STORE,
} from './constants';

interface ICachedResponse {
    fetchedAt: number;
    data: IVndbResponse<unknown>;
}

const session = new Map<string, ICachedResponse>();

const canonical = (value: unknown): string => {
    if (Array.isArray(value)) {
        return `[${value.map(canonical).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        return `{${Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
};

export const queryKey = (endpoint: string, query: IVndbQuery): string =>
    `${endpoint}:${canonical(query)}`;

export const cacheLifetime = (endpoint: string, query: IVndbQuery): number => {
    if (endpoint === VNDB_ENDPOINTS.TAGS) {
        return CACHE_LIFETIME_MS.TAGS;
    }
    const byId = (filter: unknown): boolean =>
        Array.isArray(filter) &&
        (filter[0] === VNDB_FIELDS.ID ||
            (filter[0] === VNDB_OPERATORS.OR && filter.slice(1).every(byId)));
    if (
        endpoint === VNDB_ENDPOINTS.RELEASES ||
        (endpoint === VNDB_ENDPOINTS.NOVELS && byId(query.filters))
    ) {
        return CACHE_LIFETIME_MS.DETAILS;
    }
    return CACHE_LIFETIME_MS.CATALOG;
};

// Cache failures are expected: this disposable database has an in-memory fallback.
// Each transaction closes its own connection so eviction never affects Saved.
const transaction = <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | undefined> =>
    new Promise((resolve) => {
        let connection: IDBDatabase | undefined;
        let settled = false;
        const finish = (value?: T) => {
            if (settled) {
                return;
            }
            settled = true;
            connection?.close();
            resolve(value);
        };
        try {
            const opening = indexedDB.open(RESPONSE_DATABASE, RESPONSE_DATABASE_VERSION);
            opening.onupgradeneeded = () => opening.result.createObjectStore(RESPONSE_STORE);
            opening.onerror = () => finish();
            opening.onblocked = () => finish();
            opening.onsuccess = () => {
                connection = opening.result;
                if (settled) {
                    connection.close();
                    return;
                }
                try {
                    const tx = connection.transaction(RESPONSE_STORE, mode);
                    const request = operation(tx.objectStore(RESPONSE_STORE));
                    tx.oncomplete = () => finish(request.result);
                    tx.onerror = tx.onabort = () => finish();
                } catch {
                    finish();
                }
            };
        } catch {
            finish();
        }
    });

export const readResponse = async (key: string): Promise<ICachedResponse | undefined> => {
    const stored = await transaction<unknown>('readonly', (store) => store.get(key));
    if (
        stored &&
        typeof stored === 'object' &&
        'fetchedAt' in stored &&
        typeof stored.fetchedAt === 'number' &&
        Number.isFinite(stored.fetchedAt) &&
        'data' in stored &&
        stored.data &&
        typeof stored.data === 'object' &&
        'results' in stored.data &&
        Array.isArray(stored.data.results)
    ) {
        const cached = stored as ICachedResponse;
        session.set(key, cached);
        return cached;
    }
    return session.get(key);
};

export const writeResponse = async (
    key: string,
    data: IVndbResponse<unknown>,
    fetchedAt = Date.now()
): Promise<void> => {
    const cached = { fetchedAt, data };
    session.set(key, cached);
    await transaction('readwrite', (store) => store.put(cached, key));
};
