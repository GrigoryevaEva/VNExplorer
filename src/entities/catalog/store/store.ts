import type { Pinia } from 'pinia';
import { defineStore } from 'pinia';
import { onScopeDispose, ref } from 'vue';

import { fetchCatalogSelection, fetchTitleMatchCount, needsTitleMatchCount } from '@/api/catalog';
import { isVndbCancellation } from '@/api/client';
import { vndbRequestMessage } from '@/components/vndb-feedback/model';
import type { IVisualNovelCard } from '@/entities/visual-novel/model';
import { readonlyStore } from '@/shared/utils/readonly-store';

import type { ICatalogSelection } from '../model';
import { CATALOG_RESULTS_STORE_ID, TITLE_MATCH_ERROR_MESSAGE } from './constants';

const useMutableCatalogResultsStore = defineStore(CATALOG_RESULTS_STORE_ID, () => {
    const novels = ref<IVisualNovelCard[]>([]);
    const loading = ref(true);
    const error = ref('');
    const stale = ref(false);
    const titleMatchCount = ref<number>();
    const count = ref<number>();
    const more = ref(false);
    let controller: AbortController | undefined;

    const clear = (): void => {
        controller?.abort();
        controller = undefined;
        novels.value = [];
        loading.value = true;
        error.value = '';
        stale.value = false;
        titleMatchCount.value = undefined;
        count.value = undefined;
        more.value = false;
    };

    const load = async (selection: ICatalogSelection): Promise<boolean> => {
        controller?.abort();
        const request = new AbortController();
        controller = request;
        let checkingTitleMatches = false;
        loading.value = true;
        error.value = '';
        stale.value = false;
        titleMatchCount.value = undefined;
        const options = {
            signal: request.signal,
            onStale: () => {
                if (!request.signal.aborted) {
                    stale.value = true;
                }
            },
        };

        try {
            const response = await fetchCatalogSelection(selection, options);
            if (request.signal.aborted) {
                return false;
            }
            novels.value = response.results;
            count.value = response.count;
            more.value = response.more;
            if (!response.results.length && needsTitleMatchCount(selection)) {
                checkingTitleMatches = true;
                const matches = await fetchTitleMatchCount(selection.search, options);
                if (!request.signal.aborted) {
                    titleMatchCount.value = matches;
                }
            }
        } catch (reason) {
            if (!request.signal.aborted && !isVndbCancellation(reason)) {
                error.value = checkingTitleMatches
                    ? TITLE_MATCH_ERROR_MESSAGE
                    : vndbRequestMessage(reason);
            }
        } finally {
            if (!request.signal.aborted) {
                loading.value = false;
                controller = undefined;
            }
        }
        return !request.signal.aborted;
    };

    onScopeDispose(clear);

    return { novels, loading, error, stale, titleMatchCount, count, more, load, clear };
});

export const useCatalogResultsStore = (pinia?: Pinia) =>
    readonlyStore(useMutableCatalogResultsStore(pinia));
