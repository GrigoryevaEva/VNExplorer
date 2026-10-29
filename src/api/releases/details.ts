import { cacheLifetime, queryKey, readResponse, writeResponse } from '@/api/cache';
import type { IRequestOptions } from '@/api/client';
import { isTemporaryVndbError, queryVndb, VNDB_ERROR_KINDS, VndbError } from '@/api/client';
import { VNDB_ENDPOINTS, VNDB_FIELDS, VNDB_OPERATORS } from '@/api/protocol';
import type { IReleaseDetails } from '@/entities/release';

import { RELEASE_DETAIL_FIELDS, RELEASE_PAGE_SIZE, RELEASE_RECORD_ENDPOINT } from './constants';
import { mapReleaseDetails, releaseDetailsSchema } from './schema';

const releaseRecordKey = (id: string): string =>
    queryKey(RELEASE_RECORD_ENDPOINT, {
        filters: [VNDB_FIELDS.ID, VNDB_OPERATORS.EQUAL, id],
        fields: RELEASE_DETAIL_FIELDS,
    });
const checkCancellation = (signal?: AbortSignal): void => {
    if (signal?.aborted) {
        throw new VndbError(VNDB_ERROR_KINDS.CANCELLED, { cause: signal.reason });
    }
};
export const fetchReleaseDetails = async (
    ids: readonly string[],
    options: IRequestOptions = {}
): Promise<IReleaseDetails[]> => {
    checkCancellation(options.signal);
    const cached = await Promise.all(
        ids.map(async (id) => {
            const response = await readResponse(releaseRecordKey(id));
            const parsed = releaseDetailsSchema.safeParse(response?.data.results[0]);
            return {
                id,
                response:
                    response &&
                    response.data.results.length === 1 &&
                    parsed.success &&
                    parsed.data.id === id
                        ? { fetchedAt: response.fetchedAt, dto: parsed.data }
                        : undefined,
            };
        })
    );
    checkCancellation(options.signal);
    const fresh = cached.filter(
        ({ response }) =>
            response &&
            Date.now() >= response.fetchedAt &&
            Date.now() - response.fetchedAt <
                cacheLifetime(VNDB_ENDPOINTS.RELEASES, { fields: RELEASE_DETAIL_FIELDS })
    );
    const freshIds = new Set(fresh.map((record) => record.id));
    const missing = ids.filter((id) => !freshIds.has(id));
    const rows = fresh.map((record) => mapReleaseDetails(record.response!.dto));
    if (!missing.length) {
        return rows;
    }
    try {
        const response = await queryVndb(
            VNDB_ENDPOINTS.RELEASES,
            {
                filters:
                    missing.length === 1
                        ? [VNDB_FIELDS.ID, VNDB_OPERATORS.EQUAL, missing[0]]
                        : [
                              VNDB_OPERATORS.OR,
                              ...missing.map((id) => [VNDB_FIELDS.ID, VNDB_OPERATORS.EQUAL, id]),
                          ],
                fields: RELEASE_DETAIL_FIELDS,
                results: RELEASE_PAGE_SIZE,
            },
            { ...options, schema: releaseDetailsSchema }
        );
        const releases = response.results.filter((release) => missing.includes(release.id));
        if (!response.stale) {
            await Promise.all(
                releases.map((release) =>
                    writeResponse(
                        releaseRecordKey(release.id),
                        { results: [release], more: false },
                        response.fetchedAt
                    ))
            );
        }
        checkCancellation(options.signal);
        return [...rows, ...releases.map(mapReleaseDetails)];
    } catch (error) {
        const older = cached
            .filter((record) => !freshIds.has(record.id))
            .flatMap((record) => (record.response ? [mapReleaseDetails(record.response.dto)] : []));
        if (!isTemporaryVndbError(error) || (!older.length && !rows.length)) {
            throw error;
        }
        if (older.length) {
            options.onStale?.();
        }
        return [...rows, ...older];
    }
};
