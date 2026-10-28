import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';

import { fetchCatalogSelection } from '@/api/catalog';
import { createCatalogSelection } from '@/entities/catalog';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
it('rejects malformed novel cards before caching and permits a corrected retry', async () => {
    let attempts = 0;
    server.use(
        http.post('https://api.vndb.org/kana/vn', () => {
            attempts++;
            return HttpResponse.json({
                results: [{ id: 'v123', title: attempts === 1 ? 42 : 'Recovered', image: null }],
                more: false,
            });
        })
    );
    const selection = createCatalogSelection();
    await expect(fetchCatalogSelection(selection)).rejects.toMatchObject({
        kind: 'invalid-response',
    });
    expect((await fetchCatalogSelection(selection)).results[0]?.title).toBe('Recovered');
    expect(attempts).toBe(2);
});
