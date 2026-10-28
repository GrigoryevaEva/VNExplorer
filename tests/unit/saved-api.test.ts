import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';

import { fetchSavedCards } from '@/api/visual-novels';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('refreshes more than one Saved batch and refuses invalid rows before caching them', async () => {
    const batches: string[][] = [];
    let invalid = true;
    server.use(
        http.post('https://api.vndb.org/kana/vn', async ({ request }) => {
            const body = (await request.json()) as { filters: unknown[] };
            const filters = body.filters[0] === 'or' ? body.filters.slice(1) : [body.filters];
            const ids = filters.map((filter) => (filter as string[])[2]!);
            batches.push(ids);
            return HttpResponse.json({
                results: ids.map((id) => ({
                    id,
                    title: invalid ? 42 : `Story ${id}`,
                    image: null,
                })),
                more: false,
            });
        })
    );
    const ids = Array.from({ length: 51 }, (_, index) => `v${index + 500}`);
    await expect(fetchSavedCards(ids)).rejects.toMatchObject({ kind: 'invalid-response' });
    invalid = false;
    const cards = await fetchSavedCards(ids);
    expect(cards).toHaveLength(51);
    expect(cards[50]?.title).toBe('Story v550');
    expect(batches.map((batch) => batch.length)).toEqual([50, 50, 1]);
    expect(cards[0]).toEqual({
        id: 'v500',
        title: 'Story v500',
        released: null,
        rating: null,
        image: null,
    });
});
