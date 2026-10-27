<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { alternativeTitles, fetchNovelDetails, formatPlayTime, spoilerFreeTags, type VisualNovelDetails } from '../modules/vndb/details'
import { selectionFromQuery, selectionToQuery } from '../modules/catalog/selection'
import { formatRating, formatReleaseDate } from '../modules/vndb/format'
import CoverImage from '../ui/CoverImage.vue'
import SaveButton from '../ui/SaveButton.vue'
import SourceDescription from '../ui/SourceDescription'
import ScreenshotGallery from '../ui/ScreenshotGallery.vue'
import ReleaseGroups from '../ui/ReleaseGroups.vue'

const route = useRoute()
const router = useRouter()
function returnToCatalog(event: MouseEvent) {
  const previous: unknown = window.history.state?.back
  if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && typeof previous === 'string' && /^\/(?:\?|$)/.test(previous)) { event.preventDefault(); router.back() }
}
const novel = ref<VisualNovelDetails | null>(null)
const loading = ref(false)
const error = ref('')
const titles = computed(() => novel.value ? alternativeTitles(novel.value) : [])
const tags = computed(() => novel.value ? spoilerFreeTags(novel.value) : [])
let controller: AbortController | undefined
async function load() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  novel.value = null
  error.value = ''
  const id = String(route.params.id)
  if (!/^v[1-9]\d*$/.test(id)) { loading.value = false; return }
  loading.value = true
  try { const result = await fetchNovelDetails(id, request.signal); if (!request.signal.aborted) novel.value = result }
  catch (reason) { if (!request.signal.aborted) error.value = reason instanceof Error ? reason.message : 'Please try again.' }
  finally { if (!request.signal.aborted) loading.value = false }
}
watch(() => route.params.id, load, { immediate: true })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <div class="detail-page">
    <RouterLink to="/" class="detail-back" @click="returnToCatalog">← Catalog</RouterLink>
    <div v-if="loading" class="feed-message" role="status"><span class="message-symbol" aria-hidden="true">✳</span><h1>Opening the story…</h1></div>
    <div v-else-if="error" class="feed-message feed-message--error" role="alert"><h1>Could not open this story</h1><p>{{ error }}</p><button class="button button--lime" @click="load">Try again ↗</button></div>
    <div v-else-if="!novel" class="feed-message"><h1>Story not found</h1><p>This visual novel is unavailable or its ID is unknown.</p><RouterLink to="/">Explore Catalog</RouterLink></div>
    <article v-else>
      <div class="detail-hero">
        <div class="detail-cover"><CoverImage :src="novel.image?.url" :title="novel.title" /></div>
        <div class="detail-introduction"><p class="eyebrow">A STORY TO GET LOST IN / {{ novel.id }}</p><h1>{{ novel.title }}</h1>
          <dl class="detail-facts"><div><dt>Rating</dt><dd class="detail-rating">{{ formatRating(novel.rating) }}</dd><p>{{ novel.votecount == null ? 'Vote count unknown' : `${novel.votecount.toLocaleString('en')} votes` }}</p></div><div><dt>First release</dt><dd>{{ formatReleaseDate(novel.released) }}</dd></div><div><dt>Approximate play time</dt><dd>{{ formatPlayTime(novel) }}</dd></div></dl><SaveButton :novel="novel" />
        </div>
      </div>
      <section class="detail-section" aria-labelledby="description-heading"><h2 id="description-heading">The story</h2><SourceDescription v-if="novel.description" class="detail-description" :text="novel.description" /><p v-else class="detail-empty">No description available.</p></section>
      <section class="detail-section" aria-labelledby="titles-heading"><h2 id="titles-heading">Alternative titles</h2><ul v-if="titles.length" class="detail-titles"><li v-for="title in titles" :key="title">{{ title }}</li></ul><p v-else class="detail-empty">No alternative titles listed.</p></section>
      <section class="detail-section" aria-labelledby="tags-heading"><h2 id="tags-heading">Spoiler-free tags</h2><ul v-if="tags.length" class="detail-tags"><li v-for="tag in tags" :key="tag.id"><RouterLink :to="{ name: 'catalog', query: selectionToQuery(selectionFromQuery({ tag: tag.id })) }">{{ tag.name }}</RouterLink></li></ul><p v-else class="detail-empty">No spoiler-free tags listed.</p></section>
      <ScreenshotGallery :screenshots="novel.screenshots ?? []" />
      <ReleaseGroups :key="novel.id" :novel-id="novel.id" />
    </article>
  </div>
</template>

<style scoped>
.detail-page { max-width: 1240px; margin: auto; padding: 30px 38px 80px; }
.detail-back { display: inline-block; color: var(--mint); font-size: 13px; margin-bottom: 30px; text-decoration: none; }
.detail-hero { display: grid; grid-template-columns: minmax(220px, 330px) minmax(0, 1fr); gap: 48px; align-items: center; }
.detail-cover { overflow: hidden; border: 1px solid var(--line); border-radius: 18px 18px 4px 18px; }
.detail-introduction h1 { margin-top: 22px; font-size: clamp(36px, 5vw, 64px); letter-spacing: -2px; line-height: 1.1; overflow-wrap: anywhere; }
.detail-facts { margin: 30px 0 0; display: grid; gap: 22px; }
.detail-facts dt { color: var(--muted); font-size: 11px; margin-bottom: 8px; }
.detail-facts dd { margin: 0; font-size: 18px; }
.detail-facts p { font-size: 12px; color: var(--muted); margin-top: 6px; }
.detail-facts .detail-rating { color: var(--lime); font-size: 32px; font-weight: bold; }
.detail-section { margin-top: 42px; padding-top: 25px; border-top: 1px dashed var(--line); }
.detail-section h2 { font-size: 24px; letter-spacing: -.5px; margin-bottom: 20px; }
.detail-description { line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
.detail-titles { list-style: none; padding: 0; margin: 0; display: flex; gap: 12px; flex-wrap: wrap; }
.detail-titles li { padding: 12px 17px; border: 1px solid var(--line); border-radius: 3px 14px 14px; line-height: 1.5; }
.detail-tags { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 10px; }
.detail-tags li { min-width: 0; max-width: 100%; }
.detail-tags a { display: block; padding: 12px 16px; min-height: 44px; color: var(--mint); background: var(--panel); border: 1px solid var(--line); border-radius: 3px 14px 14px; text-decoration: none; overflow-wrap: anywhere; }
.detail-tags a:hover { border-color: var(--mint); }
.detail-empty { color: var(--muted); line-height: 1.6; }
@media(max-width: 760px) { .detail-page { padding: 24px 18px 60px; } .detail-hero { grid-template-columns: 1fr; gap: 28px; } .detail-cover { width: min(100%, 330px); margin: auto; } .detail-introduction h1 { font-size: 38px; } .detail-facts { gap: 20px; } }
</style>




