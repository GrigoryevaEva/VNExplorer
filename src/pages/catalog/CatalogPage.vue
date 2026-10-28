<script setup lang="ts">
    import { selectionWithoutFilters } from '@/entities/catalog';
    import CacheNotice from '@/ui/CacheNotice.vue';
    import LanguageFilter from '@/ui/LanguageFilter.vue';
    import NovelCard from '@/ui/NovelCard.vue';
    import TagPicker from '@/ui/TagPicker.vue';

    import CatalogPagination from './components/CatalogPagination.vue';
    import { useCatalog } from './useCatalog';
    const {
        tagsOpen,
        applied,
        draftSearch,
        draftIncluded,
        draftExcluded,
        draftStrict,
        selectTag,
        tagName,
        readTagNames,
        draftLanguage,
        filterDialog,
        filterPanel,
        mobileFiltersOpen,
        closeFilters,
        openFilters,
        applyFilters,
        novels,
        loading,
        error,
        stale,
        titleMatchCount,
        more,
        bindGrid,
        pageNumbers,
        rememberScroll,
        navigate,
        submit,
        changeSort,
        load,
        resultCountLabel,
        selectionLanguageLabel,
    } = useCatalog();
</script>

<template>
    <section
        class="catalog-page"
        aria-label="Visual novel catalog"
    >
        <header class="catalog-heading"
            ><div
                ><p class="eyebrow">A WORLD BETWEEN THE LINES</p
                ><h1>Find your next <span>story.</span></h1></div
            ><div
                class="chapter-stamp"
                aria-hidden="true"
                ><span>ONE MORE</span><strong>chapter</strong
                ><span>IS ALWAYS A GOOD IDEA ↗</span></div
            ></header
        >
        <div class="catalog-workspace">
            <div class="catalog-feed">
                <div class="catalog-toolbar catalog-toolbar--search">
                    <form
                        class="catalog-search"
                        role="search"
                        @submit.prevent="submit"
                        ><label
                            class="visually-hidden"
                            for="title-search"
                            >Search titles</label
                        ><input
                            id="title-search"
                            v-model="draftSearch"
                            type="search"
                            placeholder="A title, a world, a new story…"
                        /><button
                            class="button button--lime"
                            type="submit"
                            >Search <span aria-hidden="true">↗</span></button
                        ></form
                    >
                    <label class="catalog-order"
                        ><span class="visually-hidden">Sort stories</span
                        ><select
                            :value="applied.sort"
                            @change="changeSort"
                            ><option value="rating">Top rated ★</option
                            ><option value="released">First release · newest</option></select
                        ></label
                    >
                    <button
                        class="button mobile-filters"
                        @click="openFilters"
                        >Filters</button
                    >
                </div>
                <div
                    :ref="bindGrid"
                    class="catalog-results"
                    role="region"
                    aria-label="Catalog results"
                    tabindex="0"
                    :aria-busy="loading"
                    @scroll.passive="rememberScroll"
                >
                    <CacheNotice v-if="stale && !loading" />
                    <div
                        v-if="loading"
                        class="feed-message"
                        role="status"
                        ><span
                            class="message-symbol"
                            aria-hidden="true"
                            >✳</span
                        ><h2>Opening a new chapter…</h2><p>Getting stories from VNDB.</p></div
                    >
                    <div
                        v-else-if="error"
                        class="feed-message feed-message--error"
                        role="alert"
                        ><span
                            class="message-symbol"
                            aria-hidden="true"
                            >↺</span
                        ><h2>A little plot twist.</h2><p>{{ error }}</p
                        ><button
                            class="button button--lime"
                            @click="load"
                            >Try again <span aria-hidden="true">↗</span></button
                        ></div
                    >
                    <div
                        v-else-if="!novels.length && titleMatchCount"
                        class="feed-message"
                        ><span
                            class="message-symbol"
                            aria-hidden="true"
                            >○</span
                        ><h2
                            >{{ titleMatchCount.toLocaleString('en') }}
                            {{ titleMatchCount === 1 ? 'match hidden' : 'matches hidden' }} by
                            filters.</h2
                        ><p
                            >Your title search has matches in VNDB. Show them with all filters
                            cleared.</p
                        ><button
                            class="button button--lime"
                            @click="navigate(selectionWithoutFilters(applied))"
                            >Show without filters</button
                        ></div
                    >
                    <div
                        v-else-if="!novels.length"
                        class="feed-message"
                        ><span
                            class="message-symbol"
                            aria-hidden="true"
                            >○</span
                        ><h2>No stories here yet.</h2
                        ><p>VNDB returned no matching stories. Try another title.</p></div
                    >
                    <div
                        v-else
                        class="novel-grid"
                        ><NovelCard
                            v-for="(novel, index) in novels"
                            :key="novel.id"
                            :novel="novel"
                            :index="index"
                    /></div>
                </div>
                <CatalogPagination
                    :current-page="applied.page"
                    :page-numbers="pageNumbers"
                    :loading="loading"
                    :more="more"
                    :result-count-label="resultCountLabel"
                    @change="navigate({ ...applied, page: $event })"
                />
            </div>
            <aside
                class="catalog-sidebar"
                aria-label="Current catalog selection"
            >
                <div ref="filterPanel"></div>
                <Teleport
                    v-if="filterPanel"
                    :to="mobileFiltersOpen && filterDialog ? filterDialog : filterPanel"
                >
                    <section
                        class="selection-card filter-controls"
                        aria-label="Catalog filters"
                    >
                        <button
                            v-if="mobileFiltersOpen"
                            class="filter-close"
                            aria-label="Close filters"
                            @click="closeFilters"
                            >Close ×</button
                        >
                        <h2>Filters</h2>
                        <LanguageFilter v-model="draftLanguage" /><div class="tag-draft"
                            ><p class="eyebrow">INCLUDED TAGS</p
                            ><button
                                v-for="id in draftIncluded"
                                :key="id"
                                class="tag-chip"
                                :aria-label="`Remove included tag ${tagName(id)}`"
                                @click="draftIncluded = draftIncluded.filter((tag) => tag !== id)"
                                >+ {{ tagName(id) }} ×</button
                            ><p v-if="!draftIncluded.length">Anything goes</p
                            ><p class="eyebrow">EXCLUDED TAGS</p
                            ><button
                                v-for="id in draftExcluded"
                                :key="id"
                                class="tag-chip"
                                :aria-label="`Remove excluded tag ${tagName(id)}`"
                                @click="draftExcluded = draftExcluded.filter((tag) => tag !== id)"
                                >− {{ tagName(id) }} ×</button
                            ><p v-if="!draftExcluded.length">None</p
                            ><label class="strict-match"
                                ><input
                                    v-model="draftStrict"
                                    type="checkbox"
                                />
                                Strict match</label
                            ><button
                                class="button tag-browse"
                                @click="
                                    tagsOpen = true;
                                    readTagNames();
                                "
                                >Browse tags</button
                            ></div
                        >
                        <button
                            class="button button--lime"
                            @click="applyFilters"
                            >Apply filters</button
                        >
                    </section>
                </Teleport>
                <section class="selection-card"
                    ><p class="eyebrow">YOUR SELECTION</p><h2>Good stories.<br />No limits.</h2
                    ><dl
                        ><div
                            ><dt>Language</dt
                            ><dd
                                >{{ selectionLanguageLabel }} <span aria-hidden="true">↗</span></dd
                            ></div
                        ><div
                            ><dt>Tags</dt
                            ><dd
                                >{{
                                    [
                                        ...applied.includedTags.map((id) => '+ ' + tagName(id)),
                                        ...applied.excludedTags.map((id) => '− ' + tagName(id)),
                                    ].join(', ') || 'Anything goes'
                                }}
                                <span aria-hidden="true">✳</span></dd
                            ></div
                        ><div
                            ><dt>Order</dt
                            ><dd
                                >{{
                                    applied.sort === 'rating'
                                        ? 'Highest rated first'
                                        : 'Newest first release'
                                }}
                                <span aria-hidden="true">★</span></dd
                            ></div
                        ></dl
                    ><div class="selection-card__note"
                        ><span aria-hidden="true">↳</span> Start with the stories readers love.</div
                    ></section
                >
                <div class="reading-card"
                    ><span
                        class="reading-card__flower"
                        aria-hidden="true"
                        >✳</span
                    ><p>Different worlds.<br /><strong>Same curiosity.</strong></p
                    ><span class="reading-card__bottom">GET LOST IN A GOOD ONE ↗</span></div
                >
                <p class="source-note"
                    >Stories & artwork from
                    <a
                        href="https://vndb.org"
                        target="_blank"
                        rel="noreferrer"
                        >VNDB ↗</a
                    ></p
                >
            </aside>
        </div>
        <TagPicker
            v-if="tagsOpen"
            :included="draftIncluded"
            :excluded="draftExcluded"
            @select="selectTag"
            @done="tagsOpen = false"
        />
        <dialog
            ref="filterDialog"
            class="filter-dialog"
            aria-label="Catalog filters"
            @cancel="mobileFiltersOpen = false"
            @click="
                (event) => {
                    if (event.target === filterDialog) closeFilters();
                }
            "
        ></dialog>
    </section>
