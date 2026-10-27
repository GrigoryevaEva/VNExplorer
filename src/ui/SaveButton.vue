<script setup lang="ts">
import type { VisualNovelCard } from '../modules/vndb/types'
import { isSaved, toggleSaved } from '../modules/saved/collection'
defineProps<{ novel: VisualNovelCard }>()
</script>

<template>
  <button class="save-button" :aria-label="`${isSaved(novel.id) ? 'Saved' : 'Save'} ${novel.title}`" :aria-pressed="isSaved(novel.id)" @click.stop="toggleSaved(novel)">{{ isSaved(novel.id) ? 'Saved ✓' : 'Save +' }}</button>
</template>

<style scoped>
.save-button { margin-top: 13px; padding: 8px 12px; min-height: 36px; background: transparent; color: var(--mint); border: 1px solid #819377; border-radius: 4px 12px 12px; font-size: 12px; font-weight: bold; }
.save-button[aria-pressed=true] { background: var(--lime); color: var(--bg); border-color: var(--lime); }
</style>
