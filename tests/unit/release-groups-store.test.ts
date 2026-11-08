import { createPinia, disposePinia } from 'pinia';

import { expect, it, vi } from 'vitest';

import { fetchReleaseDetails, fetchReleaseDirectory } from '@/api/releases';
import type { IReleaseDetails } from '@/entities/release/model';
import { useReleaseGroupsStore } from '@/entities/release/store';

vi.mock('@/api/releases', () => ({
    fetchReleaseDetails: vi.fn(),
    fetchReleaseDirectory: vi.fn(),
}));

const edition = (id: string): IReleaseDetails => ({
    id,
    title: id,
    released: null,
    minimumAge: null,
    official: false,
    platforms: [],
    externalLinks: [],
    patch: null,
    languages: [],
    novels: [],
});

it('keeps a new novel group loading when an old batch finishes after exit', async () => {
    const pinia = createPinia();
    const store = useReleaseGroupsStore(pinia);
    let finishOld!: (releases: IReleaseDetails[]) => void;
    let finishNew!: (releases: IReleaseDetails[]) => void;
    const fetch = vi.mocked(fetchReleaseDetails);
    fetch
        .mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finishOld = resolve;
                })
        )
        .mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finishNew = resolve;
                })
        );
    vi.mocked(fetchReleaseDirectory).mockResolvedValue([]);

    try {
        await store.loadForNovel('v1');
        store.loadGroup('en', ['r1']);
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        const oldSignal = fetch.mock.calls[0]?.[1]?.signal;
        store.clear();
        expect(oldSignal?.aborted).toBe(true);

        await store.loadForNovel('v2');
        store.loadGroup('en', ['r2']);
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        finishOld([edition('r1')]);
        await Promise.resolve();
        expect(store.loading.has('en')).toBe(true);
        expect(store.rows(['r1'])).toEqual([]);
        finishNew([edition('r2')]);
        await vi.waitFor(() => expect(store.rows(['r2'])).toEqual([edition('r2')]));
        expect(store.loading.has('en')).toBe(false);
    } finally {
        finishOld?.([]);
        finishNew?.([]);
        disposePinia(pinia);
    }
});
