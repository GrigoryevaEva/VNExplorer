import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';

import type { ICatalogSelection } from '@/entities/catalog/model';
import { createCatalogSelection } from '@/entities/catalog/model';

import { selectionFromQuery, selectionToQuery } from './catalog-query';
import { CATALOG_HISTORY_PATTERN } from './constants';

export const catalogTagLocation = (id: string): RouteLocationRaw => ({
    name: 'catalog',
    query: selectionToQuery({ ...createCatalogSelection(), includedTags: [id] }),
});

export const useCatalogRoute = () => {
    const route = useRoute();
    const router = useRouter();
    const applied = computed(() => selectionFromQuery(route.query));
    const routeKey = computed(() => (route.name === 'catalog' ? route.fullPath : undefined));

    const readScroll = (): number => Number(window.history.state?.catalogScroll ?? 0);

    const rememberScroll = (top: number): void => {
        if (route.name !== 'catalog') {
            return;
        }
        // Keep the position on this history entry for Back/Forward.
        window.history.replaceState({ ...window.history.state, catalogScroll: top }, '');
    };

    const navigate = async (selection: ICatalogSelection, top: number): Promise<void> => {
        rememberScroll(top);
        await router.push({ query: selectionToQuery(selection), state: { catalogScroll: 0 } });
    };

    return { applied, routeKey, readScroll, rememberScroll, navigate };
};

export const useCatalogReturn = () => {
    const router = useRouter();

    return (event: MouseEvent): void => {
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
};
