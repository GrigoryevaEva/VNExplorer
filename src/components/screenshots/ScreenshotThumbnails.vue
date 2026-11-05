<script setup lang="ts">
    import type { INovelScreenshot } from '@/entities/visual-novel';

    import ScreenshotImage from './ScreenshotImage.vue';
    defineProps<{ screenshots: INovelScreenshot[] }>();
    const emit = defineEmits<{ select: [position: number] }>();
</script>

<template>
    <div class="screenshot-grid">
        <button
            v-for="(image, position) in screenshots"
            :key="image.id"
            :aria-label="`Open screenshot ${position + 1}`"
            @click="emit('select', position)"
        >
            <ScreenshotImage
                :src="image.thumbnail"
                alt=""
                :dims="image.thumbnailDimensions"
                lazy
            />
        </button>
    </div>
</template>

<style scoped>
    .screenshot-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: var(--space-md);
    }

    .screenshot-grid button {
        padding: 6px;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 12px 12px 3px;
    }

    .screenshot-grid :deep(.screenshot-image) {
        width: 100%;
        aspect-ratio: 16 / 9;
    }

    @media (width <= 600px) {
        .screenshot-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }
    }
</style>
