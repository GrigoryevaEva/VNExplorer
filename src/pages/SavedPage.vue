<script setup lang="ts">
import NovelCard from '../ui/NovelCard.vue'
import CacheNotice from '../ui/CacheNotice.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { savedNovels, selectSaved, updateSavedSnapshots, type SavedSort } from '../modules/saved/collection'
import { fetchSavedCards } from '../modules/vndb/saved'
const search = ref('')
const sort = ref<SavedSort>('added')
const novels = computed(() => selectSaved(search.value, sort.value))
const refreshError = ref(false)
const refreshing = ref(false)
const stale = ref(false)
const request = new AbortController()
async function refresh() {
  if (!savedNovels.value.length) return
  refreshing.value = true
  refreshError.value = false
  stale.value = false
  try {
    const cards = await fetchSavedCards(savedNovels.value.map(novel => novel.id), request.signal, () => { stale.value = true })
    if (!request.signal.aborted && !stale.value) updateSavedSnapshots(cards)
  } catch { if (!request.signal.aborted) refreshError.value = true }
  finally { refreshing.value = false }
}
onMounted(refresh)
onBeforeUnmount(() => request.abort())
</script>

<template>
  <section class="saved-page" aria-label="Saved visual novels">
    <header class="catalog-heading"><div><p class="eyebrow">KEPT FOR ANOTHER CHAPTER</p><h1>Your <span>Saved.</span></h1></div></header>
    <div><CacheNotice v-if="stale && !refreshing" /><div class="saved-toolbar"><label>Search Saved<input v-model="search" type="search" placeholder="Find a kept story…" /></label><label>Sort saved stories<select v-model="sort"><option value="added">Recently added</option><option value="rating">Top rated</option><option value="released">First release · newest</option></select></label></div><p class="saved-refresh" v-if="refreshError">Could not refresh from VNDB. Showing your last-known saved details. <button @click="refresh">Try again</button></p><p class="saved-refresh" v-else-if="refreshing">Showing saved details while checking VNDB…</p></div>
    <div v-if="!savedNovels.length" class="feed-message"><h2>Your collection starts here.</h2><p>Save a story from Catalog to keep it for later.</p><RouterLink to="/">Explore Catalog ↗</RouterLink></div>
    <div v-else class="catalog-results" role="region" aria-label="Saved results" tabindex="0"><div v-if="!novels.length" class="feed-message"><h2>No saved stories match.</h2><p>Try another title or clear your search.</p></div><div v-else class="novel-grid"><NovelCard v-for="novel in novels" :key="novel.id" :novel="novel" /></div></div>
  </section>
</template>

<style scoped>
.saved-page { height: 100%; display: grid; grid-template-rows: auto auto minmax(0, 1fr); padding: 30px 38px 0; gap: 25px; }
.saved-toolbar { display: flex; gap: 20px; align-items: end; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
.saved-toolbar label { display: grid; gap: 8px; font-size: 11px; color: var(--muted); }
.saved-toolbar label:first-child { flex: 1; }
.saved-toolbar input, .saved-toolbar select { min-width: 0; max-width: 100%; padding: 12px; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; color: var(--mint); }
.saved-refresh { color: var(--muted); font-size: 12px; margin-top: 12px; line-height: 1.5; }
.saved-refresh button { background: transparent; color: var(--mint); text-decoration: underline; padding: 5px; }
@media(max-width: 760px) { .saved-page { padding: 23px 17px 0; } }
</style>
