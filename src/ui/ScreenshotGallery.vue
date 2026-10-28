<script setup lang="ts">
    import { computed, onBeforeUnmount, ref } from 'vue';

    import type { Screenshot } from '../modules/vndb/details';
    import ScreenshotImage from './ScreenshotImage.vue';

    const props = defineProps<{ screenshots: Screenshot[] }>();
    const viewer = ref<HTMLDialogElement>();
    const isOpen = ref(false);
    const index = ref(0);
    const current = computed(() => props.screenshots[index.value]);
    let trigger: HTMLElement | null = null;
    let scroll = 0;
    let previousOverflow = '';
    function open(position: number) {
        trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        scroll = window.scrollY;
        previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        index.value = position;
        isOpen.value = true;
        viewer.value?.showModal();
    }
    function restore() {
        isOpen.value = false;
        document.documentElement.style.overflow = previousOverflow;
        trigger?.focus({ preventScroll: true });
        window.scrollTo({ top: scroll, behavior: 'instant' });
        trigger = null;
    }
    function keyboard(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
        }
        if (event.key === 'Tab') {
            const controls =
                viewer.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
            const first = controls?.[0];
            const last = controls?.[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        }
    }
    onBeforeUnmount(() => {
        if (viewer.value?.open) {
            restore();
        }
    });
    function move(step: number) {
        index.value = (index.value + step + props.screenshots.length) % props.screenshots.length;
    }
</script>

<template>
    <section
        class="screenshot-gallery"
        aria-labelledby="screenshots-heading"
    >
        <h2 id="screenshots-heading">Screenshots</h2>
        <p
            v-if="!screenshots.length"
            class="gallery-empty"
            >No screenshots available.</p
        >
        <div
            v-else
            class="screenshot-grid"
        >
            <button
                v-for="(image, position) in screenshots"
                :key="image.id"
                :aria-label="`Open screenshot ${position + 1}`"
                @click="open(position)"
            >
                <ScreenshotImage
                    :src="image.thumbnail"
                    alt=""
                    :dims="image.thumbnail_dims"
                    lazy
                />
            </button>
        </div>
        <dialog
            ref="viewer"
            aria-label="Screenshot viewer"
            class="screenshot-viewer"
            @keydown="keyboard"
            @close="restore"
        >
            <div class="viewer-toolbar"
                ><span aria-live="polite"
                    >Screenshot {{ index + 1 }} of {{ screenshots.length }}</span
                ><button
                    autofocus
                    aria-label="Close viewer"
                    @click="viewer?.close()"
                    >Close ×</button
                ></div
            >
            <ScreenshotImage
                v-if="isOpen && current"
                :src="current.url"
                :alt="`Screenshot ${index + 1} of ${screenshots.length}`"
                :dims="current.dims"
            />
            <div class="viewer-navigation"
                ><button
                    aria-label="Previous screenshot"
                    :disabled="screenshots.length < 2"
                    @click="move(-1)"
                    >← Previous</button
                ><button
                    aria-label="Next screenshot"
                    :disabled="screenshots.length < 2"
                    @click="move(1)"
                    >Next →</button
                ></div
            >
        </dialog>
    </section>
</template>

<style scoped>
    .screenshot-gallery {
        margin-top: 42px;
        padding-top: 25px;
        border-top: 1px dashed var(--line);
    }

    h2 {
        margin-bottom: 20px;
        font-size: 24px;
        letter-spacing: -0.5px;
    }

    .gallery-empty {
        line-height: 1.6;
        color: var(--muted);
    }

    .screenshot-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px;
    }

    .screenshot-grid button {
        padding: 6px;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 12px 12px 3px;
    }

    .screenshot-grid .screenshot-image {
        width: 100%;
        aspect-ratio: 16 / 9;
    }

    .screenshot-viewer {
        width: min(1400px, calc(100% - 40px));
        max-width: none;
        height: calc(100dvh - 40px);
        max-height: none;
        margin: auto;
        padding: 20px;
        color: inherit;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: 16px;
    }

    .screenshot-viewer[open] {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .screenshot-viewer::backdrop {
        background: #090c09ed;
    }

    .screenshot-viewer > .screenshot-image {
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
        gap: 12px;
    }

    .viewer-toolbar span {
        font-size: 13px;
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
        .screenshot-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }

        .screenshot-viewer {
            width: calc(100% - 16px);
            height: calc(100dvh - 16px);
            padding: 12px;
        }

        .screenshot-viewer button {
            padding: 10px 12px;
        }
    }
</style>
