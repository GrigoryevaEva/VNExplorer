<script setup lang="ts">
    import { storeToRefs } from 'pinia';

    import { useSavedStore } from '@/stores/saved';

    const store = useSavedStore();
    const { removedEntry, savedError } = storeToRefs(store);
    const { undo } = store;
</script>
<template>
    <div
        v-if="savedError"
        class="saved-notice saved-notice--error"
        role="alert"
        ><span class="saved-notice__message">{{ savedError }}</span></div
    >
    <div
        v-else-if="removedEntry"
        class="saved-notice"
        role="status"
        ><span class="saved-notice__message">Removed {{ removedEntry.novel.title }}</span
        ><button
            class="button button--lime"
            @click="undo"
            >Undo</button
        ></div
    >
</template>
