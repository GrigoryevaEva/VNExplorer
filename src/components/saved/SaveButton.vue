<script setup lang="ts">
    import { computed } from 'vue';

    import type { IVisualNovelCard } from '@/entities/visual-novel';
    import { useSavedStore } from '@/stores/saved';

    interface ISaveButtonProps {
        novel: IVisualNovelCard;
    }
    const props = defineProps<ISaveButtonProps>();
    const store = useSavedStore();
    const {
        isSaved,
        save,
        remove,
    } = store;
    const saved = computed(() => isSaved(props.novel.id));
    const toggle = () => {
        if (saved.value) {
            remove(props.novel.id);
            return;
        }
        save(props.novel);
    };
</script>

<template>
    <button
        class="save-button"
        :aria-label="`${saved ? 'Saved' : 'Save'} ${novel.title}`"
        :aria-pressed="saved"
        @click.stop="toggle"
    >
        {{ saved ? 'Saved ✓' : 'Save +' }}
    </button>
</template>

<style scoped>
    .save-button {
        min-height: 36px;
        margin-top: 13px;
        padding: 8px 12px;
        font-size: var(--font-size-sm);
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
