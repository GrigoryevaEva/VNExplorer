import axios from 'axios';
import { z } from 'zod';

import { cacheLifetime, queryKey, readResponse, writeResponse } from '@/api/cache';
import type { IVndbQuery, IVndbResponse, TVndbEndpoint } from '@/api/protocol';
import { VNDB_API, VNDB_ENDPOINTS, VNDB_FIELDS, VNDB_OPERATORS } from '@/api/protocol';

import { REQUEST_TIMEOUT_MS, TRANSPORT_ERROR_CODES } from './constants';
import { isTemporaryVndbError, normalizeVndbError, VNDB_ERROR_KINDS, VndbError } from './errors';
import { responseEnvelopeSchema } from './schemas';

const client = axios.create({
    baseURL: VNDB_API,
    withCredentials: false,
    timeout: REQUEST_TIMEOUT_MS,
    transitional: { clarifyTimeoutError: true },
});
interface ITransportResponse {
    data: unknown;
    fetchedAt: number;
    status: number;
}

const pending = new Map<string, Promise<ITransportResponse>>();

export interface IRequestOptions {
    signal?: AbortSignal;
    onStale?: () => void;
}

export interface IQueryOptions<T = unknown> extends IRequestOptions {
    schema?: z.ZodType<T>;
}

const parseResponse = <T>(
    value: unknown,
    query: IVndbQuery,
    options: IQueryOptions<T>,
    status?: number
): IVndbResponse<T> => {
    const schema = responseEnvelopeSchema.extend({
        results: z.array(options.schema ?? z.unknown()),
    });
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
        throw new VndbError(VNDB_ERROR_KINDS.INVALID_RESPONSE, { cause: parsed.error, status });
    }
    if (query.count && query.results === 0 && parsed.data.count === undefined) {
        throw new VndbError(VNDB_ERROR_KINDS.INVALID_RESPONSE, {
            cause: new Error('Missing requested match count'),
            status,
        });
    }
    return parsed.data as IVndbResponse<T>;
};

const requestVndb = async (
    endpoint: TVndbEndpoint,
    query: IVndbQuery
): Promise<ITransportResponse> => {
    try {
        const response = await client.post<unknown>(`/${endpoint}`, query);
        return { data: response.data, fetchedAt: Date.now(), status: response.status };
    } catch (error) {
        throw normalizeVndbError(error);
    }
};

const forConsumer = <T>(shared: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) {
        return shared;
    }
    return new Promise((resolve, reject) => {
        const abort = () =>
            reject(
                new VndbError(VNDB_ERROR_KINDS.CANCELLED, {
                    cause: signal.reason,
                    code: TRANSPORT_ERROR_CODES.CANCELLED,
                })
            );
        signal.addEventListener('abort', abort, { once: true });
        shared.then(
            (value) => {
                signal.removeEventListener('abort', abort);
                if (!signal.aborted) {
                    resolve(value);
                }
            },
            (error: unknown) => {
                signal.removeEventListener('abort', abort);
                if (!signal.aborted) {
                    reject(error);
                }
            }
        );
        if (signal.aborted) {
            abort();
        }
    });
};

const isIncompleteReleaseBatch = (
    endpoint: TVndbEndpoint,
    query: IVndbQuery,
    results: unknown[]
): boolean => {
    if (endpoint !== VNDB_ENDPOINTS.RELEASES || !query.fields.includes(VNDB_FIELDS.TITLE)) {
        return false;
    }
    const filters =
        query.filters?.[0] === VNDB_OPERATORS.OR ? query.filters.slice(1) : [query.filters];
    return filters.some(
        (filter) =>
            Array.isArray(filter) &&
            filter[0] === VNDB_FIELDS.ID &&
            !results.some(
                (row) => !!row && typeof row === 'object' && 'id' in row && row.id === filter[2]
            )
    );
};

const cachedQuery = async <T>(
    endpoint: TVndbEndpoint,
    query: IVndbQuery,
    options: IQueryOptions<T>
): Promise<IVndbResponse<T>> => {
    const key = queryKey(endpoint, query);
    const cached = await readResponse(key);
    const age = cached ? Date.now() - cached.fetchedAt : -1;
    let validCached: IVndbResponse<T> | undefined;
    if (cached) {
        try {
            validCached = parseResponse(cached.data, query, options);
        } catch {
            // A previous app version may have cached rows without this domain schema.
            // Refetch instead of trusting incompatible disposable data.
        }
    }
    if (validCached && cached && age >= 0 && age < cacheLifetime(endpoint, query)) {
        return { ...validCached, stale: false, fetchedAt: cached.fetchedAt };
    }
    let shared = pending.get(key);
    if (!shared) {
        shared = requestVndb(endpoint, query);
        pending.set(key, shared);
    }
    try {
        const response = await shared;
        const data = {
            ...parseResponse(response.data, query, options, response.status),
            stale: false,
            fetchedAt: response.fetchedAt,
        };
        const raw = responseEnvelopeSchema.parse(response.data);
        if (!isIncompleteReleaseBatch(endpoint, query, raw.results)) {
            // Persist DTOs, never a consumer schema's stripped/transformed model.
            await writeResponse(key, raw, data.fetchedAt);
        }
        return data;
    } catch (error) {
        if (validCached && cached && isTemporaryVndbError(error)) {
            return { ...validCached, stale: true, fetchedAt: cached.fetchedAt };
        }
        throw error;
    } finally {
        if (pending.get(key) === shared) {
            pending.delete(key);
        }
    }
};

export const queryVndb = async <T = unknown>(
    endpoint: TVndbEndpoint,
    query: IVndbQuery,
    options: IQueryOptions<T> = {}
): Promise<IVndbResponse<T>> => {
    if (options.signal?.aborted) {
        throw new VndbError(VNDB_ERROR_KINDS.CANCELLED, {
            cause: options.signal.reason,
            code: TRANSPORT_ERROR_CODES.CANCELLED,
        });
    }
    try {
        const data = await forConsumer(cachedQuery(endpoint, query, options), options.signal);
        if (data.stale) {
            options.onStale?.();
        }
        return data;
    } catch (error) {
        throw normalizeVndbError(error);
    }
};
