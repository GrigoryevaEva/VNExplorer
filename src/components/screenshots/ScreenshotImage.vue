<script setup lang="ts">
    import { ref, watch } from 'vue';

    import { SCREENSHOT_IMAGE_MESSAGES } from './constants';

    type TImageState = 'loading' | 'loaded' | 'failed';

    const props = defineProps<{
        src: string;
        alt: string;
        dims: [number, number];
        lazy?: boolean;
    }>();
    const image = ref<HTMLImageElement>();
    const state = ref<TImageState>('loading');

    const loaded = (event: Event): void => {
        if (event.currentTarget === image.value) {
            state.value = 'loaded';
        }
    };
    const failed = (event: Event): void => {
        if (event.currentTarget === image.value) {
            state.value = 'failed';
        }
    };

    watch(
        () => props.src,
        (src) => {
            state.value = src ? 'loading' : 'failed';
        },
        { immediate: true }
    );
</script>

<template>
    <div class="screenshot-image">
        <img
            v-if="state !== 'failed'"
            ref="image"
            :key="src"
            :src="src"
            :alt="alt"
            :width="dims[0]"
            :height="dims[1]"
            :loading="lazy ? 'lazy' : 'eager'"
            @load="loaded"
            @error="failed"
        />
        <span
            v-if="state !== 'loaded'"
            role="status"
            class="image-message"
            >{{ SCREENSHOT_IMAGE_MESSAGES[state] }}</span
        >
    </div>
</template>

<style scoped>
    .screenshot-image {
        position: relative;
        min-width: 0;
        min-height: 0;
        background: var(--panel);
    }

    img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .image-message {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 12px;
        font-size: 12px;
        text-align: center;
        color: var(--muted);
        background: var(--panel);
    }
</style>
