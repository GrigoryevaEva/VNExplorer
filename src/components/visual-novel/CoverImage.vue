<script setup lang="ts">
    import { computed, ref, watch } from 'vue';

    import { MIN_CARD_ASPECT_RATIO } from './constants';

    const props = defineProps<{
        src?: string | null;
        title: string;
        mode?: 'card';
        dims?: [number, number];
    }>();
    const failed = ref(false);
    const loaded = ref(false);
    const naturalRatio = ref<number>();
    const cardRatio = computed(() => {
        const [width, height] = props.dims ?? [];
        const ratio =
            width && height && width > 0 && height > 0 ? width / height : naturalRatio.value;
        return Math.max(
            MIN_CARD_ASPECT_RATIO,
            ratio && Number.isFinite(ratio) ? ratio : MIN_CARD_ASPECT_RATIO
        );
    });
    const onLoad = (event: Event): void => {
        const image = event.target as HTMLImageElement;
        naturalRatio.value = image.naturalWidth / image.naturalHeight;
        loaded.value = true;
    };
    watch(
        () => props.src,
        () => {
            failed.value = false;
            loaded.value = false;
            naturalRatio.value = undefined;
        }
    );
</script>

<template>
    <div
        class="cover-image"
        :class="{ 'cover-image--loaded': loaded, 'cover-image--card': mode === 'card' }"
        :style="mode === 'card' ? { aspectRatio: cardRatio } : undefined"
    >
        <img
            v-if="src && !failed"
            :src="src"
            :alt="`${title} cover`"
            loading="lazy"
            @load="onLoad"
            @error="failed = true"
        />
        <div
            v-if="!src || failed"
            class="cover-fallback"
            role="img"
            :aria-label="`${title}: cover unavailable`"
            ><span
                class="cover-fallback__symbol"
                aria-hidden="true"
                >✳</span
            ><span>Cover unavailable</span></div
        >
        <div
            v-else-if="!loaded"
            class="cover-loading"
            aria-label="Loading cover"
            ><span>Loading cover</span></div
        >
    </div>
</template>

<style scoped>
    .cover-image {
        position: relative;
        display: grid;
        place-items: center;
        aspect-ratio: 4/5;
        overflow: hidden;
        background: #11150f;
    }

    .cover-image img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .cover-image--card img {
        object-fit: cover;
    }

    .cover-image--loaded img {
        opacity: 1;
    }

    .cover-fallback {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 15px;
        width: 100%;
        height: 100%;
        font-size: var(--font-size-xs);
        color: #b3c0a8;
        background: repeating-linear-gradient(
            135deg,
            #262d23,
            #262d23 1px,
            #20271e 1px,
            #20271e 13px
        );
    }

    .cover-fallback__symbol {
        font-size: 63px;
        color: var(--mint);
    }

    .cover-loading {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: var(--font-size-xs);
        color: var(--muted);
        background: linear-gradient(110deg, #222a1f 20%, #333c2d 45%, #222a1f 70%);
        animation: shimmer 1.8s infinite;
        background-size: 250% 100%;
    }

    @keyframes shimmer {
        to {
            background-position: -250% 0;
        }
    }

    @media (width <= 760px) {
        .cover-fallback {
            font-size: var(--font-size-micro);
        }

        .cover-fallback__symbol {
            font-size: 45px;
        }
    }

    @media (width <= 350px) {
        .cover-image {
            aspect-ratio: 4/4.6;
        }
    }
</style>
