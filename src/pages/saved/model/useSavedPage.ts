import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import type { TSavedSort } from '@/entities/saved/model';
import { SAVED_SORTS, selectSaved } from '@/entities/saved/model';
import { useSavedStore } from '@/entities/saved/store';

export const useSavedPage = () => {
    const store = useSavedStore();
    const {
        entries,
        savedNovels,
        refreshError,
        refreshing,
        stale,
    } = storeToRefs(store);
    const { refresh, clearRefresh } = store;
    const search = ref('');
    const sort = ref<TSavedSort>(SAVED_SORTS.ADDED);
    const novels = computed(() => selectSaved(entries.value, search.value, sort.value));

    onMounted(refresh);
    onBeforeUnmount(clearRefresh);

    return { search, sort, novels, savedNovels, refreshError, refreshing, stale, refresh };
};
