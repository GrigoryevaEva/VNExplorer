import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';

import { queryKey, writeResponse } from '@/api/cache';
import { fetchReleaseDetails, fetchReleaseDirectory } from '@/api/releases';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('rejects malformed manifest rows before caching and loads every corrected directory page', async () => {
    let invalid = true;
    const pages: number[] = [];
    server.use(
        http.post('https://api.vndb.org/kana/release', async ({ request }) => {
            const query = (await request.json()) as { page: number };
            pages.push(query.page);
            if (invalid) {
                return HttpResponse.json({
                    results: [{ id: 'r701', languages: null }],
                    more: false,
                });
            }
            const results =
                query.page === 1
                    ? [{ id: 'r701', languages: [{ lang: 'en' }, { lang: 'ru' }] }]
                    : [{ id: 'r702', languages: [{ lang: 'ja' }] }];
            return HttpResponse.json({ results, more: query.page === 1 });
        })
    );
    await expect(fetchReleaseDirectory('v701')).rejects.toMatchObject({ kind: 'invalid-response' });
    invalid = false;
    expect(await fetchReleaseDirectory('v701')).toEqual([
        { id: 'r701', languages: ['en', 'ru'] },
        { id: 'r702', languages: ['ja'] },
    ]);
    expect(pages).toEqual([1, 1, 2]);
});

it('rejects broken detail rows before caching and reuses the corrected raw record', async () => {
    let attempts = 0;
    server.use(
        http.post('https://api.vndb.org/kana/release', () => {
            attempts++;
            return HttpResponse.json({
                results: [
                    {
                        id: 'r711',
                        title: attempts === 1 ? 42 : 'A corrected edition',
                        released: null,
                        minage: null,
                        official: false,
                        platforms: ['win'],
                        extlinks: [],
                        patch: true,
                        languages: [{ lang: 'en', mtl: true }],
                        vns: [{ id: 'v711', rtype: 'partial' }],
                        future: 'allowed',
                    },
                ],
                more: false,
            });
        })
    );
    await expect(fetchReleaseDetails(['r711'])).rejects.toMatchObject({ kind: 'invalid-response' });
    const rows = await fetchReleaseDetails(['r711']);
    expect(rows).toMatchObject([
        {
            id: 'r711',
            title: 'A corrected edition',
            minimumAge: null,
            languages: [{ language: 'en', machineTranslated: true }],
            novels: [{ id: 'v711', kind: 'partial' }],
            patch: true,
        },
    ]);
    expect(await fetchReleaseDetails(['r711'])).toEqual(rows);
    expect(attempts).toBe(2);
});

it('discards poisoned per-record DTOs and never serves them as stale fallback', async () => {
    const fields =
        'title,released,minage,official,platforms,extlinks{url,label,name},patch,languages{lang,mtl},vns{id,rtype}';
    await writeResponse(queryKey('release-record', { filters: ['id', '=', 'r721'], fields }), {
        results: [{ id: 'r721', title: 42, official: false }],
        more: false,
    });
    let unavailable = true;
    server.use(
        http.post('https://api.vndb.org/kana/release', () => {
            if (unavailable) {
                return new HttpResponse(null, { status: 503 });
            }
            return HttpResponse.json({
                results: [{ id: 'r721', title: 'Recovered', official: false }],
                more: false,
            });
        })
    );
    await expect(fetchReleaseDetails(['r721'])).rejects.toMatchObject({
        kind: 'http',
        status: 503,
    });
    unavailable = false;
    expect(await fetchReleaseDetails(['r721'])).toMatchObject([{ id: 'r721', title: 'Recovered' }]);
});

it('normalizes a custom pre-aborted consumer reason without starting transport', async () => {
    const controller = new AbortController();
    const reason = { screen: 'left' };
    controller.abort(reason);
    await expect(
        fetchReleaseDetails(['r741'], { signal: controller.signal })
    ).rejects.toMatchObject({
        kind: 'cancelled',
        cause: reason,
    });
});
