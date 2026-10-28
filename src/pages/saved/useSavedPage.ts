import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { isVndbCancellation } from '@/api/client';
import { fetchSavedCards } from '@/api/visual-novels';
import type { TSavedSort } from '@/stores/saved';
import { SAVED_SORTS, selectSaved, useSavedStore } from '@/stores/saved';

export const useSavedPage = () => {
    const store = useSavedStore();
    const { entries, savedNovels } = storeToRefs(store);
    const { updateSnapshots } = store;
    const search = ref('');
    const sort = ref<TSavedSort>(SAVED_SORTS.ADDED);
    const novels = computed(() => selectSaved(entries.value, search.value, sort.value));
    const refreshError = ref(false);
    const refreshing = ref(false);
    const stale = ref(false);
    const request = new AbortController();
    let generation = 0;
    const refresh = async () => {
        if (!savedNovels.value.length) {
            return;
        }
        const current = ++generation;
        refreshing.value = true;
        refreshError.value = false;
        stale.value = false;
        try {
            const cards = await fetchSavedCards(
                savedNovels.value.map((novel) => novel.id),
                {
                    signal: request.signal,
                    onStale: () => {
                        if (current === generation && !request.signal.aborted) {
                            stale.value = true;
                        }
                    },
                }
            );
            if (current === generation && !request.signal.aborted && !stale.value) {
                updateSnapshots(cards);
            }
        } catch (reason) {
            if (current === generation && !request.signal.aborted && !isVndbCancellation(reason)) {
                refreshError.value = true;
            }
        } finally {
            if (current === generation) {
                refreshing.value = false;
            }
        }
    };
    onMounted(refresh);
    onBeforeUnmount(() => {
        generation++;
        request.abort();
    });
    return { search, sort, novels, savedNovels, refreshError, refreshing, stale, refresh };
};
