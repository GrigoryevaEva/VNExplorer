<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { fetchReleaseDetails, fetchReleaseDirectory, isPlanned, languageName, newestReleases, platformName, releaseEditionLabels, releaseWebsites, type ReleaseAssignment, type ReleaseDetails } from '../modules/vndb/releases'
import { formatReleaseDate } from '../modules/vndb/format'
import CacheNotice from './CacheNotice.vue'
const props = defineProps<{ novelId: string }>()
const directory = ref<ReleaseAssignment[]>([])
const manifestLoading = ref(true)
const manifestError = ref('')
const manifestStale = ref(false)
const staleReleases = reactive(new Set<string>())
const details = reactive(new Map<string, ReleaseDetails>())
const expanded = reactive(new Set<string>())
const loading = reactive(new Set<string>())
const errors = reactive(new Map<string, string>())
const controller = new AbortController()
let queue = Promise.resolve()
const groups = computed(() => {
  const assignments = new Map<string, string[]>()
  for (const release of directory.value) for (const { lang } of release.languages) {
    if (!assignments.has(lang)) assignments.set(lang, [])
    if (!assignments.get(lang)!.includes(release.id)) assignments.get(lang)!.push(release.id)
  }
  return [...assignments].map(([code, ids]) => ({ code, ids, name: languageName(code) })).sort((a, b) => a.name.localeCompare(b.name))
})
function message(reason: unknown) { return reason instanceof Error ? reason.message : 'Please try again.' }
async function loadDirectory() {
  manifestLoading.value = true
  manifestError.value = ''
  manifestStale.value = false
  try { directory.value = await fetchReleaseDirectory(props.novelId, controller.signal, () => { manifestStale.value = true }) }
  catch (reason) { if (!controller.signal.aborted) manifestError.value = message(reason) }
  finally { manifestLoading.value = false }
}
function loaded(ids: string[]) { return ids.filter(id => details.has(id)).length }
function rows(ids: string[]) { return newestReleases(ids.flatMap(id => details.has(id) ? [details.get(id)!] : [])) }
function loadGroup(code: string, ids: string[]) {
  if (loading.has(code) || loaded(ids) === ids.length) return
  loading.add(code)
  errors.delete(code)
  queue = queue.then(async () => {
    try {
      while (!controller.signal.aborted) {
        const batch = ids.filter(id => !details.has(id)).slice(0, 100)
        if (!batch.length) break
        const result = await fetchReleaseDetails(batch, controller.signal, () => { for (const id of batch) staleReleases.add(id) })
        for (const release of result) if (batch.includes(release.id)) details.set(release.id, release)
        if (batch.some(id => !details.has(id))) throw new Error('Some release details are unavailable. Please try again.')
      }
    } catch (reason) { if (!controller.signal.aborted) errors.set(code, message(reason)) }
    finally { loading.delete(code) }
  })
}
function toggle(code: string, ids: string[]) {
  if (expanded.has(code)) expanded.delete(code)
  else { expanded.add(code); loadGroup(code, ids) }
}
onMounted(loadDirectory)
onBeforeUnmount(() => controller.abort())
</script>

