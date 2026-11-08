import { storeToRefs } from 'pinia';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useCatalogRoute } from '@/app/route';
import type { ICatalogSelection, TCatalogTagAction } from '@/entities/catalog/model';
import { CATALOG_LANGUAGES, CATALOG_PAGE_SIZE, toggleCatalogTag } from '@/entities/catalog/model';
import { useCatalogResultsStore } from '@/entities/catalog/store';
import { useTagsStore } from '@/entities/tag/store';

export const useCatalog = () => {
    const {
        applied,
        routeKey,
        readScroll,
        rememberScroll: rememberRouteScroll,
        navigate: navigateRoute,
    } = useCatalogRoute();

    const tagsOpen = ref(false);

    const draftSearch = ref(applied.value.search);

    const draftIncluded = ref([...applied.value.includedTags]);

    const draftExcluded = ref([...applied.value.excludedTags]);

    const draftStrict = ref(applied.value.strictMatch);

    const tagsStore = useTagsStore();
    const { tags } = storeToRefs(tagsStore);
    const { loadDirectory: readTagNames } = tagsStore;

    const draftLanguage = ref(applied.value.language);

    const filterDialog = ref<HTMLDialogElement>();

    const filterPanel = ref<HTMLElement>();

    const mobileFiltersOpen = ref(false);

    const results = useCatalogResultsStore();
    const {
        novels,
        loading,
        error,
        stale,
        titleMatchCount,
        count,
        more,
    } = storeToRefs(results);
    const { load: loadResults, clear: clearResults } = results;
    const grid = ref<HTMLElement>();
    let scrollRequest = 0;

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
        if (applied.value.language === CATALOG_LANGUAGES.RUSSIAN) {
            return 'Russian';
        }
        if (applied.value.language === CATALOG_LANGUAGES.ENGLISH) {
            return 'English';
        }
        return 'All languages';
    });

    const selectTag = (id: string, action: TCatalogTagAction) => {
        const next = toggleCatalogTag(
            { includedTags: draftIncluded.value, excludedTags: draftExcluded.value },
            id,
            action
        );
        draftIncluded.value = next.includedTags;
        draftExcluded.value = next.excludedTags;
    };

    const tagName = (id: string) => tags.value.find((tag) => tag.id === id)?.name ?? id;

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

    const rememberScroll = () => rememberRouteScroll(grid.value?.scrollTop ?? 0);

    const navigate = (selection: ICatalogSelection) =>
        navigateRoute(selection, grid.value?.scrollTop ?? 0);

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

    const load = async (): Promise<void> => {
        const request = ++scrollRequest;
        const scroll = readScroll();
        const completed = await loadResults(applied.value);
        if (!completed) {
            return;
        }
        await nextTick();
        if (request === scrollRequest && grid.value) {
            grid.value.scrollTop = scroll;
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
        routeKey,
        (key) => {
            if (key !== undefined) {
                void load();
            }
        },
        { immediate: true }
    );

    onBeforeUnmount(() => {
        rememberScroll();
        scrollRequest++;
        clearResults();
        closeFilters();
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
