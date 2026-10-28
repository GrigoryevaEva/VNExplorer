import type { Pinia } from 'pinia';
import { defineStore } from 'pinia';
import type { DeepReadonly } from 'vue';
import { computed, readonly, ref } from 'vue';

import { useEventListener, useTimeoutFn } from '@vueuse/core';

import type { IVisualNovelCard } from '@/entities/visual-novel';

import {
    SAVED_READ_ERROR_MESSAGE,
    SAVED_STORAGE_KEY,
    SAVED_STORE_ID,
    SAVED_UNDO_TIMEOUT_MS,
    SAVED_WRITE_ERROR_MESSAGE,
} from './constants';
import { readSavedCollection, snapshotNovel, writeSavedCollection } from './persistence';
import type { ISavedEntry } from './types';

const useMutableSavedStore = defineStore(SAVED_STORE_ID, () => {
    const entries = ref<ISavedEntry[]>([]);
    const savedError = ref('');
    const removedEntry = ref<ISavedEntry | null>(null);
    let readable = true;
    const savedNovels = computed(() => readonly(entries.value.map((entry) => entry.novel)));
    const { start, stop } = useTimeoutFn(
        () => {
            removedEntry.value = null;
        },
        SAVED_UNDO_TIMEOUT_MS,
        { immediate: false }
    );

    const readCollection = () => {
        const result = readSavedCollection();
        readable = result.ok;
        if (!result.ok) {
            savedError.value = SAVED_READ_ERROR_MESSAGE;
            return;
        }
        entries.value = result.entries;
        savedError.value = '';
    };
    const persist = (next: ISavedEntry[]): boolean => {
        if (!readable) {
            return false;
        }
        if (!writeSavedCollection(next)) {
            savedError.value = SAVED_WRITE_ERROR_MESSAGE;
            return false;
        }
        entries.value = next;
        savedError.value = '';
        return true;
    };
    const isSaved = (id: string): boolean => entries.value.some((entry) => entry.novel.id === id);
    const save = (novel: IVisualNovelCard): boolean => {
        if (isSaved(novel.id)) {
            return true;
        }
        return persist([...entries.value, { addedAt: Date.now(), novel: snapshotNovel(novel) }]);
    };
    const remove = (id: string): boolean => {
        const existing = entries.value.find((entry) => entry.novel.id === id);
        if (!existing) {
            return true;
        }
        if (!persist(entries.value.filter((entry) => entry.novel.id !== id))) {
            return false;
        }
        removedEntry.value = existing;
        start();
        return true;
    };
    const undo = (): boolean => {
        const entry = removedEntry.value;
        if (!entry) {
            return true;
        }
        if (!isSaved(entry.novel.id) && !persist([...entries.value, entry])) {
            return false;
        }
        stop();
        removedEntry.value = null;
        return true;
    };

    const updateSnapshots = (novels: readonly IVisualNovelCard[]): boolean => {
        const byId = new Map(novels.map((novel) => [novel.id, novel]));
        const next = entries.value.map((entry) => ({
            ...entry,
            novel: byId.has(entry.novel.id)
                ? snapshotNovel(byId.get(entry.novel.id)!)
                : entry.novel,
        }));
        return JSON.stringify(next) === JSON.stringify(entries.value) || persist(next);
    };

    readCollection();
    useEventListener(window, 'storage', (event) => {
        if (event.key === SAVED_STORAGE_KEY || event.key === null) {
            readCollection();
        }
    });
    return {
        entries,
        savedNovels,
        savedError,
        removedEntry,
        isSaved,
        save,
        remove,
        undo,
        updateSnapshots,
    };
});

type TSavedStore = ReturnType<typeof useMutableSavedStore>;
type TReadonlySavedStore = Omit<TSavedStore, keyof TSavedStore['$state'] | '$state'> &
    DeepReadonly<TSavedStore['$state']> & { readonly $state: DeepReadonly<TSavedStore['$state']> };

// As with the tags store, retain Pinia's markRaw metadata while making public state readonly.
export const useSavedStore = (pinia?: Pinia): TReadonlySavedStore =>
    readonly(useMutableSavedStore(pinia)) as unknown as TReadonlySavedStore;
