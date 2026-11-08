import type { Pinia } from 'pinia';
import { defineStore } from 'pinia';
import { computed, onScopeDispose, readonly, ref } from 'vue';

import { isVndbCancellation } from '@/api/client';
import { fetchNovelDetails } from '@/api/visual-novels';
import { vndbRequestMessage } from '@/components/vndb-feedback/model';
import { readonlyStore } from '@/shared/utils/readonly-store';

import type { IVisualNovelDetails } from '../model';
import { alternativeTitles, spoilerFreeTags } from '../model';
import { NOVEL_DETAILS_STORE_ID } from './constants';

const useMutableNovelDetailsStore = defineStore(NOVEL_DETAILS_STORE_ID, () => {
    const novel = ref<IVisualNovelDetails | null>(null);
    const loading = ref(false);
    const error = ref('');
    const stale = ref(false);
    const titles = computed(() => readonly(novel.value ? alternativeTitles(novel.value) : []));
    const tags = computed(() => readonly(novel.value ? spoilerFreeTags(novel.value) : []));
    let controller: AbortController | undefined;
    let currentId: string | null = null;
    let disposed = false;

    const clear = (): void => {
        controller?.abort();
        controller = undefined;
        currentId = null;
        novel.value = null;
        loading.value = false;
        error.value = '';
        stale.value = false;
    };

    const load = async (id: string | null): Promise<void> => {
        if (disposed) {
            return;
        }
        clear();
        if (!id) {
            return;
        }
        currentId = id;
        const request = new AbortController();
        controller = request;
        loading.value = true;
        try {
            const result = await fetchNovelDetails(id, {
                signal: request.signal,
                onStale: () => {
                    if (!request.signal.aborted) {
                        stale.value = true;
                    }
                },
            });
            if (!request.signal.aborted) {
                novel.value = result;
            }
        } catch (reason) {
            if (!request.signal.aborted && !isVndbCancellation(reason)) {
                error.value = vndbRequestMessage(reason);
            }
        } finally {
            if (!request.signal.aborted) {
                controller = undefined;
                loading.value = false;
            }
        }
    };

    const retry = (): Promise<void> => load(currentId);

    onScopeDispose(() => {
        disposed = true;
        clear();
    });

    return { novel, loading, error, stale, titles, tags, load, retry, clear };
});

export const useNovelDetailsStore = (pinia?: Pinia) =>
    readonlyStore(useMutableNovelDetailsStore(pinia));
