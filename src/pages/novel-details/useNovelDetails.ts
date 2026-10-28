import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { isVndbCancellation } from '@/api/client';
import { fetchNovelDetails } from '@/api/visual-novels';
import { vndbRequestMessage } from '@/components/vndb-feedback';
import { createCatalogSelection } from '@/entities/catalog';
import type { IVisualNovelDetails } from '@/entities/visual-novel';
import { alternativeTitles, spoilerFreeTags } from '@/entities/visual-novel';
import { selectionToQuery } from '@/pages/catalog/route';

import { CATALOG_HISTORY_PATTERN, NOVEL_ID_PATTERN } from './constants';

export const catalogTagQuery = (id: string) =>
    selectionToQuery({ ...createCatalogSelection(), includedTags: [id] });

export const useNovelDetails = () => {
    const route = useRoute();
    const router = useRouter();
    const novel = ref<IVisualNovelDetails | null>(null);
    const loading = ref(false);
    const error = ref('');
    const stale = ref(false);
    const titles = computed(() => (novel.value ? alternativeTitles(novel.value) : []));
    const tags = computed(() => (novel.value ? spoilerFreeTags(novel.value) : []));
    let controller: AbortController | undefined;

    const returnToCatalog = (event: MouseEvent) => {
        const previous: unknown = window.history.state?.back;
        if (
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            !event.altKey &&
            typeof previous === 'string' &&
            CATALOG_HISTORY_PATTERN.test(previous)
        ) {
            event.preventDefault();
            router.back();
        }
    };
    const load = async () => {
        controller?.abort();
        const request = new AbortController();
        controller = request;
        novel.value = null;
        error.value = '';
        stale.value = false;
        const id = String(route.params.id);
        if (!NOVEL_ID_PATTERN.test(id)) {
            loading.value = false;
            return;
        }
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
                loading.value = false;
            }
        }
    };
    watch(() => route.params.id, load, { immediate: true });
    onBeforeUnmount(() => controller?.abort());
    return { novel, loading, error, stale, titles, tags, load, returnToCatalog };
};
