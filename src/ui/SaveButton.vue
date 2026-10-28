<script setup lang="ts">
    import { isSaved, toggleSaved } from '../modules/saved/collection';
    import type { VisualNovelCard } from '../modules/vndb/types';
    defineProps<{ novel: VisualNovelCard }>();
</script>

<template>
    <button
        class="save-button"
        :aria-label="`${isSaved(novel.id) ? 'Saved' : 'Save'} ${novel.title}`"
        :aria-pressed="isSaved(novel.id)"
        @click.stop="toggleSaved(novel)"
        >{{ isSaved(novel.id) ? 'Saved ✓' : 'Save +' }}</button
    >
</template>

<style scoped>
    .save-button {
        min-height: 36px;
        margin-top: 13px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: bold;
        color: var(--mint);
        background: transparent;
        border: 1px solid #819377;
        border-radius: 4px 12px 12px;
    }

    .save-button[aria-pressed='true'] {
        color: var(--bg);
        background: var(--lime);
        border-color: var(--lime);
    }
</style>
