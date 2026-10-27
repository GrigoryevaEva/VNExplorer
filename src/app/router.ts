import { createRouter, createWebHistory } from 'vue-router'
import CatalogPage from '../pages/CatalogPage.vue'
import NovelDetailsPage from '../pages/NovelDetailsPage.vue'
export const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes: [{ path: '/', name: 'catalog', component: CatalogPage }, { path: '/vn/:id', name: 'novel', component: NovelDetailsPage }] })
