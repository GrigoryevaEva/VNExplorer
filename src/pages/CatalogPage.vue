<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CATALOG_PAGE_SIZE, fetchCatalogSelection, selectionFromQuery, selectionToQuery, type CatalogSelection } from '../modules/catalog/selection'
import type { VisualNovelCard } from '../modules/vndb/types'
import NovelCard from '../ui/NovelCard.vue'
import LanguageFilter from '../ui/LanguageFilter.vue'
import TagPicker from '../ui/TagPicker.vue'
import { loadTagDirectory } from '../modules/tags/directory'
const tagsOpen = ref(false)
const route = useRoute()
const router = useRouter()
const applied = computed(() => selectionFromQuery(route.query))
const draftSearch = ref(applied.value.search)
const draftTag = ref(applied.value.includedTag)
const tagNames = ref<Record<string, string>>({})
const draftTagName = computed(() => tagNames.value[draftTag.value] ?? draftTag.value)
async function readTagNames() { try { const tags = await loadTagDirectory(() => {}); tagNames.value = Object.fromEntries(tags.map(tag => [tag.id, tag.name])) } catch { /* The picker exposes retry if loading fails. */ } }
watch(draftTag, tag => { if (tag) void readTagNames() }, { immediate: true })
const draftLanguage = ref(applied.value.language)
const filterDialog = ref<HTMLDialogElement>()
const filterPanel = ref<HTMLElement>()
const mobileFiltersOpen = ref(false)
function closeFilters() { filterDialog.value?.close(); mobileFiltersOpen.value = false }
function openFilters() { mobileFiltersOpen.value = true; filterDialog.value?.showModal() }
function applyFilters() { void navigate({ ...applied.value, language: draftLanguage.value, includedTag: draftTag.value, page: 1 }); closeFilters() }
const novels = ref<VisualNovelCard[]>([])
const loading = ref(true)
const error = ref('')
const count = ref<number | undefined>()
const more = ref(false)
const grid = ref<HTMLElement>()
let controller: AbortController | undefined
let generation = 0
const totalPages = computed(() => Math.max(1, count.value === undefined ? applied.value.page + Number(more.value) : Math.ceil(count.value / CATALOG_PAGE_SIZE)))
const pageNumbers = computed(() => [...new Set([1, ...Array.from({ length: 3 }, (_, index) => applied.value.page + index - 1), totalPages.value])].filter(page => page >= 1 && page <= totalPages.value).sort((a, b) => a - b))
function rememberScroll() {
  // Vue Router keeps each navigation entry's state when going Back/Forward.
  window.history.replaceState({ ...window.history.state, catalogScroll: grid.value?.scrollTop ?? 0 }, '')
}
async function navigate(selection: CatalogSelection) {
  rememberScroll()
  await router.push({ query: selectionToQuery(selection), state: { catalogScroll: 0 } })
}
function submit() { void navigate({ ...applied.value, search: draftSearch.value.trim(), page: 1 }) }
function changeSort(event: Event) { void navigate({ ...applied.value, sort: (event.target as HTMLSelectElement).value as CatalogSelection['sort'], page: 1 }) }
async function load() {
  const request = ++generation
  controller?.abort()
  controller = new AbortController()
  const selection = { ...applied.value }
  const scroll = Number(window.history.state?.catalogScroll ?? 0)
  loading.value = true
  error.value = ''
  try {
    const response = await fetchCatalogSelection(selection, { signal: controller.signal })
    if (request !== generation) return
    novels.value = response.results
    count.value = response.count
    more.value = response.more
  } catch (reason) {
    if (request !== generation || (reason instanceof DOMException && reason.name === 'AbortError')) return
    error.value = reason instanceof Error ? reason.message : 'Stories could not be loaded. Please try again.'
  } finally {
    if (request === generation) {
      loading.value = false
      await nextTick()
      if (grid.value) grid.value.scrollTop = scroll
    }
  }
}
watch(() => applied.value.includedTag, tag => { draftTag.value = tag })
watch(() => applied.value.search, search => { draftSearch.value = search })
watch(() => applied.value.language, language => { draftLanguage.value = language })
watch(() => route.fullPath, () => { void load() }, { immediate: true })
onBeforeUnmount(() => { rememberScroll(); generation++; controller?.abort() })
</script>

