import type { Pinia } from 'pinia';
import { defineStore } from 'pinia';
import { computed, onScopeDispose, reactive, readonly, ref } from 'vue';

import { fetchReleaseDetails, fetchReleaseDirectory } from '@/api/releases';
import { vndbRequestMessage } from '@/components/vndb-feedback/model';
import { readonlyStore } from '@/shared/utils/readonly-store';

import type { IReleaseAssignment, IReleaseDetails } from '../model';
import { newestReleases, releaseLanguageGroups } from '../model';
import {
    INCOMPLETE_RELEASE_MESSAGE,
    RELEASE_DETAIL_BATCH_SIZE,
    RELEASE_GROUPS_STORE_ID,
} from './constants';

const useMutableReleaseGroupsStore = defineStore(RELEASE_GROUPS_STORE_ID, () => {
    const directory = ref<IReleaseAssignment[]>([]);
    const manifestLoading = ref(true);
    const manifestError = ref('');
    const manifestStale = ref(false);
    const staleReleases = reactive(new Set<string>());
    const details = reactive(new Map<string, IReleaseDetails>());
    const expanded = reactive(new Set<string>());
    const loading = reactive(new Set<string>());
    const errors = reactive(new Map<string, string>());
    const groups = computed(() => readonly(releaseLanguageGroups(directory.value)));
    let controller: AbortController | undefined;
    let novelId: string | undefined;
    let queue = Promise.resolve();

    const clear = (): void => {
        controller?.abort();
        controller = undefined;
        novelId = undefined;
        queue = Promise.resolve();
        directory.value = [];
        manifestLoading.value = true;
        manifestError.value = '';
        manifestStale.value = false;
        staleReleases.clear();
        details.clear();
        expanded.clear();
        loading.clear();
        errors.clear();
    };

    const loadDirectory = async (): Promise<void> => {
        const signal = controller?.signal;
        if (!signal || !novelId) {
            return;
        }
        manifestLoading.value = true;
        manifestError.value = '';
        manifestStale.value = false;
        try {
            const result = await fetchReleaseDirectory(novelId, {
                signal,
                onStale: () => {
                    if (!signal.aborted) {
                        manifestStale.value = true;
                    }
                },
            });
            if (!signal.aborted) {
                directory.value = result;
            }
        } catch (reason) {
            if (!signal.aborted) {
                manifestError.value = vndbRequestMessage(reason);
            }
        } finally {
            if (!signal.aborted) {
                manifestLoading.value = false;
            }
        }
    };

    const loadForNovel = (id: string): Promise<void> => {
        clear();
        novelId = id;
        controller = new AbortController();
        return loadDirectory();
    };

    const loaded = (ids: readonly string[]): number => ids.filter((id) => details.has(id)).length;

    const rows = (ids: readonly string[]) =>
        readonly(
            newestReleases(
                ids.flatMap((id) => {
                    const release = details.get(id);
                    return release ? [release] : [];
                })
            )
        );

    const loadGroup = (code: string, ids: readonly string[]): void => {
        const signal = controller?.signal;
        if (!signal || loading.has(code) || loaded(ids) === ids.length) {
            return;
        }
        loading.add(code);
        errors.delete(code);
        queue = queue.then(async () => {
            try {
                while (!signal.aborted) {
                    const batch = ids
                        .filter((id) => !details.has(id))
                        .slice(0, RELEASE_DETAIL_BATCH_SIZE);
                    if (!batch.length) {
                        break;
                    }
                    const result = await fetchReleaseDetails(batch, {
                        signal,
                        onStale: () => {
                            if (!signal.aborted) {
                                for (const id of batch) {
                                    staleReleases.add(id);
                                }
                            }
                        },
                    });
                    if (signal.aborted) {
                        return;
                    }
                    for (const release of result) {
                        if (batch.includes(release.id)) {
                            details.set(release.id, release);
                        }
                    }
                    if (batch.some((id) => !details.has(id))) {
                        errors.set(code, INCOMPLETE_RELEASE_MESSAGE);
                        break;
                    }
                }
            } catch (reason) {
                if (!signal.aborted) {
                    errors.set(code, vndbRequestMessage(reason));
                }
            } finally {
                if (!signal.aborted) {
                    loading.delete(code);
                }
            }
        });
    };

    const toggle = (code: string, ids: readonly string[]): void => {
        if (expanded.has(code)) {
            expanded.delete(code);
        } else {
            expanded.add(code);
            loadGroup(code, ids);
        }
    };

    onScopeDispose(clear);

    return {
        directory,
        manifestLoading,
        manifestError,
        manifestStale,
        staleReleases,
        details,
        expanded,
        loading,
        errors,
        groups,
        loadForNovel,
        loadDirectory,
        loaded,
        rows,
        loadGroup,
        toggle,
        clear,
    };
});

export const useReleaseGroupsStore = (pinia?: Pinia) =>
    readonlyStore(useMutableReleaseGroupsStore(pinia));
