import { createPinia, storeToRefs } from 'pinia';

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, expectTypeOf, it, vi } from 'vitest';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
});
afterAll(() => server.close());

it('restricts directory mutation to its load action', async () => {
    const { useTagsStore } = await import('@/stores/tags');
    const pinia = createPinia();
    const store = useTagsStore(pinia);
    const patch: unknown = Reflect.get(store, '$patch');
    if (typeof patch === 'function') {
        patch({ loaded: 500 });
    }
    expect(store.loaded).toBe(0);
    expect(patch).toBeUndefined();
    expect(Reflect.get(store, '$reset')).toBeUndefined();
    expect(Reflect.get(store, '$subscribe')).toBeUndefined();
    expect(Reflect.get(store, '$onAction')).toBeUndefined();
    expectTypeOf(store.$patch).toEqualTypeOf<never>();
    expectTypeOf(store.$subscribe).toEqualTypeOf<never>();
    expect(store).toBe(useTagsStore(pinia));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Reflect.set(store, '$state', { loaded: 500 });
    Reflect.set(store.$state, 'loaded', 500);
    expect(store.loaded).toBe(0);
    expect(warn).toHaveBeenCalled();
});

it('shares a paginated directory between consumers and registers its readonly state in Pinia', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const pages: number[] = [];
    server.use(
        http.post('https://api.vndb.org/kana/tag', async ({ request }) => {
            const query = (await request.json()) as { page: number };
            pages.push(query.page);
            if (query.page === 2) {
                await gate;
            }
            return HttpResponse.json({
                results:
                    query.page === 1
                        ? [
                              {
                                  id: 'g96',
                                  name: 'Romance',
                                  description: 'Love.',
                                  searchable: true,
                              },
                              { id: 'g1', name: 'Abstract', searchable: false },
                          ]
                        : [{ id: 'g2', name: 'Fantasy', searchable: true }],
                more: query.page === 1,
            });
        })
    );
    const { useTagsStore } = await import('@/stores/tags');
    const pinia = createPinia();
    const first = useTagsStore(pinia);
    const second = useTagsStore(pinia);
    const { tags, loaded } = storeToRefs(second);
    const initial = first.loadDirectory();
    await vi.waitFor(() => expect(loaded.value).toBe(1));
    const concurrent = second.loadDirectory();
    expect(pinia.state.value.tags.loaded).toBe(1);
    release();
    await Promise.all([initial, concurrent]);
    expect(pages).toEqual([1, 2]);
    expect(tags.value.map((tag) => tag.name)).toEqual(['Fantasy', 'Romance']);
    expect(pinia.state.value.tags.tags).toHaveLength(2);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Reflect.set(first, 'loaded', 500);
    Reflect.set(tags.value[0]!, 'name', 'Changed externally');
    expect(first.loaded).toBe(2);
    expect(tags.value[0]?.name).toBe('Fantasy');
    expect(warn).toHaveBeenCalled();
});

it('hydrates registered state before exposing the readonly facade and keeps storeToRefs protected', async () => {
    const { useTagsStore } = await import('@/stores/tags');
    const pinia = createPinia();
    pinia.state.value.tags = {
        tags: [{ id: 'g96', name: 'Restored', description: '', searchable: true }],
        loaded: 1,
        loading: false,
        error: '',
        stale: true,
    };
    const store = useTagsStore(pinia);
    const { loaded, tags } = storeToRefs(store);
    expect(store.$id).toBe('tags');
    expect(loaded.value).toBe(1);
    expect(tags.value[0]?.name).toBe('Restored');
    expect(store.stale).toBe(true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Reflect.set(loaded, 'value', 50);
    expect(loaded.value).toBe(1);
    expect(pinia.state.value.tags.loaded).toBe(1);
    expect(warn).toHaveBeenCalled();
});

it('reports an invalid directory without caching it and lets the shared action retry', async () => {
    vi.resetModules();
    let attempts = 0;
    server.use(
        http.post('https://api.vndb.org/kana/tag', () => {
            attempts++;
            return HttpResponse.json({
                results: [{ id: 'g96', name: attempts === 1 ? 42 : 'Recovered', searchable: true }],
                more: false,
            });
        })
    );
    const { useTagsStore } = await import('@/stores/tags');
    const store = useTagsStore(createPinia());
    await store.loadDirectory();
    expect(store.error).toBe('Tags could not be loaded. Please try again.');
    expect(store.loading).toBe(false);
    expect(store.tags).toEqual([]);
    await store.loadDirectory();
    expect(store.error).toBe('');
    expect(store.tags[0]?.name).toBe('Recovered');
    expect(attempts).toBe(2);
});

it('marks expired cached directory data stale during an outage and clears provenance on recovery', async () => {
    vi.resetModules();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    let unavailable = false;
    server.use(
        http.post('https://api.vndb.org/kana/tag', () =>
            unavailable
                ? new HttpResponse(null, { status: 503 })
                : HttpResponse.json({
                      results: [{ id: 'g96', name: 'Kept', searchable: true }],
                      more: false,
                  }))
    );
    const { useTagsStore } = await import('@/stores/tags');
    const store = useTagsStore(createPinia());
    await store.loadDirectory();
    unavailable = true;
    now.mockReturnValue(605_800_001);
    await store.loadDirectory();
    expect(store.tags[0]?.name).toBe('Kept');
    expect(store.stale).toBe(true);
    expect(store.error).toBe('');
    unavailable = false;
    await store.loadDirectory();
    expect(store.stale).toBe(false);
});
