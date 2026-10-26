<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ src?: string | null; title: string }>()
const failed = ref(false)
const loaded = ref(false)
watch(() => props.src, () => { failed.value = false; loaded.value = false })
</script>

<template>
  <div class="cover-image" :class="{ 'cover-image--loaded': loaded }">
    <img v-if="src && !failed" :src="src" :alt="`${title} cover`" loading="lazy" @load="loaded = true" @error="failed = true" />
    <div v-if="!src || failed" class="cover-fallback" role="img" :aria-label="`${title}: cover unavailable`"><span class="cover-fallback__symbol" aria-hidden="true">✳</span><span>Cover unavailable</span></div>
    <div v-else-if="!loaded" class="cover-loading" aria-label="Loading cover"><span>Loading cover</span></div>
  </div>
</template>
