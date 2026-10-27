<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ src: string; alt: string; dims: [number, number]; lazy?: boolean }>()
const state = ref<'loading' | 'loaded' | 'failed'>('loading')
watch(() => props.src, () => { state.value = 'loading' })
</script>

<template>
  <div class="screenshot-image">
    <img v-if="state !== 'failed'" :src="src" :alt="alt" :width="dims[0]" :height="dims[1]" :loading="lazy ? 'lazy' : 'eager'" @load="state = 'loaded'" @error="state = 'failed'" />
    <span v-if="state !== 'loaded'" role="status" class="image-message">{{ state === 'failed' ? 'Screenshot unavailable' : 'Loading screenshot…' }}</span>
  </div>
</template>

<style scoped>
.screenshot-image { position: relative; min-width: 0; min-height: 0; background: var(--panel); }
img { display: block; width: 100%; height: 100%; object-fit: contain; }
.image-message { position: absolute; inset: 0; display: grid; place-items: center; padding: 12px; color: var(--muted); background: var(--panel); font-size: 12px; text-align: center; }
</style>
