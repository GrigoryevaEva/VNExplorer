import { createRouter, createWebHistory } from 'vue-router'
import CatalogPage from '../pages/CatalogPage.vue'
export const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes: [{ path: '/', name: 'catalog', component: CatalogPage }] })
