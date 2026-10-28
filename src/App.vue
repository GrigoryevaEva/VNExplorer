<script setup lang="ts">
    import { removedEntry, savedError, undoRemoval } from './modules/saved/collection';
</script>
<template>
    <div class="app-shell"
        ><header class="app-header"
            ><RouterLink
                to="/"
                class="brand"
                aria-label="VNDB Explorer home"
                ><span
                    class="brand-mark"
                    aria-hidden="true"
                    >vn<span>↗</span></span
                ><span class="brand-name"
                    >visual novel<br /><strong>EXPLORER</strong></span
                ></RouterLink
            ><nav aria-label="Main navigation"
                ><RouterLink
                    to="/"
                    class="nav-link"
                    >Catalog <span aria-hidden="true">↗</span></RouterLink
                ><RouterLink
                    to="/saved"
                    class="nav-link"
                    >Saved</RouterLink
                ></nav
            ><span class="header-note">A LITTLE ESCAPE, A GOOD STORY.</span></header
        ><main class="app-main"><RouterView /></main
        ><div
            v-if="savedError"
            class="saved-notice saved-notice--error"
            role="alert"
            ><span class="saved-notice__message">{{ savedError }}</span></div
        ><div
            v-else-if="removedEntry"
            class="saved-notice"
            role="status"
            ><span class="saved-notice__message">Removed {{ removedEntry.novel.title }}</span
            ><button
                class="button button--lime"
                @click="undoRemoval"
                >Undo</button
            ></div
        ></div
    >
</template>
