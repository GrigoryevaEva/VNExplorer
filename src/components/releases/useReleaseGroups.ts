import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

import { fetchReleaseDetails, fetchReleaseDirectory } from '@/api/releases';
import { vndbRequestMessage } from '@/components/vndb-feedback';
import type { IReleaseAssignment, IReleaseDetails } from '@/entities/release';
import { newestReleases, releaseLanguageGroups } from '@/entities/release';

import { INCOMPLETE_RELEASE_MESSAGE, RELEASE_DETAIL_BATCH_SIZE } from './constants';

export const useReleaseGroups = (novelId: string) => {
    const directory = ref<IReleaseAssignment[]>([]);
    const manifestLoading = ref(true);
    const manifestError = ref('');
    const manifestStale = ref(false);
    const staleReleases = reactive(new Set<string>());
    const details = reactive(new Map<string, IReleaseDetails>());
    const expanded = reactive(new Set<string>());
    const loading = reactive(new Set<string>());
    const errors = reactive(new Map<string, string>());
    const controller = new AbortController();
    let queue = Promise.resolve();
    const groups = computed(() => releaseLanguageGroups(directory.value));
    const message = (reason: unknown) => {
        if (reason instanceof Error && reason.message === INCOMPLETE_RELEASE_MESSAGE) {
            return reason.message;
        }
        return vndbRequestMessage(reason);
    };
    const loadDirectory = async () => {
        manifestLoading.value = true;
        manifestError.value = '';
        manifestStale.value = false;
        try {
            directory.value = await fetchReleaseDirectory(novelId, {
                signal: controller.signal,
                onStale: () => {
                    manifestStale.value = true;
                },
            });
        } catch (reason) {
            if (!controller.signal.aborted) {
                manifestError.value = message(reason);
            }
        } finally {
            manifestLoading.value = false;
        }
    };
    const loaded = (ids: string[]) => {
        return ids.filter((id) => details.has(id)).length;
    };
    const rows = (ids: string[]) => {
        return newestReleases(ids.flatMap((id) => (details.has(id) ? [details.get(id)!] : [])));
    };
    const loadGroup = (code: string, ids: string[]) => {
        if (loading.has(code) || loaded(ids) === ids.length) {
            return;
        }
        loading.add(code);
        errors.delete(code);
        queue = queue.then(async () => {
            try {
                while (!controller.signal.aborted) {
                    const batch = ids
                        .filter((id) => !details.has(id))
                        .slice(0, RELEASE_DETAIL_BATCH_SIZE);
                    if (!batch.length) {
                        break;
                    }
                    const result = await fetchReleaseDetails(batch, {
                        signal: controller.signal,
                        onStale: () => {
                            for (const id of batch) {
                                staleReleases.add(id);
                            }
                        },
                    });
                    for (const release of result) {
                        if (batch.includes(release.id)) {
                            details.set(release.id, release);
                        }
                    }
                    if (batch.some((id) => !details.has(id))) {
                        throw new Error(INCOMPLETE_RELEASE_MESSAGE);
                    }
                }
            } catch (reason) {
                if (!controller.signal.aborted) {
                    errors.set(code, message(reason));
                }
            } finally {
                loading.delete(code);
            }
        });
    };
    const toggle = (code: string, ids: string[]) => {
        if (expanded.has(code)) {
            expanded.delete(code);
        } else {
            expanded.add(code);
            loadGroup(code, ids);
        }
    };
    onMounted(loadDirectory);
    onBeforeUnmount(() => controller.abort());

    return {
        manifestLoading,
        manifestError,
        manifestStale,
        staleReleases,
        expanded,
        loading,
        errors,
        groups,
        loadDirectory,
        loaded,
        rows,
        loadGroup,
        toggle,
    };
};
