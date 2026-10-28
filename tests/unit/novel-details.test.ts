import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';

import { fetchNovelDetails } from '@/api/visual-novels';
import { alternativeTitles, formatPlayTime, spoilerFreeTags } from '@/entities/visual-novel';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('rejects a malformed present collection instead of presenting it as empty', async () => {
    server.use(
        http.post('https://api.vndb.org/kana/vn', () =>
            HttpResponse.json({
                results: [{ id: 'v615', title: 'Broken collection', tags: null }],
                more: false,
            }))
    );
    await expect(fetchNovelDetails('v615')).rejects.toMatchObject({ kind: 'invalid-response' });
});

it('rejects malformed present associations but keeps an unknown spoiler level undisclosed', async () => {
    server.use(
        http.post('https://api.vndb.org/kana/vn', async ({ request }) => {
            const query = (await request.json()) as { filters: string[] };
            return HttpResponse.json({
                results: [
                    {
                        id: query.filters[2],
                        title: 'An association',
                        tags:
                            query.filters[2] === 'v611'
                                ? [{ id: 'g2', name: 42, spoiler: 0 }]
                                : [{ id: 'g2', name: 'Unknown' }],
                    },
                ],
                more: false,
            });
        })
    );
    await expect(fetchNovelDetails('v611')).rejects.toMatchObject({ kind: 'invalid-response' });
    const novel = (await fetchNovelDetails('v612'))!;
    expect(novel.tags[0]?.spoilerLevel).toBeNull();
    expect(spoilerFreeTags(novel)).toEqual([]);
});

it('rejects a broken details contract before caching and maps a corrected retry into domain data', async () => {
    let attempts = 0;
    server.use(
        http.post('https://api.vndb.org/kana/vn', () => {
            attempts++;
            return HttpResponse.json({
                results: [
                    {
                        id: 'v606',
                        title: 'A story',
                        description: attempts === 1 ? 42 : null,
                        votecount: null,
                        length: 3,
                        length_minutes: 321,
                        tags: [{ id: 'g2', name: 'Fantasy', spoiler: 0, future: true }],
                        screenshots: [
                            {
                                id: 'sf1',
                                url: 'https://example.org/full.png',
                                thumbnail: 'https://example.org/thumb.png',
                                dims: [800, 600],
                                thumbnail_dims: [200, 150],
                            },
                        ],
                        future: 'allowed',
                    },
                ],
                more: false,
            });
        })
    );
    await expect(fetchNovelDetails('v606')).rejects.toMatchObject({ kind: 'invalid-response' });
    const novel = await fetchNovelDetails('v606');
    expect(novel).toMatchObject({
        id: 'v606',
        title: 'A story',
        description: null,
        voteCount: null,
        playTimeMinutes: 321,
        lengthCategory: 3,
        screenshots: [{ thumbnailDimensions: [200, 150] }],
    });
    expect(attempts).toBe(2);
});

it('keeps unknown details honest and distinguishes an absent novel from a failed request', async () => {
    server.use(
        http.post('https://api.vndb.org/kana/vn', ({ request }) =>
            request.json().then((body) => {
                const id = (body as { filters: string[] }).filters[2];
                if (id === 'v608') {
                    return new HttpResponse(null, { status: 503 });
                }
                return HttpResponse.json({
                    results: id === 'v609' ? [] : [{ id, title: 'Unknown details' }],
                    more: false,
                });
            }))
    );
    const novel = await fetchNovelDetails('v607');
    expect(novel).toMatchObject({
        description: null,
        voteCount: null,
        playTimeMinutes: null,
        lengthCategory: null,
    });
    expect(formatPlayTime(novel!)).toBe('Play time unknown');
    await expect(fetchNovelDetails('v609')).resolves.toBeNull();
    await expect(fetchNovelDetails('v608')).rejects.toMatchObject({ kind: 'http', status: 503 });
});

it('presents alternative titles, approximate play time and only spoiler-free novel associations', async () => {
    server.use(
        http.post('https://api.vndb.org/kana/vn', () =>
            HttpResponse.json({
                results: [
                    {
                        id: 'v610',
                        title: 'Main title',
                        length_minutes: 321,
                        length: 2,
                        titles: [
                            {
                                lang: 'ja',
                                title: '別名',
                                latin: 'Main title',
                                main: true,
                                official: true,
                            },
                        ],
                        aliases: ['別名', 'Another name'],
                        tags: [
                            { id: 'g2', name: 'Fantasy', spoiler: 0 },
                            { id: 'g3', name: 'Secret', spoiler: 2 },
                        ],
                    },
                ],
                more: false,
            }))
    );
    const novel = (await fetchNovelDetails('v610'))!;
    expect(alternativeTitles(novel)).toEqual(['別名', 'Another name']);
    expect(formatPlayTime(novel)).toBe('About 5 hours');
    expect(spoilerFreeTags(novel)).toEqual([{ id: 'g2', name: 'Fantasy', spoilerLevel: 0 }]);
    expect(formatPlayTime({ ...novel, playTimeMinutes: null, lengthCategory: 2 })).toBe(
        'Short · 2–10 hours'
    );
});
