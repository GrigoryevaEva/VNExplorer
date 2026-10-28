// @vitest-environment jsdom
import type { Pinia } from 'pinia';
import { createPinia, disposePinia, storeToRefs } from 'pinia';
import type { DeepReadonly } from 'vue';

import { afterEach, beforeEach, expect, expectTypeOf, it, vi } from 'vitest';

import type { IVisualNovelCard } from '@/entities/visual-novel';
import { useSavedStore } from '@/stores/saved';

let pinia: Pinia;
const amber = { id: 'v1', title: 'Amber', released: '2001', rating: 95, image: null };
const blue = { id: 'v2', title: 'Blue', released: '2020', rating: 70, image: null };
beforeEach(() => {
    pinia = createPinia();
});
afterEach(() => {
    disposePinia(pinia);
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

it('restores the existing collection and keeps its original addition date through remove and Undo', () => {
    localStorage.setItem(
        'vndb-explorer:saved:v1',
        JSON.stringify({
            version: 1,
            entries: [{ addedAt: 1234, novel: amber }],
        })
    );
    const store = useSavedStore(pinia);
    const { savedNovels, removedEntry } = storeToRefs(store);
    expect(savedNovels.value).toEqual([amber]);
    expect(store.remove(amber.id)).toBe(true);
    expect(savedNovels.value).toEqual([]);
    expect(removedEntry.value?.addedAt).toBe(1234);
    expect(store.undo()).toBe(true);
    expect(savedNovels.value).toEqual([amber]);
    expect(store.entries[0]?.addedAt).toBe(1234);
    expect(pinia.state.value.saved.entries[0].addedAt).toBe(1234);
});

it('keeps Save, remove and Undo truthful when browser writes fail', () => {
    const store = useSavedStore(pinia);
    expect(store.save(amber)).toBe(true);
    const writing = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Full', 'QuotaExceededError');
    });
    expect(store.save(blue)).toBe(false);
    expect(store.remove(amber.id)).toBe(false);
    expect(store.savedNovels).toEqual([amber]);
    expect(store.removedEntry).toBeNull();
    expect(store.savedError).toContain('Your change was not saved');
    writing.mockRestore();
    store.remove(amber.id);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Full');
    });
    expect(store.undo()).toBe(false);
    expect(store.savedNovels).toEqual([]);
    expect(store.removedEntry?.novel.id).toBe('v1');
});

it.each([
    '',
    '{broken',
    JSON.stringify({ version: 1, entries: [{ addedAt: 1, novel: { ...amber, rating: 'bad' } }] }),
])('protects unreadable or malformed storage rather than replacing it: %s', (raw) => {
    localStorage.setItem('vndb-explorer:saved:v1', raw);
    const store = useSavedStore(pinia);
    expect(store.savedError).toContain('Could not read Saved');
    expect(store.save(blue)).toBe(false);
    expect(localStorage.getItem('vndb-explorer:saved:v1')).toBe(raw);
});

it('handles read refusal without creating a successful in-memory save', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Denied');
    });
    const store = useSavedStore(pinia);
    expect(store.save(amber)).toBe(false);
    expect(store.savedNovels).toEqual([]);
    expect(store.savedError).toContain('Could not read Saved');
});

it('shares registered readonly state while storage events update other consumers', () => {
    const first = useSavedStore(pinia);
    const second = useSavedStore(pinia);
    const { entries, savedNovels } = storeToRefs(second);
    first.save(amber);
    expect(second.savedNovels).toEqual([amber]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Reflect.set(entries.value[0]!.novel, 'title', 'Changed');
    Reflect.set(entries, 'value', []);
    Reflect.set(savedNovels.value, 'length', 0);
    expect(first.savedNovels).toEqual([amber]);
    expect(warn).toHaveBeenCalled();
    localStorage.setItem(
        'vndb-explorer:saved:v1',
        JSON.stringify({
            version: 1,
            entries: [{ addedAt: 44, novel: blue }],
        })
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'vndb-explorer:saved:v1' }));
    expect(second.savedNovels).toEqual([blue]);
    expect(pinia.state.value.saved.entries[0].addedAt).toBe(44);
    disposePinia(pinia);
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(second.savedNovels).toEqual([blue]);
});

it('expires Undo after eight seconds and disposes its browser effects with the store', () => {
    vi.useFakeTimers();
    const store = useSavedStore(pinia);
    store.save(amber);
    store.remove(amber.id);
    vi.advanceTimersByTime(7999);
    expect(store.removedEntry?.novel.id).toBe('v1');
    vi.advanceTimersByTime(1);
    expect(store.removedEntry).toBeNull();
    store.save(blue);
    store.remove(blue.id);
    disposePinia(pinia);
    vi.advanceTimersByTime(8000);
    expect(store.removedEntry?.novel.id).toBe('v2');
});

it('updates saved snapshots without changing addition order and keeps failed refresh writes out of state', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(100);
    const store = useSavedStore(pinia);
    store.save(amber);
    now.mockReturnValue(200);
    store.save(blue);
    expect(store.updateSnapshots([{ ...amber, title: 'Updated Amber' }])).toBe(true);
    expect(store.entries.map((entry) => entry.addedAt)).toEqual([100, 200]);
    expect(store.savedNovels.map((novel) => novel.title)).toEqual(['Updated Amber', 'Blue']);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Full');
    });
    expect(store.updateSnapshots([{ ...amber, title: 'Unsaved refresh' }])).toBe(false);
    expect(store.savedNovels[0]?.title).toBe('Updated Amber');
});

it('restores preloaded Pinia state before exposing readonly getters and storeToRefs', () => {
    pinia.state.value.saved = {
        entries: [{ addedAt: 77, novel: amber }],
        savedError: '',
        removedEntry: null,
    };
    const store = useSavedStore(pinia);
    const { savedNovels } = storeToRefs(store);
    expectTypeOf(savedNovels.value).toEqualTypeOf<readonly DeepReadonly<IVisualNovelCard>[]>();
    expect(store.$id).toBe('saved');
    expect(savedNovels.value).toEqual([amber]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Reflect.set(savedNovels.value[0]!, 'title', 'Changed getter');
    expect(store.savedNovels[0]?.title).toBe('Amber');
    expect(warn).toHaveBeenCalled();
});
