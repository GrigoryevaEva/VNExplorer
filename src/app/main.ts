import '@/shared/ui/styles/nullification.css';
import '@/shared/ui/styles/theme.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { router } from './route/router';

createApp(App).use(createPinia()).use(router).mount('#app');