<template>
  <section class="catalog-page" aria-label="Visual novel catalog">
    <header class="catalog-heading"><div><p class="eyebrow">A WORLD BETWEEN THE LINES</p><h1>Find your next <span>story.</span></h1></div><div class="chapter-stamp" aria-hidden="true"><span>ONE MORE</span><strong>chapter</strong><span>IS ALWAYS A GOOD IDEA ↗</span></div></header>
    <div class="catalog-workspace">
      <div class="catalog-feed">
        <div class="catalog-toolbar catalog-toolbar--search">
          <form class="catalog-search" role="search" @submit.prevent="submit"><label class="visually-hidden" for="title-search">Search titles</label><input id="title-search" v-model="draftSearch" type="search" placeholder="A title, a world, a new story…" /><button class="button button--lime" type="submit">Search <span aria-hidden="true">↗</span></button></form>
          <label class="catalog-order"><span class="visually-hidden">Sort stories</span><select :value="applied.sort" @change="changeSort"><option value="rating">Top rated ★</option><option value="released">First release · newest</option></select></label>
          <button class="button mobile-filters" @click="openFilters">Filters</button>
        </div>
        <div ref="grid" class="catalog-results" role="region" aria-label="Catalog results" tabindex="0" :aria-busy="loading" @scroll.passive="rememberScroll">
          <div v-if="loading" class="feed-message" role="status"><span class="message-symbol" aria-hidden="true">✳</span><h2>Opening a new chapter…</h2><p>Getting stories from VNDB.</p></div>
          <div v-else-if="error" class="feed-message feed-message--error" role="alert"><span class="message-symbol" aria-hidden="true">↺</span><h2>A little plot twist.</h2><p>{{ error }}</p><button class="button button--lime" @click="load">Try again <span aria-hidden="true">↗</span></button></div>
          <div v-else-if="!novels.length" class="feed-message"><span class="message-symbol" aria-hidden="true">○</span><h2>No stories here yet.</h2><p>VNDB returned no matching stories. Try another title.</p></div>
          <div v-else class="novel-grid"><NovelCard v-for="(novel, index) in novels" :key="novel.id" :novel="novel" :index="index" /></div>
        </div>
        <footer class="catalog-footer"><span class="catalog-result-count">{{ loading ? 'Loading stories…' : error ? 'Connection interrupted' : count === undefined ? `${novels.length} stories on this page` : `${count.toLocaleString('en')} stories` }}</span><nav class="catalog-pagination" aria-label="Catalog pages"><button aria-label="Previous page" :disabled="applied.page <= 1" @click="navigate({ ...applied, page: applied.page - 1 })">←</button><template v-for="(page, index) in pageNumbers" :key="page"><span v-if="index && page > pageNumbers[index - 1]! + 1" aria-hidden="true">…</span><button :aria-label="`Page ${page}`" :aria-current="page === applied.page ? 'page' : undefined" @click="navigate({ ...applied, page })">{{ page }}</button></template><button aria-label="Next page" :disabled="!more || loading" @click="navigate({ ...applied, page: applied.page + 1 })">→</button></nav></footer>
      </div>
      <aside class="catalog-sidebar" aria-label="Current catalog selection">
        <div ref="filterPanel"></div>
        <Teleport v-if="filterPanel" :to="mobileFiltersOpen && filterDialog ? filterDialog : filterPanel">
          <section class="selection-card filter-controls" aria-label="Catalog filters">
            <button v-if="mobileFiltersOpen" class="filter-close" aria-label="Close filters" @click="closeFilters">Close ×</button>
            <h2>Filters</h2>
            <LanguageFilter v-model="draftLanguage" /><div class="tag-draft"><p class="eyebrow">INCLUDED TAG</p><button v-if="draftTag" class="tag-chip" :aria-label="`Remove included tag ${draftTagName}`" @click="draftTag = ''">{{ draftTagName }} ×</button><p v-else>Anything goes</p><button class="button tag-browse" @click="tagsOpen = true; readTagNames()">Browse tags</button></div>
            <button class="button button--lime" @click="applyFilters">Apply filters</button>
          </section>
        </Teleport>
        <section class="selection-card"><p class="eyebrow">YOUR SELECTION</p><h2>Good stories.<br />No limits.</h2><dl><div><dt>Language</dt><dd>{{ applied.language === 'ru' ? 'Russian' : applied.language === 'en' ? 'English' : 'All languages' }} <span aria-hidden="true">↗</span></dd></div><div><dt>Tags</dt><dd>{{ applied.includedTag ? tagNames[applied.includedTag] ?? applied.includedTag : 'Anything goes' }} <span aria-hidden="true">✳</span></dd></div><div><dt>Order</dt><dd>{{ applied.sort === 'rating' ? 'Highest rated first' : 'Newest first release' }} <span aria-hidden="true">★</span></dd></div></dl><div class="selection-card__note"><span aria-hidden="true">↳</span> Start with the stories readers love.</div></section>
        <div class="reading-card"><span class="reading-card__flower" aria-hidden="true">✳</span><p>Different worlds.<br /><strong>Same curiosity.</strong></p><span class="reading-card__bottom">GET LOST IN A GOOD ONE ↗</span></div>
        <p class="source-note">Stories & artwork from <a href="https://vndb.org" target="_blank" rel="noreferrer">VNDB ↗</a></p>
      </aside>
    </div>
    <TagPicker v-if="tagsOpen" :selected="draftTag" @select="draftTag = $event" @done="tagsOpen = false" />
    <dialog ref="filterDialog" class="filter-dialog" aria-label="Catalog filters" @cancel="mobileFiltersOpen = false" @click="event => { if (event.target === filterDialog) closeFilters() }"></dialog>
  </section>
