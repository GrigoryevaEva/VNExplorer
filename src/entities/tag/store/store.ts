import type { Pinia } from 'pinia';
import { defineStore } from 'pinia';
import { onScopeDispose, ref } from 'vue';

import { fetchTagDirectory } from '@/api/tags';
import { readonlyStore } from '@/shared/utils/readonly-store';

import type { IDirectoryTag } from '../model';
import { TAG_DIRECTORY_ERROR_MESSAGE, TAGS_STORE_ID } from './constants';

const useMutableTagsStore = defineStore(TAGS_STORE_ID, () => {
    const tags = ref<IDirectoryTag[]>([]);
    const loading = ref(false);
    const loaded = ref(0);
    const error = ref('');
    const stale = ref(false);
    const request = new AbortController();
    let pending: Promise<void> | undefined;

    const loadDirectory = (): Promise<void> => {
        if (pending) {
            return pending;
        }
        if (request.signal.aborted) {
            return Promise.resolve();
        }
        loading.value = true;
        loaded.value = 0;
        error.value = '';
        stale.value = false;
        pending = fetchTagDirectory({
            signal: request.signal,
            onProgress: (count) => {
                if (!request.signal.aborted) {
                    loaded.value = count;
                }
            },
            onStale: () => {
                if (!request.signal.aborted) {
                    stale.value = true;
                }
            },
        })
            .then((directory) => {
                if (!request.signal.aborted) {
                    tags.value = directory;
                }
            })
            .catch(() => {
                if (!request.signal.aborted) {
                    error.value = TAG_DIRECTORY_ERROR_MESSAGE;
                }
            })
            .finally(() => {
                if (!request.signal.aborted) {
                    loading.value = false;
                }
                pending = undefined;
            });
        return pending;
    };

    onScopeDispose(() => {
        request.abort();
        loading.value = false;
    });

    return { tags, loading, loaded, error, stale, loadDirectory };
});

export const useTagsStore = (pinia?: Pinia) => readonlyStore(useMutableTagsStore(pinia));
