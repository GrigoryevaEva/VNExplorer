import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { NOVEL_ID_PATTERN } from './constants';

export const useNovelRouteId = () => {
    const route = useRoute();

    return computed(() => {
        const id = String(route.params.id);
        return NOVEL_ID_PATTERN.test(id) ? id : null;
    });
};
