import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { queryVndb } from '@/api/client';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
    vi.useRealTimers();
});
afterAll(() => server.close());

describe('VNDB response boundary', () => {
    it('accepts extra envelope fields and reuses the validated response for an identical query', async () => {
        let requests = 0;
        server.use(
            http.post('https://api.vndb.org/kana/vn', () => {
                requests++;
                return HttpResponse.json({ results: [{ id: 'v1' }], more: false, future: true });
            })
        );

        const query = { fields: 'id', filters: ['search', '=', 'valid-envelope'] };
        const first = await queryVndb('vn', query);
        const second = await queryVndb('vn', query);

        expect(first.results).toEqual([{ id: 'v1' }]);
        expect(second).toEqual(first);
        expect(requests).toBe(1);
    });

    it('rejects an invalid envelope and retries instead of caching it as an empty success', async () => {
        let requests = 0;
        server.use(
            http.post('https://api.vndb.org/kana/vn', () => {
                requests++;
                return HttpResponse.json(
                    requests === 1
                        ? { results: null, more: false }
                        : { results: [{ id: 'v2' }], more: false }
                );
            })
        );
        const query = { fields: 'id', filters: ['search', '=', 'invalid-envelope'] };

        await expect(queryVndb('vn', query)).rejects.toMatchObject({
            kind: 'invalid-response',
            cause: expect.any(Error),
        });
        expect((await queryVndb('vn', query)).results).toEqual([{ id: 'v2' }]);
        expect(requests).toBe(2);
    });

    it('validates domain rows before caching and revalidates legacy cached rows before use', async () => {
        let requests = 0;
        server.use(
            http.post('https://api.vndb.org/kana/vn', () => {
                requests++;
                return HttpResponse.json({
                    results: [{ id: requests === 1 ? 42 : 'v3', extra: true }],
                    more: false,
                });
            })
        );
        const query = { fields: 'id', filters: ['search', '=', 'domain-schema'] };
        const schema = z.looseObject({ id: z.string() });

        await queryVndb('vn', query);
        expect((await queryVndb('vn', query, { schema })).results).toEqual([
            { id: 'v3', extra: true },
        ]);
        expect(requests).toBe(2);
    });

    it('shares an in-flight request while cancelling only the departing consumer', async () => {
        let requests = 0;
        let release!: () => void;
        let started!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const ready = new Promise<void>((resolve) => {
            started = resolve;
        });
        server.use(
            http.post('https://api.vndb.org/kana/vn', async () => {
                requests++;
                started();
                await gate;
                return HttpResponse.json({ results: [{ id: 'v4' }], more: false });
            })
        );
        const controller = new AbortController();
        const query = { fields: 'id', filters: ['search', '=', 'shared-request'] };
        const first = queryVndb('vn', query, { signal: controller.signal });
        const rejected = expect(first).rejects.toMatchObject({ kind: 'cancelled' });
        await ready;
        const second = queryVndb('vn', query);
        controller.abort();
        await rejected;
        release();

        expect((await second).results).toEqual([{ id: 'v4' }]);
        expect(requests).toBe(1);
    });

    it('reports the HTTP status/code/cause without copying technical server text into its message', async () => {
        server.use(
            http.post('https://api.vndb.org/kana/vn', () =>
                HttpResponse.json({ message: 'private server diagnostic' }, { status: 429 }))
        );

        await expect(
            queryVndb('vn', { fields: 'id', filters: ['search', '=', 'http-error'] })
        ).rejects.toMatchObject({
            kind: 'http',
            status: 429,
            code: 'ERR_BAD_REQUEST',
            cause: expect.any(Error),
            message: 'VNDB request failed: http',
        });
    });

    it('uses valid expired data only for a temporary failure, never to conceal an invalid response', async () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
        let mode: 'valid' | 'unavailable' | 'invalid' = 'valid';
        server.use(
            http.post('https://api.vndb.org/kana/vn', () => {
                if (mode === 'unavailable') {
                    return new HttpResponse(null, { status: 503 });
                }
                return HttpResponse.json(
                    mode === 'invalid'
                        ? { results: [], more: 'no' }
                        : { results: [{ id: 'v5' }], more: false }
                );
            })
        );
        const query = { fields: 'id', filters: ['search', '=', 'stale-policy'] };
        await queryVndb('vn', query);
        now.mockReturnValue(1_300_001);
        mode = 'unavailable';
        const staleNotice = vi.fn();

        expect(await queryVndb('vn', query, { onStale: staleNotice })).toMatchObject({
            results: [{ id: 'v5' }],
            stale: true,
            fetchedAt: 1_000_000,
        });
        expect(staleNotice).toHaveBeenCalledOnce();
        mode = 'invalid';
        await expect(queryVndb('vn', query)).rejects.toMatchObject({ kind: 'invalid-response' });
    });

    it('preserves raw cached rows when a schema transforms the returned model', async () => {
        let requests = 0;
        server.use(
            http.post('https://api.vndb.org/kana/vn', () => {
                requests++;
                return HttpResponse.json({
                    results: [{ id: 'v6', title: 'Original' }],
                    more: false,
                });
            })
        );
        const query = { fields: 'id,title', filters: ['search', '=', 'raw-cache'] };
        const transformed = await queryVndb('vn', query, {
            schema: z.object({ id: z.string() }).transform((row) => ({ key: row.id })),
        });

        expect(transformed.results).toEqual([{ key: 'v6' }]);
        expect((await queryVndb('vn', query)).results).toEqual([{ id: 'v6', title: 'Original' }]);
        expect(requests).toBe(1);
    });

    it('distinguishes a timed-out transport from a network failure', async () => {
        let started!: () => void;
        let release!: () => void;
        const ready = new Promise<void>((resolve) => {
            started = resolve;
        });
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        server.use(
            http.post('https://api.vndb.org/kana/vn', async () => {
                started();
                await gate;
                return HttpResponse.json({ results: [], more: false });
            })
        );
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const request = queryVndb('vn', {
            fields: 'id',
            filters: ['search', '=', 'timeout-error'],
        });
        const rejected = expect(request).rejects.toMatchObject({
            kind: 'timeout',
            code: 'ETIMEDOUT',
            cause: expect.any(Error),
        });
        await ready;
        await vi.advanceTimersByTimeAsync(30_001);
        try {
            await rejected;
        } finally {
            release();
        }
    }, 2000);

    it('validates a strict consumer independently of an identical permissive in-flight consumer', async () => {
        let requests = 0;
        let valid = false;
        server.use(
            http.post('https://api.vndb.org/kana/vn', () => {
                requests++;
                return HttpResponse.json({ results: [{ id: valid ? 'v7' : 7 }], more: false });
            })
        );
        const query = { fields: 'id', filters: ['search', '=', 'concurrent-schemas'] };
        const permissive = queryVndb('vn', query);
        const strict = queryVndb('vn', query, { schema: z.object({ id: z.string() }) });

        await expect(strict).rejects.toMatchObject({ kind: 'invalid-response' });
        expect((await permissive).results).toEqual([{ id: 7 }]);
        expect(requests).toBe(1);
        valid = true;
        expect(
            (await queryVndb('vn', query, { schema: z.object({ id: z.string() }) })).results
        ).toEqual([{ id: 'v7' }]);
        expect(requests).toBe(2);
    });

    it('reports a disconnected network with its cause and no invented HTTP status', async () => {
        server.use(http.post('https://api.vndb.org/kana/vn', () => HttpResponse.error()));

        await expect(
            queryVndb('vn', { fields: 'id', filters: ['search', '=', 'network-error'] })
        ).rejects.toMatchObject({ kind: 'network', status: undefined, cause: expect.any(Error) });
    });

    it.each([
        ['invalid-json', '{'],
        ['invalid-count', { results: [], more: false, count: -1 }],
        ['missing-count', { results: [], more: false }],
    ])('rejects %s instead of turning it into zero matches', async (search, payload) => {
        server.use(
            http.post('https://api.vndb.org/kana/vn', () =>
                typeof payload === 'string'
                    ? new HttpResponse(payload, { headers: { 'Content-Type': 'application/json' } })
                    : HttpResponse.json(payload))
        );

        await expect(
            queryVndb('vn', {
                fields: 'id',
                filters: ['search', '=', search],
                count: true,
                results: 0,
            })
        ).rejects.toMatchObject({ kind: 'invalid-response' });
    });

    it('keeps an unexpected local failure typed and preserves its original cause', async () => {
        await expect(queryVndb('vn', { fields: 'id', filters: [1n] })).rejects.toMatchObject({
            kind: 'unknown',
            cause: expect.any(TypeError),
        });
    });
});
