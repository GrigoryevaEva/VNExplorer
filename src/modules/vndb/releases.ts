import { cacheLifetime, queryKey, readResponse, writeResponse } from './cache';
import { isTemporaryVndbError, queryVndb } from './client';

export interface ReleaseAssignment {
    id: string;
    languages: { lang: string }[];
}
export interface ReleaseDetails {
    id: string;
    title: string;
    released: string | null;
    minage: number | null;
    official: boolean;
    platforms: string[];
    extlinks: { name: string; label: string; url: string }[];
    patch: boolean;
    languages: { lang: string; mtl: boolean }[];
    vns: { id: string; rtype: 'trial' | 'partial' | 'complete' }[];
}

export async function fetchReleaseDirectory(
    id: string,
    signal?: AbortSignal,
    onStale?: () => void
): Promise<ReleaseAssignment[]> {
    const releases = new Map<string, ReleaseAssignment>();
    for (let page = 1; ; page++) {
        const response = await queryVndb<ReleaseAssignment>(
            'release',
            {
                filters: ['vn', '=', ['id', '=', id]],
                fields: 'id,languages.lang',
                sort: 'id',
                results: 100,
                page,
            },
            { signal, onStale }
        );
        for (const release of response.results) releases.set(release.id, release);
        if (!response.more) return [...releases.values()];
    }
}

const RELEASE_FIELDS =
    'title,released,minage,official,platforms,extlinks{url,label,name},patch,languages{lang,mtl},vns{id,rtype}';
export async function fetchReleaseDetails(
    ids: string[],
    signal?: AbortSignal,
    onStale?: () => void
) {
    signal?.throwIfAborted();
    const key = (id: string) =>
        queryKey('release-record', { filters: ['id', '=', id], fields: RELEASE_FIELDS });
    const cached = await Promise.all(
        ids.map(async (id) => ({ id, response: await readResponse(key(id)) }))
    );
    signal?.throwIfAborted();
    const fresh = cached.filter(
        ({ response }) =>
            response &&
            Date.now() >= response.fetchedAt &&
            Date.now() - response.fetchedAt < cacheLifetime('release', { fields: RELEASE_FIELDS })
    );
    const freshIds = new Set(fresh.map((record) => record.id));
    const missing = ids.filter((id) => !freshIds.has(id));
    const rows = fresh.flatMap((record) => record.response!.data.results as ReleaseDetails[]);
    if (!missing.length) return rows;
    try {
        const response = await queryVndb<ReleaseDetails>(
            'release',
            {
                filters:
                    missing.length === 1
                        ? ['id', '=', missing[0]]
                        : ['or', ...missing.map((id) => ['id', '=', id])],
                fields: RELEASE_FIELDS,
                results: 100,
            },
            { signal, onStale }
        );
        const releases = response.results.filter((release) => missing.includes(release.id));
        if (!response.stale)
            await Promise.all(
                releases.map((release) =>
                    writeResponse(
                        key(release.id),
                        { results: [release], more: false },
                        response.fetchedAt
                    ))
            );
        signal?.throwIfAborted();
        return [...rows, ...releases];
    } catch (error) {
        const older = cached
            .filter((record) => !freshIds.has(record.id))
            .flatMap((record) => (record.response?.data.results as ReleaseDetails[]) ?? []);
        if (!isTemporaryVndbError(error) || (!older.length && !rows.length)) throw error;
        if (older.length) onStale?.();
        return [...rows, ...older];
    }
}

export function releaseWebsites(release: ReleaseDetails) {
    return (release.extlinks ?? []).filter((link, index, links) => {
        if (link.name !== 'website' || links.findIndex((other) => other.url === link.url) !== index)
            return false;
        try {
            return ['http:', 'https:'].includes(new URL(link.url).protocol);
        } catch {
            return false;
        }
    });
}

export function releaseEditionLabels(
    release: ReleaseDetails,
    novelId: string,
    language: string
): string[] {
    const kind = release.vns?.find((novel) => novel.id === novelId)?.rtype;
    return [
        ...(kind === 'trial' ? ['Demo'] : kind === 'partial' ? ['Partial'] : []),
        ...(release.patch ? ['Patch'] : []),
        ...(release.languages?.some((entry) => entry.lang === language && entry.mtl)
            ? ['Machine translation']
            : []),
    ];
}

function dateKey(value: string | null): string {
    return value && /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(value) ? value.padEnd(10, '-00') : '';
}
export function newestReleases(releases: ReleaseDetails[]) {
    return releases.sort(
        (a, b) =>
            dateKey(b.released).localeCompare(dateKey(a.released)) ||
            a.id.localeCompare(b.id, undefined, { numeric: true })
    );
}
export function isPlanned(value: string | null): boolean {
    if (value === 'TBA') return true;
    const key = dateKey(value);
    return !!key && key > new Date().toISOString().slice(0, 10);
}
export function languageName(code: string) {
    try {
        return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
    } catch {
        return code;
    }
}
const platforms: Record<string, string> = {
    win: 'Windows',
    lin: 'Linux',
    mac: 'macOS',
    and: 'Android',
    ios: 'iOS',
    web: 'Browser',
    swi: 'Switch',
    ps4: 'PS4',
    ps5: 'PS5',
    psp: 'PSP',
    psv: 'PS Vita',
    ps2: 'PS2',
    ps3: 'PS3',
    ps1: 'PlayStation',
    x3s: 'Xbox Series',
    xb1: 'Xbox One',
    dvd: 'DVD Player',
    bdp: 'Blu-ray Player',
};
export function platformName(code: string) {
    return platforms[code] ?? code;
}
