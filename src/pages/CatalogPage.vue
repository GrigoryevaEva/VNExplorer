<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchCatalog } from '../modules/vndb/client'
import type { VisualNovelCard } from '../modules/vndb/types'
import NovelCard from '../ui/NovelCard.vue'
const novels = ref<VisualNovelCard[]>([])
const loading = ref(true)
const error = ref('')
const count = ref<number | undefined>()
let controller: AbortController | undefined
async function load() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  error.value = ''
  try {
    const response = await fetchCatalog({ signal: controller.signal })
    novels.value = response.results
    count.value = response.count
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') return
    error.value = reason instanceof Error ? reason.message : 'Stories could not be loaded. Please try again.'
  } finally { loading.value = false }
}
onMounted(load)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="catalog-page" aria-label="Visual novel catalog">
    <header class="catalog-heading"><div><p class="eyebrow">A WORLD BETWEEN THE LINES</p><h1>Find your next <span>story.</span></h1></div><div class="chapter-stamp" aria-hidden="true"><span>ONE MORE</span><strong>chapter</strong><span>IS ALWAYS A GOOD IDEA ↗</span></div></header>
    <div class="catalog-workspace">
      <div class="catalog-feed">
        <div class="catalog-toolbar"><span class="section-tab">THE CATALOG <span aria-hidden="true">↘</span></span><span class="catalog-sort-label">Top rated <span aria-hidden="true">★</span></span></div>
        <div class="catalog-results" role="region" aria-label="Catalog results" tabindex="0" :aria-busy="loading">
          <div v-if="loading" class="feed-message" role="status"><span class="message-symbol" aria-hidden="true">✳</span><h2>Opening a new chapter…</h2><p>Getting stories from VNDB.</p></div>
          <div v-else-if="error" class="feed-message feed-message--error" role="alert"><span class="message-symbol" aria-hidden="true">↺</span><h2>A little plot twist.</h2><p>{{ error }}</p><button class="button button--lime" @click="load">Try again <span aria-hidden="true">↗</span></button></div>
          <div v-else-if="!novels.length" class="feed-message"><span class="message-symbol" aria-hidden="true">○</span><h2>No stories here yet.</h2><p>VNDB returned no matching stories.</p></div>
          <div v-else class="novel-grid"><NovelCard v-for="(novel, index) in novels" :key="novel.id" :novel="novel" :index="index" /></div>
        </div>
        <footer class="catalog-footer"><span>{{ loading ? 'Loading stories…' : error ? 'Connection interrupted' : `${novels.length} stories on this page` }}<span v-if="count && !loading && !error" class="catalog-total"> / {{ count.toLocaleString('en') }} in the catalog</span></span><span class="page-marker" aria-label="Page 1">PAGE <strong>01</strong></span></footer>
      </div>
      <aside class="catalog-sidebar" aria-label="Current catalog selection">
        <section class="selection-card"><p class="eyebrow">YOUR SELECTION</p><h2>Good stories.<br />No limits.</h2><dl><div><dt>Language</dt><dd>All languages <span aria-hidden="true">↗</span></dd></div><div><dt>Tags</dt><dd>Anything goes <span aria-hidden="true">✳</span></dd></div><div><dt>Order</dt><dd>Highest rated first <span aria-hidden="true">★</span></dd></div></dl><div class="selection-card__note"><span aria-hidden="true">↳</span> Start with the stories readers love.</div></section>
        <div class="reading-card"><span class="reading-card__flower" aria-hidden="true">✳</span><p>Different worlds.<br /><strong>Same curiosity.</strong></p><span class="reading-card__bottom">GET LOST IN A GOOD ONE ↗</span></div>
        <p class="source-note">Stories & artwork from <a href="https://vndb.org" target="_blank" rel="noreferrer">VNDB ↗</a></p>
      </aside>
    </div>
  </section>
</template>
