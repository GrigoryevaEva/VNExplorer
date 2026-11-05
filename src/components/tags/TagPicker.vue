<script setup lang="ts">
    import { storeToRefs } from 'pinia';
    import { computed, onMounted, ref } from 'vue';

    import { useEventListener } from '@vueuse/core';

    import { VNDB_SITE_URL } from '@/api/protocol';
    import { CacheNotice } from '@/components/vndb-feedback';
    import type { TCatalogTagAction } from '@/entities/catalog';
    import { CATALOG_TAG_ACTIONS } from '@/entities/catalog';
    import {
        ALL_TAGS_SECTION,
        DEFAULT_TAG_SECTION,
        selectDirectoryTags,
        TAG_SECTIONS,
    } from '@/entities/tag';
    import { SourceDescription } from '@/shared/ui/source-description';
    import { useTagsStore } from '@/stores/tags';

    import { TAG_DESCRIPTION_FALLBACK } from './constants';

    interface ITagPickerProps {
        included: readonly string[];
        excluded: readonly string[];
    }
    const props = defineProps<ITagPickerProps>();
    const emit = defineEmits<{ select: [id: string, action: TCatalogTagAction]; done: [] }>();
    const dialog = ref<HTMLDialogElement>();
    const store = useTagsStore();
    const {
        tags,
        loading,
        loaded,
        error,
        stale,
    } = storeToRefs(store);
    const { loadDirectory } = store;
    const section = ref(DEFAULT_TAG_SECTION);
    const search = ref('');
    const about = ref('');
    const shown = computed(() => selectDirectoryTags(tags.value, section.value, search.value));

    useEventListener(dialog, 'close', () => emit('done'));
    onMounted(() => {
        dialog.value?.showModal();
        void loadDirectory();
    });
</script>
<template>
    <dialog
        ref="dialog"
        class="tag-picker"
        aria-labelledby="tag-heading"
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
                v-for="name in [...TAG_SECTIONS.map((item) => item.name), ALL_TAGS_SECTION]"
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
                @click="loadDirectory"
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
                            @click="emit('select', tag.id, CATALOG_TAG_ACTIONS.INCLUDE)"
                            >+ Include</button
                        ><button
                            class="tag-exclude"
                            :aria-label="`Exclude ${tag.name}`"
                            :aria-pressed="props.excluded.includes(tag.id)"
                            @click="emit('select', tag.id, CATALOG_TAG_ACTIONS.EXCLUDE)"
                            >− Exclude</button
                        ></div
                    ><SourceDescription
                        v-if="about === tag.id"
                        :id="`description-${tag.id}`"
                        :base-url="VNDB_SITE_URL"
                        class="tag-description"
                        :text="tag.description || TAG_DESCRIPTION_FALLBACK" /></li
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
        gap: var(--space-sm);
    }

    h2 {
        margin-top: 7px;
        font-size: 38px;
        letter-spacing: -1.5px;
    }

    .tag-search {
        display: grid;
        gap: var(--space-xs);
        font-size: var(--font-size-sm);
        color: var(--muted);
    }

    input {
        width: 100%;
        min-width: 0;
        padding: 14px;
        color: #fff;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: var(--radius-control);
    }

    nav {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
    }

    nav button {
        padding: var(--space-sm);
        font-size: var(--font-size-sm);
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
        font-size: var(--font-size-sm);
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
        font-size: var(--font-size-body);
        line-height: 1.6;
        white-space: pre-line;
        overflow-wrap: anywhere;
        color: var(--muted);
    }

    @media (--viewport-mobile) {
        .tag-picker {
            width: calc(100vw - 16px);
            max-width: none;
            height: calc(100dvh - 16px);
            max-height: none;
            padding: var(--space-md);
        }

        .tag-picker[open] {
            gap: 14px;
        }

        h2 {
            font-size: 30px;
        }

        nav button {
            padding: 10px;
            font-size: var(--font-size-xs);
        }

        .tag-row {
            gap: 5px;
        }

        strong {
            font-size: var(--font-size-sm);
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
