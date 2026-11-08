<script setup lang="ts">
    import { computed, ref, watch } from 'vue';

    import type { INovelScreenshot } from '@/entities/visual-novel/model';
    import { useModalDialog } from '@/shared/composables/modal-dialog';

    import ScreenshotImage from './ScreenshotImage.vue';
    const props = defineProps<{ screenshots: readonly INovelScreenshot[] }>();
    const viewer = ref<HTMLDialogElement>();
    const {
        isOpen,
        open: openDialog,
        close,
    } = useModalDialog(viewer);
    const index = ref(0);
    const current = computed(() => props.screenshots[index.value]);
    const open = (position: number): void => {
        if (!props.screenshots[position]) {
            return;
        }
        index.value = position;
        openDialog();
    };
    const move = (step: number): void => {
        if (!props.screenshots.length) {
            return;
        }
        index.value = (index.value + step + props.screenshots.length) % props.screenshots.length;
    };
    const keyboard = (event: KeyboardEvent): void => {
        if (isOpen.value && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
        }
    };
    watch(current, (image) => {
        if (!image && isOpen.value) {
            close();
        }
    });
    defineExpose({ open });
</script>

<template>
    <dialog
        ref="viewer"
        aria-label="Screenshot viewer"
        class="screenshot-viewer"
        @keydown="keyboard"
    >
        <div class="viewer-toolbar">
            <span aria-live="polite">Screenshot {{ index + 1 }} of {{ screenshots.length }}</span>
            <button
                autofocus
                aria-label="Close viewer"
                @click="close"
            >
                Close ×
            </button>
        </div>

        <ScreenshotImage
            v-if="isOpen && current"
            :src="current.url"
            :alt="`Screenshot ${index + 1} of ${screenshots.length}`"
            :dims="current.dims"
        />

        <div class="viewer-navigation">
            <button
                aria-label="Previous screenshot"
                :disabled="screenshots.length < 2"
                @click="move(-1)"
            >
                ← Previous
            </button>
            <button
                aria-label="Next screenshot"
                :disabled="screenshots.length < 2"
                @click="move(1)"
            >
                Next →
            </button>
        </div>
    </dialog>
</template>

<style scoped>
    .screenshot-viewer {
        width: min(1400px, calc(100% - 40px));
        max-width: none;
        height: calc(100dvh - 40px);
        max-height: none;
        margin: auto;
        padding: var(--space-lg);
        color: inherit;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: 16px;
    }

    .screenshot-viewer[open] {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }

    .screenshot-viewer::backdrop {
        background: #090c09ed;
    }

    .screenshot-viewer > :deep(.screenshot-image) {
        flex: 1;
        width: 100%;
        min-height: 0;
    }

    .viewer-toolbar,
    .viewer-navigation {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-sm);
    }

    .viewer-toolbar span {
        font-size: var(--font-size-body);
        color: var(--muted);
    }

    .screenshot-viewer button {
        min-height: 44px;
        padding: 10px 18px;
        color: var(--bg);
        background: var(--mint);
        border-radius: 6px;
    }

    .screenshot-viewer button:disabled {
        opacity: 0.4;
    }

    @media (width <= 600px) {
        .screenshot-viewer {
            width: calc(100% - 16px);
            height: calc(100dvh - 16px);
            padding: var(--space-sm);
        }

        .screenshot-viewer button {
            padding: 10px 12px;
        }
    }
</style>
