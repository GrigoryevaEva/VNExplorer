<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
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
        return Math.max(4 / 5, ratio && Number.isFinite(ratio) ? ratio : 4 / 5);
    });
    function onLoad(event: Event) {
        const image = event.target as HTMLImageElement;
        naturalRatio.value = image.naturalWidth / image.naturalHeight;
        loaded.value = true;
    }
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
