import { createRouter, createWebHistory } from 'vue-router';

import { CatalogPage } from '@/pages/catalog';
import { SavedPage } from '@/pages/saved';

import NovelDetailsPage from '../pages/NovelDetailsPage.vue';
export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/saved', name: 'saved', component: SavedPage },
        { path: '/', name: 'catalog', component: CatalogPage },
        { path: '/vn/:id', name: 'novel', component: NovelDetailsPage },
    ],
});
