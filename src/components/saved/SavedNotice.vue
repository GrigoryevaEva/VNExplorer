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

<style scoped>
    .saved-notice {
        position: fixed;
        bottom: 80px;
        left: 50%;
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 18px;
        width: max-content;
        max-width: min(620px, calc(100% - 28px));
        padding: 14px 18px;
        font-size: var(--font-size-body);
        color: var(--mint);
        background: var(--panel);
        border: 1px solid var(--lime);
        border-radius: 6px 18px 18px;
        box-shadow: 0 8px 30px #0008;
        transform: translateX(-50%);
    }

    .saved-notice__message {
        min-width: 0;
        max-height: 35dvh;
        overflow: auto;
        line-height: 1.5;
        overflow-wrap: anywhere;
    }

    .saved-notice .button {
        flex-shrink: 0;
    }

    .saved-notice--error {
        color: var(--pink);
        border-color: var(--pink);
    }

    @media (width <= 760px) {
        .saved-notice {
            bottom: 94px;
        }
    }
</style>