</template>

<style scoped>
    .tag-draft {
        display: grid;
        gap: 10px;
        margin: 20px 0;
        font-size: 12px;
    }

    .tag-chip {
        padding: 10px;
        text-align: left;
        overflow-wrap: anywhere;
        color: inherit;
        background: #fff5;
        border-radius: 8px;
    }

    .tag-browse {
        justify-content: center;
        color: inherit;
        background: transparent;
        border: 1px solid #718775;
    }

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        overflow: hidden;
        white-space: nowrap;
        clip-path: inset(50%);
    }

    .mobile-filters {
        display: none;
    }

    .filter-controls {
        margin-bottom: 18px;
    }

    .filter-dialog {
        width: min(90vw, 400px);
        max-height: 85dvh;
        padding: 0;
        color: inherit;
        background: var(--bg);
        border: 1px solid var(--lime);
        border-radius: 16px;
    }

    .filter-dialog::backdrop {
        background: #000b;
    }

    .filter-dialog .filter-controls {
        margin: 0;
    }

    .filter-close {
        float: right;
        padding: 8px;
        color: inherit;
        background: transparent;
        border: 1px solid var(--line);
        border-radius: 8px;
    }

    .catalog-feed {
        grid-template-rows: 72px minmax(0, 1fr) 61px;
    }

    .catalog-toolbar--search {
        align-items: flex-start;
        gap: 12px;
    }

    .catalog-search {
        display: flex;
        flex: 1;
        gap: 8px;
        min-width: 0;
    }

    .catalog-search input {
        width: 100%;
        min-width: 0;
        padding: 12px;
        color: inherit;
        background: var(--panel);
        border: 1px solid #66705c;
        border-radius: 10px;
    }

    .catalog-search input:focus-visible,
    select:focus-visible {
        outline: 2px solid var(--lime);
        outline-offset: 2px;
    }

    .catalog-order select {
        max-width: 190px;
        height: 44px;
        padding: 12px 8px;
        font-size: 12px;
        color: var(--lime);
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 10px;
    }

    @media (width <= 760px) {
        .mobile-filters {
            display: inline-flex;
            min-height: 32px;
            padding: 5px 12px;
            font-size: 11px;
        }

        .catalog-feed {
            grid-template-rows: 109px minmax(0, 1fr) 82px;
        }

        .catalog-toolbar--search {
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
        }

        .catalog-search {
            flex-basis: 100%;
        }

        .catalog-search input {
            font-size: 12px;
        }

        .catalog-search .button {
            gap: 8px;
            padding: 12px;
        }

        .catalog-order select {
            height: 32px;
            padding: 5px 8px;
            font-size: 11px;
        }

        .catalog-footer {
            flex-direction: column;
            justify-content: center;
            gap: 5px;
        }
    }
</style>
