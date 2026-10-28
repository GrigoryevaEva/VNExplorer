<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue';

    import { type DirectoryTag, loadTagDirectory, tagSections } from '../modules/tags/directory';
    import CacheNotice from './CacheNotice.vue';
    import SourceDescription from './SourceDescription';
    const props = defineProps<{ included: string[]; excluded: string[] }>();
    const emit = defineEmits<{ select: [id: string, action: 'include' | 'exclude']; done: [] }>();
    const dialog = ref<HTMLDialogElement>();
    const tags = ref<DirectoryTag[]>([]);
    const section = ref('Genres & Themes');
    const search = ref('');
    const about = ref('');
    const loading = ref(true);
    const loaded = ref(0);
    const error = ref('');
    const stale = ref(false);
    const shown = computed(() => {
        const term = search.value.trim().toLocaleLowerCase('en');
        const ids = tagSections.find((item) => item.name === section.value)?.ids;
        return tags.value.filter((tag) =>
            term ? tag.name.toLocaleLowerCase('en').includes(term) : !ids || ids.includes(tag.id));
    });
    async function load() {
        loading.value = true;
        error.value = '';
        stale.value = false;
        try {
            tags.value = await loadTagDirectory(
                (count) => {
                    loaded.value = count;
                },
                () => {
                    stale.value = true;
                }
            );
        } catch {
            error.value = 'Tags could not be loaded. Please try again.';
        } finally {
            loading.value = false;
        }
    }
    onMounted(() => {
        dialog.value?.showModal();
        void load();
    });
</script>
<template>
    <dialog
        ref="dialog"
        class="tag-picker"
        aria-labelledby="tag-heading"
        @close="emit('done')"
    >
        <header
            ><div
                ><p class="eyebrow">FIND YOUR KIND OF STORY</p
                ><h2 id="tag-heading">Discover tags</h2></div
            ><button
                class="button button--lime"
                @click="dialog?.close()"
                >Done</button
            ></header
        >
        <label class="tag-search"
            >Search all tags<input
                v-model="search"
                type="search"
                placeholder="Try a theme, setting or character…"
        /></label>
        <nav aria-label="Tag sections"
            ><button
                v-for="name in [...tagSections.map((item) => item.name), 'All tags']"
                :key="name"
                :aria-pressed="section === name"
                @click="section = name"
                >{{ name }}</button
            ></nav
        >
        <p
            v-if="loading"
            role="status"
            >Loading tags… {{ loaded.toLocaleString('en') }} ready</p
        >
        <div
            v-else-if="error"
            role="alert"
            ><p>{{ error }}</p
            ><button
                class="button button--lime"
                @click="load"
                >Retry tags</button
            ></div
        >
        <div
            v-else
            class="tag-results"
            role="region"
            aria-label="Tag directory"
            tabindex="0"
        >
            <CacheNotice v-if="stale" />
            <p class="tag-count"
                >{{ shown.length }} tags{{ search.trim() ? ' across all sections' : '' }}</p
            >
            <ul
                ><li
                    v-for="tag in shown"
                    :key="tag.id"
                    ><div class="tag-row"
                        ><strong>{{ tag.name }}</strong
                        ><button
                            class="tag-info"
                            :aria-label="`About ${tag.name}`"
                            :aria-expanded="about === tag.id"
                            :aria-controls="`description-${tag.id}`"
                            @click="about = about === tag.id ? '' : tag.id"
                            >Info</button
                        ><button
                            class="tag-include"
                            :aria-label="`Include ${tag.name}`"
                            :aria-pressed="props.included.includes(tag.id)"
                            @click="emit('select', tag.id, 'include')"
                            >+ Include</button
                        ><button
                            class="tag-exclude"
                            :aria-label="`Exclude ${tag.name}`"
                            :aria-pressed="props.excluded.includes(tag.id)"
                            @click="emit('select', tag.id, 'exclude')"
                            >− Exclude</button
                        ></div
                    ><SourceDescription
                        v-if="about === tag.id"
                        :id="`description-${tag.id}`"
                        class="tag-description"
                        :text="tag.description || 'No description available.'" /></li
            ></ul>
            <p v-if="!shown.length">No tags found. Try searching all tags.</p>
        </div>
    </dialog>
</template>
<style scoped>
    .tag-picker {
        width: min(1080px, calc(100vw - 40px));
        height: min(820px, calc(100dvh - 60px));
        padding: 28px;
        overflow: hidden;
        color: inherit;
        background: var(--bg);
        border: 1px solid #76866a;
        border-radius: 24px 24px 5px;
    }

    .tag-picker[open] {
        display: flex;
        flex-direction: column;
        gap: 22px;
    }

    .tag-picker::backdrop {
        background: #0b0e0bd9;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    h2 {
        margin-top: 7px;
        font-size: 38px;
        letter-spacing: -1.5px;
    }

    .tag-search {
        display: grid;
        gap: 8px;
        font-size: 12px;
        color: var(--muted);
    }

    input {
        width: 100%;
        min-width: 0;
        padding: 14px;
        color: #fff;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 10px;
    }

    nav {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
    }

    nav button {
        padding: 12px;
        font-size: 12px;
        color: var(--mint);
        background: var(--panel);
        border-radius: 8px 8px 2px;
    }

    nav button[aria-pressed='true'] {
        color: var(--bg);
        background: var(--mint);
    }

    .tag-results {
        min-height: 0;
        padding: 4px;
        overflow: auto;
    }

    .tag-count {
        margin-bottom: 15px;
        font-size: 12px;
        color: var(--muted);
    }

    ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }

    li {
        padding: 10px 0;
        border-top: 1px solid var(--line);
    }

    .tag-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    strong {
        flex: 1;
        font-size: 14px;
        overflow-wrap: anywhere;
    }

    .tag-row button {
        min-height: 44px;
        padding: 10px;
        color: var(--mint);
        background: var(--panel);
        border-radius: 7px;
    }

    .tag-row .tag-include {
        color: var(--lime);
        border: 1px solid #66705c;
    }

    .tag-row .tag-exclude {
        color: var(--pink, #f4a9c0);
        border: 1px solid #b88799;
    }

    .tag-exclude[aria-pressed='true'] {
        color: white;
        background: #78334b;
    }

    .tag-include[aria-pressed='true'] {
        color: var(--bg);
        background: var(--lime);
    }

    .tag-description {
        padding: 12px 0;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-line;
        overflow-wrap: anywhere;
        color: var(--muted);
    }

    @media (width <= 760px) {
        .tag-picker {
            width: calc(100vw - 16px);
            max-width: none;
            height: calc(100dvh - 16px);
            max-height: none;
            padding: 16px;
        }

        .tag-picker[open] {
            gap: 14px;
        }

        h2 {
            font-size: 30px;
        }

        nav button {
            padding: 10px;
            font-size: 11px;
        }

        .tag-row {
            gap: 5px;
        }

        strong {
            font-size: 12px;
        }
    }

    @media (height <= 600px) {
        .tag-picker {
            overflow: auto;
        }

        .tag-picker[open] {
            display: block;
        }

        .tag-picker > * + * {
            margin-top: 18px;
        }

        .tag-results {
            overflow: visible;
        }
    }
</style>
