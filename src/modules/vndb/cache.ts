import type { VndbQuery, VndbResponse } from './types';

interface CachedResponse {
    fetchedAt: number;
    data: VndbResponse<unknown>;
}
const DATABASE = 'vndb-explorer:responses:v1';
const STORE = 'responses';
const session = new Map<string, CachedResponse>();

function canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object')
        return `{${Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
            .join(',')}}`;
    return JSON.stringify(value);
}
export function queryKey(endpoint: string, query: VndbQuery) {
    return `${endpoint}:${canonical(query)}`;
}
export function cacheLifetime(endpoint: string, query: VndbQuery): number {
    if (endpoint === 'tag') return 7 * 24 * 60 * 60 * 1000;
    const byId = (filter: unknown): boolean =>
        Array.isArray(filter) &&
        (filter[0] === 'id' || (filter[0] === 'or' && filter.slice(1).every(byId)));
    if (endpoint === 'release' || (endpoint === 'vn' && byId(query.filters)))
        return 6 * 60 * 60 * 1000;
    return 5 * 60 * 1000;
}

// Each transaction closes its connection so the browser can evict/delete this
// disposable database independently of Saved's localStorage record.
function transaction<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | undefined> {
    return new Promise((resolve) => {
        let connection: IDBDatabase | undefined;
        let settled = false;
        const finish = (value?: T) => {
            if (!settled) {
                settled = true;
                connection?.close();
                resolve(value);
            }
        };
        try {
            const opening = indexedDB.open(DATABASE, 1);
            opening.onupgradeneeded = () => {
                opening.result.createObjectStore(STORE);
            };
            opening.onerror = () => finish();
            opening.onblocked = () => finish();
            opening.onsuccess = () => {
                connection = opening.result;
                if (settled) {
                    connection.close();
                    return;
                }
                try {
                    const tx = connection.transaction(STORE, mode);
                    const request = operation(tx.objectStore(STORE));
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
}
export async function readResponse(key: string): Promise<CachedResponse | undefined> {
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
        const cached = stored as CachedResponse;
        session.set(key, cached);
        return cached;
    }
    return session.get(key);
}
export async function writeResponse(
    key: string,
    data: VndbResponse<unknown>,
    fetchedAt = Date.now()
): Promise<void> {
    const cached = { fetchedAt, data };
    session.set(key, cached);
    await transaction('readwrite', (store) => store.put(cached, key));
}