</template>

<style scoped>
.tag-draft { margin: 20px 0; display: grid; gap: 10px; font-size: 12px; }
.tag-chip { color: inherit; background: #ffffff55; border-radius: 8px; padding: 10px; overflow-wrap: anywhere; text-align: left; }
.tag-browse { border: 1px solid #718775; color: inherit; background: transparent; justify-content: center; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.mobile-filters { display: none; }
.filter-controls { margin-bottom: 18px; }
.filter-dialog { color: inherit; background: var(--bg); border: 1px solid var(--lime); border-radius: 16px; padding: 0; width: min(90vw, 400px); max-height: 85dvh; }
.filter-dialog::backdrop { background: #000b; }
.filter-dialog .filter-controls { margin: 0; }
.filter-close { float: right; padding: 8px; color: inherit; background: transparent; border: 1px solid var(--line); border-radius: 8px; }
.catalog-feed { grid-template-rows: 72px minmax(0, 1fr) 61px; }
.catalog-toolbar--search { align-items: flex-start; gap: 12px; }
.catalog-search { display: flex; gap: 8px; flex: 1; min-width: 0; }
.catalog-search input { min-width: 0; width: 100%; background: var(--panel); border: 1px solid #66705c; border-radius: 10px; color: inherit; padding: 12px; }
.catalog-search input:focus-visible, select:focus-visible { outline: 2px solid var(--lime); outline-offset: 2px; }
.catalog-order select { border: 1px solid var(--line); color: var(--lime); background: var(--panel); border-radius: 10px; padding: 12px 8px; max-width: 190px; font-size: 12px; height: 44px; }
.catalog-pagination { display: flex; align-items: center; gap: 4px; }
.catalog-pagination button { min-width: 34px; min-height: 38px; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); background: var(--panel); }
.catalog-pagination button[aria-current] { background: var(--lime); color: var(--bg); border-color: var(--lime); font-weight: bold; }
.catalog-pagination button:disabled { opacity: .35; }
@media(max-width: 760px) {
  .mobile-filters { display: inline-flex; padding: 5px 12px; min-height: 32px; font-size: 11px; }
  .catalog-feed { grid-template-rows: 109px minmax(0, 1fr) 82px; }
  .catalog-toolbar--search { flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .catalog-search { flex-basis: 100%; }
  .catalog-search input { font-size: 12px; }
  .catalog-search .button { padding: 12px; gap: 8px; }
  .catalog-order select { height: 32px; padding: 5px 8px; font-size: 11px; }
  .catalog-pagination { gap: 3px; }
  .catalog-pagination button { min-width: 30px; min-height: 40px; }
  .catalog-footer { flex-direction: column; justify-content: center; gap: 5px; }
}
</style>
