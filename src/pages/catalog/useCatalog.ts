import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { fetchCatalogSelection, fetchTitleMatchCount, needsTitleMatchCount } from '@/api/catalog';
import { isVndbCancellation } from '@/api/client';
import { vndbRequestMessage } from '@/components/vndb-feedback';
import type { ICatalogSelection } from '@/entities/catalog';
import { CATALOG_PAGE_SIZE } from '@/entities/catalog';
import type { IVisualNovelCard } from '@/entities/visual-novel';
import { loadTagDirectory } from '@/modules/tags/directory';

import { TITLE_MATCH_ERROR_MESSAGE } from './constants';
import { selectionFromQuery, selectionToQuery } from './route';

export const useCatalog = () => {
    const route = useRoute();

    const router = useRouter();

    const applied = computed(() => selectionFromQuery(route.query));

    const tagsOpen = ref(false);

    const draftSearch = ref(applied.value.search);

    const draftIncluded = ref([...applied.value.includedTags]);

    const draftExcluded = ref([...applied.value.excludedTags]);

    const draftStrict = ref(applied.value.strictMatch);

    const tagNames = ref<Record<string, string>>({});

    const draftLanguage = ref(applied.value.language);

    const filterDialog = ref<HTMLDialogElement>();

    const filterPanel = ref<HTMLElement>();

    const mobileFiltersOpen = ref(false);

    const novels = ref<IVisualNovelCard[]>([]);

    const loading = ref(true);

    const error = ref('');

    const stale = ref(false);

    const titleMatchCount = ref<number | undefined>();

    const count = ref<number | undefined>();

    const more = ref(false);

    const grid = ref<HTMLElement>();

    let controller: AbortController | undefined;

    let generation = 0;

    const totalPages = computed(() =>
        Math.max(
            1,
            count.value === undefined
                ? applied.value.page + Number(more.value)
                : Math.ceil(count.value / CATALOG_PAGE_SIZE)
        ));

    const pageNumbers = computed(() =>
        [
            ...new Set([
                1,
                ...Array.from({ length: 3 }, (_, index) => applied.value.page + index - 1),
                totalPages.value,
            ]),
        ]
            .filter((page) => page >= 1 && page <= totalPages.value)
            .sort((a, b) => a - b));

    const resultCountLabel = computed(() => {
        if (loading.value) {
            return 'Loading stories…';
        }
        if (error.value) {
            return 'Connection interrupted';
        }
        if (count.value === undefined) {
            return `${novels.value.length} stories on this page`;
        }
        return `${count.value.toLocaleString('en')} stories`;
    });

    const selectionLanguageLabel = computed(() => {
        if (applied.value.language === 'ru') {
            return 'Russian';
        }
        if (applied.value.language === 'en') {
            return 'English';
        }
        return 'All languages';
    });

    const selectTag = (id: string, action: 'include' | 'exclude') => {
        const active = (action === 'include' ? draftIncluded : draftExcluded).value.includes(id);
        draftIncluded.value = draftIncluded.value.filter((tag) => tag !== id);
        draftExcluded.value = draftExcluded.value.filter((tag) => tag !== id);
        if (!active) {
            (action === 'include' ? draftIncluded : draftExcluded).value.push(id);
        }
    };

    const tagName = (id: string) => tagNames.value[id] ?? id;

    const readTagNames = async () => {
        try {
            const tags = await loadTagDirectory(() => {});
            tagNames.value = Object.fromEntries(tags.map((tag) => [tag.id, tag.name]));
        } catch {
            /* The picker exposes retry if loading fails. */
        }
    };

    const closeFilters = () => {
        filterDialog.value?.close();
        mobileFiltersOpen.value = false;
    };

    const openFilters = () => {
        mobileFiltersOpen.value = true;
        filterDialog.value?.showModal();
    };

    const applyFilters = () => {
        void navigate({
            ...applied.value,
            language: draftLanguage.value,
            includedTags: [...draftIncluded.value],
            excludedTags: [...draftExcluded.value],
            strictMatch: draftStrict.value,
            page: 1,
        });
        closeFilters();
    };

    const bindGrid = (element: unknown) => {
        grid.value = element instanceof HTMLElement ? element : undefined;
    };

    const rememberScroll = () => {
        // Vue Router keeps each navigation entry's state when going Back/Forward.
        window.history.replaceState(
            { ...window.history.state, catalogScroll: grid.value?.scrollTop ?? 0 },
            ''
        );
    };

    const navigate = async (selection: ICatalogSelection) => {
        rememberScroll();
        await router.push({ query: selectionToQuery(selection), state: { catalogScroll: 0 } });
    };

    const submit = () => {
        void navigate({ ...applied.value, search: draftSearch.value.trim(), page: 1 });
    };

    const changeSort = (event: Event) => {
        void navigate({
            ...applied.value,
            sort: (event.target as HTMLSelectElement).value as ICatalogSelection['sort'],
            page: 1,
        });
    };

    const load = async () => {
        const request = ++generation;
        controller?.abort();
        controller = new AbortController();
        const selection = { ...applied.value };
        const scroll = Number(window.history.state?.catalogScroll ?? 0);
        let checkingTitleMatches = false;
        loading.value = true;
        error.value = '';
        stale.value = false;
        titleMatchCount.value = undefined;
        try {
            const response = await fetchCatalogSelection(selection, {
                signal: controller.signal,
                onStale: () => {
                    if (request === generation) {
                        stale.value = true;
                    }
                },
            });
            if (request !== generation) {
                return;
            }
            novels.value = response.results;
            count.value = response.count;
            more.value = response.more;
            if (!response.results.length && needsTitleMatchCount(selection)) {
                checkingTitleMatches = true;
                const matches = await fetchTitleMatchCount(selection.search, {
                    signal: controller.signal,
                    onStale: () => {
                        if (request === generation) {
                            stale.value = true;
                        }
                    },
                });
                if (request !== generation) {
                    return;
                }
                titleMatchCount.value = matches;
            }
        } catch (reason) {
            if (request !== generation || isVndbCancellation(reason)) {
                return;
            }
            error.value = checkingTitleMatches
                ? TITLE_MATCH_ERROR_MESSAGE
                : vndbRequestMessage(reason);
        } finally {
            if (request === generation) {
                loading.value = false;
                await nextTick();
                if (grid.value) {
                    grid.value.scrollTop = scroll;
                }
            }
        }
    };

    watch(
        () => [...draftIncluded.value, ...draftExcluded.value].join(),
        (ids) => {
            if (ids) {
                void readTagNames();
            }
        },
        { immediate: true }
    );

    watch(
        () =>
            JSON.stringify([
                applied.value.includedTags,
                applied.value.excludedTags,
                applied.value.strictMatch,
            ]),
        () => {
            draftIncluded.value = [...applied.value.includedTags];
            draftExcluded.value = [...applied.value.excludedTags];
            draftStrict.value = applied.value.strictMatch;
        }
    );

    watch(
        () => applied.value.search,
        (search) => {
            draftSearch.value = search;
        }
    );

    watch(
        () => applied.value.language,
        (language) => {
            draftLanguage.value = language;
        }
    );

    watch(
        () => route.fullPath,
        () => {
            void load();
        },
        { immediate: true }
    );

    onBeforeUnmount(() => {
        rememberScroll();
        generation++;
        controller?.abort();
    });

    return {
        tagsOpen,
        applied,
        draftSearch,
        draftIncluded,
        draftExcluded,
        draftStrict,
        selectTag,
        tagName,
        readTagNames,
        draftLanguage,
        filterDialog,
        filterPanel,
        mobileFiltersOpen,
        closeFilters,
        openFilters,
        applyFilters,
        novels,
        loading,
        error,
        stale,
        titleMatchCount,
        count,
        more,
        bindGrid,
        pageNumbers,
        rememberScroll,
        navigate,
        submit,
        changeSort,
        load,
        resultCountLabel,
        selectionLanguageLabel,
    };
};