<template>
  <section class="releases" aria-labelledby="releases-heading">
    <h2 id="releases-heading">Releases</h2>
    <CacheNotice v-if="manifestStale && !manifestLoading" />
    <p v-if="manifestLoading" role="status">Finding release languages…</p>
    <div v-else-if="manifestError" role="alert"><p>Could not load release languages. {{ manifestError }}</p><button class="button" @click="loadDirectory">Retry release directory</button></div>
    <p v-else-if="!groups.length" class="muted">No releases listed.</p>
    <div v-for="group in groups" :key="group.code" class="release-group">
      <h3><button :id="`release-language-${group.code}`" class="group-toggle" :aria-expanded="expanded.has(group.code)" :aria-controls="`release-group-${group.code}`" @click="toggle(group.code, group.ids)">{{ group.name }} · {{ group.ids.length }} {{ group.ids.length === 1 ? 'release' : 'releases' }}<span aria-hidden="true">{{ expanded.has(group.code) ? '−' : '+' }}</span></button></h3>
      <div v-if="expanded.has(group.code)" :id="`release-group-${group.code}`" role="region" :aria-label="`${group.name} releases`" class="group-content">
        <CacheNotice v-if="group.ids.some(id => staleReleases.has(id))" />
        <p v-if="loading.has(group.code)" role="status">Loading releases: {{ loaded(group.ids) }} / {{ group.ids.length }}</p>
        <div v-if="errors.has(group.code)" role="alert"><p>Could not load {{ group.name }} releases. {{ errors.get(group.code) }} Loaded {{ loaded(group.ids) }} / {{ group.ids.length }}.</p><button class="button" @click="loadGroup(group.code, group.ids)">Retry {{ group.name }} releases</button></div>
        <ul class="release-list">
          <li v-for="release in rows(group.ids)" :key="release.id" class="release-row">
            <div class="release-date">{{ formatReleaseDate(release.released) }}<span v-if="isPlanned(release.released)" class="planned">Planned</span></div>
            <span class="release-age">{{ release.minage == null ? 'Age unknown' : release.minage === 0 ? 'All ages' : `${release.minage}+` }}</span>
            <div class="release-title">
              <a v-if="releaseWebsites(release).length === 1" :href="releaseWebsites(release)[0]!.url" target="_blank" rel="noopener noreferrer">{{ release.title }} ↗</a>
              <details v-else-if="releaseWebsites(release).length > 1" class="website-menu"><summary>{{ release.title }} ↗</summary><div><p v-for="link in releaseWebsites(release)" :key="link.url"><a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }} · {{ link.url }}</a></p></div></details>
              <span v-else>{{ release.title }}</span>
              <div v-if="releaseEditionLabels(release, novelId, group.code).length" class="edition-labels"><span v-for="label in releaseEditionLabels(release, novelId, group.code)" :key="label">{{ label }}</span></div>
            </div>
            <span class="release-platforms"><span v-for="platform in release.platforms" :key="platform" class="platform">{{ platformName(platform) }}</span></span>
            <span class="release-status">{{ release.official ? 'Official' : 'Unofficial' }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.releases { margin-top: 42px; padding-top: 25px; border-top: 1px dashed var(--line); }
h2 { font-size: 24px; margin-bottom: 20px; }
h3 { margin: 0; }
.release-group { margin-top: 12px; border: 1px solid var(--line); border-radius: 4px 16px 4px 4px; overflow: hidden; }
.group-toggle { width: 100%; border: 0; background: var(--panel, #22252c); color: var(--mint); padding: 18px; text-align: left; font: inherit; cursor: pointer; display: flex; justify-content: space-between; gap: 15px; }
.group-content { padding: 0 16px; }
.release-list { list-style: none; padding: 0; margin: 0; }
.release-row { display: grid; grid-template-columns: 130px 88px minmax(0, 1fr) 125px 80px; gap: 12px; padding: 17px 0; align-items: center; border-top: 1px dashed var(--line); font-size: 12px; line-height: 1.6; }
.release-title { font-size: 14px; overflow-wrap: anywhere; }
.edition-labels { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 4px; color: var(--muted); font-size: 11px; }
a { color: var(--mint); }
.release-age, .release-date, .release-platforms, .release-status, .muted { color: var(--muted); }
.planned { display: block; color: var(--lime); font-size: 10px; text-transform: uppercase; }
.platform { display: inline-block; margin-right: 6px; }
.website-menu summary { color: var(--mint); cursor: pointer; }
.website-menu div { padding-left: 18px; }
@media(max-width: 760px) { .release-row { grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; } .release-title { grid-column: 1 / -1; grid-row: 1; } .release-platforms { grid-column: 1; } .release-status { text-align: right; } }
</style>

