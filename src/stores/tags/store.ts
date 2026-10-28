import type { Pinia } from 'pinia';
import { defineStore } from 'pinia';
import type { DeepReadonly } from 'vue';
import { readonly, ref } from 'vue';

import { fetchTagDirectory } from '@/api/tags';
import type { IDirectoryTag } from '@/entities/tag';

import { TAG_DIRECTORY_ERROR_MESSAGE, TAGS_STORE_ID } from './constants';

const useMutableTagsStore = defineStore(TAGS_STORE_ID, () => {
    const tags = ref<IDirectoryTag[]>([]);
    const loading = ref(false);
    const loaded = ref(0);
    const error = ref('');
    const stale = ref(false);
    let pending: Promise<void> | undefined;

    const loadDirectory = (): Promise<void> => {
        if (pending) {
            return pending;
        }
        loading.value = true;
        loaded.value = 0;
        error.value = '';
        stale.value = false;
        pending = fetchTagDirectory({
            onProgress: (count) => {
                loaded.value = count;
            },
            onStale: () => {
                stale.value = true;
            },
        })
            .then((directory) => {
                tags.value = directory;
            })
            .catch(() => {
                error.value = TAG_DIRECTORY_ERROR_MESSAGE;
            })
            .finally(() => {
                loading.value = false;
                pending = undefined;
            });
        return pending;
    };

    return { tags, loading, loaded, error, stale, loadDirectory };
});

type TTagsStore = ReturnType<typeof useMutableTagsStore>;
type TReadonlyTagsStore = Omit<TTagsStore, keyof TTagsStore['$state'] | '$state'> &
    DeepReadonly<TTagsStore['$state']> & {
        readonly $state: DeepReadonly<TTagsStore['$state']>;
    };

// Register mutable refs with Pinia first. Readonly setup refs would prevent
// restoration. Preserve Pinia's markRaw metadata types: Vue's general readonly
// inference unwraps its private Pinia refs even though markRaw prevents that.
export const useTagsStore = (pinia?: Pinia): TReadonlyTagsStore =>
    readonly(useMutableTagsStore(pinia)) as unknown as TReadonlyTagsStore;
