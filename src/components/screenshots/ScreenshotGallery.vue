<script setup lang="ts">
    import { ref } from 'vue';

    import type { INovelScreenshot } from '@/entities/visual-novel';

    import ScreenshotThumbnails from './ScreenshotThumbnails.vue';
    import ScreenshotViewer from './ScreenshotViewer.vue';
    defineProps<{ screenshots: INovelScreenshot[] }>();
    const viewer = ref<InstanceType<typeof ScreenshotViewer>>();
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
        <ScreenshotThumbnails
            v-else
            :screenshots="screenshots"
            @select="viewer?.open($event)"
        />
        <ScreenshotViewer
            ref="viewer"
            :screenshots="screenshots"
        />
    </section>
</template>
<style scoped>
    .screenshot-gallery {
        margin-top: 42px;
        padding-top: 25px;
        border-top: 1px dashed var(--line);
    }

    h2 {
        margin-bottom: var(--space-lg);
        font-size: 24px;
        letter-spacing: -0.5px;
    }

    .gallery-empty {
        line-height: 1.6;
        color: var(--muted);
    }
</style>
