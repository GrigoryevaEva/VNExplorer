import { createPinia, disposePinia, storeToRefs } from 'pinia';

import { expect, it, vi } from 'vitest';

import { fetchNovelDetails } from '@/api/visual-novels';
import type { IVisualNovelDetails } from '@/entities/visual-novel/model';
import { useNovelDetailsStore } from '@/entities/visual-novel/store';

vi.mock('@/api/visual-novels', () => ({ fetchNovelDetails: vi.fn() }));

const novel = (id: string): IVisualNovelDetails => ({
    id,
    title: id,
    released: null,
    rating: null,
    image: null,
    tags: [],
    screenshots: [],
    titles: [],
    aliases: [],
    description: null,
    voteCount: null,
    lengthCategory: null,
    playTimeMinutes: null,
});

it('clears the previous novel on navigation and ignores its late response', async () => {
    const pinia = createPinia();
    const store = useNovelDetailsStore(pinia);
    const {
        novel: current,
        loading,
        tags,
    } = storeToRefs(store);
    let finishFirst!: (result: IVisualNovelDetails) => void;
    vi.mocked(fetchNovelDetails)
        .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
        .mockResolvedValueOnce({
            ...novel('v2'),
            tags: [
                { id: 'g1', name: 'Safe', spoilerLevel: 0 },
                { id: 'g2', name: 'Hidden', spoilerLevel: 1 },
            ],
        });

    try {
        const first = store.load('v1');
        const firstSignal = vi.mocked(fetchNovelDetails).mock.calls.at(-1)?.[1]?.signal;
        await store.load('v2');
        expect(firstSignal?.aborted).toBe(true);
        expect(current.value?.id).toBe('v2');
        expect(tags.value.map((tag) => tag.id)).toEqual(['g1']);

        finishFirst(novel('v1'));
        await first;
        expect(current.value?.id).toBe('v2');
        expect(loading.value).toBe(false);

        store.clear();
        expect(current.value).toBeNull();
        expect(tags.value).toEqual([]);
    } finally {
        disposePinia(pinia);
    }
});

it('cancels the active consumer and clears view state on exit', async () => {
    const pinia = createPinia();
    const store = useNovelDetailsStore(pinia);
    let finish!: (result: IVisualNovelDetails) => void;
    const fetch = vi.mocked(fetchNovelDetails);
    fetch.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));

    try {
        const loading = store.load('v3');
        const signal = fetch.mock.calls.at(-1)?.[1]?.signal;
        const calls = fetch.mock.calls.length;
        store.clear();
        expect(signal?.aborted).toBe(true);
        expect(store.loading).toBe(false);
        finish(novel('v3'));
        await loading;
        await store.retry();
        expect(store.novel).toBeNull();
        expect(store.error).toBe('');
        expect(fetch.mock.calls.length).toBe(calls);
    } finally {
        disposePinia(pinia);
    }
});
