<script setup lang="ts">
    import { SaveButton } from '@/components/saved';
    import { TagPicker } from '@/components/tags';
    import { NovelCard, NovelGrid } from '@/components/visual-novel';
    import { CacheNotice } from '@/components/vndb-feedback';
    import { CATALOG_SORTS, selectionWithoutFilters } from '@/entities/catalog';

    import CatalogPagination from './components/CatalogPagination.vue';
    import LanguageFilter from './components/LanguageFilter.vue';
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
        <header class="page-heading">
            <div>
                <p class="eyebrow">A WORLD BETWEEN THE LINES</p>
                <h1>
                    Find your next
                    <span>story.</span>
                </h1>
            </div>
            <div
                class="chapter-stamp"
                aria-hidden="true"
            >
                <span>ONE MORE</span>
                <strong>chapter</strong>
                <span>IS ALWAYS A GOOD IDEA ↗</span>
            </div>
        </header>

        <div class="catalog-workspace">
            <div class="catalog-feed">
                <div class="catalog-toolbar catalog-toolbar--search">
                    <form
                        class="catalog-search"
                        role="search"
                        @submit.prevent="submit"
                    >
                        <label
                            class="visually-hidden"
                            for="title-search"
                        >
                            Search titles
                        </label>
                        <input
                            id="title-search"
                            v-model="draftSearch"
                            type="search"
                            placeholder="A title, a world, a new story…"
                        />
                        <button
                            class="button button--lime"
                            type="submit"
                        >
                            Search
                            <span aria-hidden="true">↗</span>
                        </button>
                    </form>
                    <label class="catalog-order">
                        <span class="visually-hidden">Sort stories</span>
                        <select
                            :value="applied.sort"
                            @change="changeSort"
                        >
                            <option :value="CATALOG_SORTS.RATING">Top rated ★</option>
                            <option :value="CATALOG_SORTS.RELEASED">First release · newest</option>
                        </select>
                    </label>
                    <button
                        class="button mobile-filters"
                        @click="openFilters"
                    >
                        Filters
                    </button>
                </div>

                <div
                    :ref="bindGrid"
                    class="scroll-region"
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
                    >
                        <span
                            class="message-symbol"
                            aria-hidden="true"
                        >
                            ✳
                        </span>
                        <h2>Opening a new chapter…</h2>
                        <p>Getting stories from VNDB.</p>
                    </div>
                    <div
                        v-else-if="error"
                        class="feed-message feed-message--error"
                        role="alert"
                    >
                        <span
                            class="message-symbol"
                            aria-hidden="true"
                        >
                            ↺
                        </span>
                        <h2>A little plot twist.</h2>
                        <p>{{ error }}</p>
                        <button
                            class="button button--lime"
                            @click="load"
                        >
                            Try again
                            <span aria-hidden="true">↗</span>
                        </button>
                    </div>
                    <div
                        v-else-if="!novels.length && titleMatchCount"
                        class="feed-message"
                    >
                        <span
                            class="message-symbol"
                            aria-hidden="true"
                        >
                            ○
                        </span>
                        <h2>
                            {{ titleMatchCount.toLocaleString('en') }}
                            {{ titleMatchCount === 1 ? 'match hidden' : 'matches hidden' }} by
                            filters.
                        </h2>
                        <p>
                            Your title search has matches in VNDB. Show them with all filters
                            cleared.
                        </p>
                        <button
                            class="button button--lime"
                            @click="navigate(selectionWithoutFilters(applied))"
                        >
                            Show without filters
                        </button>
                    </div>
                    <div
                        v-else-if="!novels.length"
                        class="feed-message"
                    >
                        <span
                            class="message-symbol"
                            aria-hidden="true"
                        >
                            ○
                        </span>
                        <h2>No stories here yet.</h2>
                        <p>VNDB returned no matching stories. Try another title.</p>
                    </div>
                    <NovelGrid v-else>
                        <NovelCard
                            v-for="(novel, index) in novels"
                            :key="novel.id"
                            :novel="novel"
                            :index="index"
                        >
                            <template #actions>
                                <SaveButton :novel="novel" />
                            </template>
                        </NovelCard>
                    </NovelGrid>
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
                <div ref="filterPanel" />
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
                        >
                            Close ×
                        </button>
                        <h2>Filters</h2>
                        <LanguageFilter v-model="draftLanguage" />
                        <div class="tag-draft">
                            <p class="eyebrow">INCLUDED TAGS</p>
                            <button
                                v-for="id in draftIncluded"
                                :key="id"
                                class="tag-chip"
                                :aria-label="`Remove included tag ${tagName(id)}`"
                                @click="draftIncluded = draftIncluded.filter((tag) => tag !== id)"
                            >
                                + {{ tagName(id) }} ×
                            </button>
                            <p v-if="!draftIncluded.length">Anything goes</p>
                            <p class="eyebrow">EXCLUDED TAGS</p>
                            <button
                                v-for="id in draftExcluded"
                                :key="id"
                                class="tag-chip"
                                :aria-label="`Remove excluded tag ${tagName(id)}`"
                                @click="draftExcluded = draftExcluded.filter((tag) => tag !== id)"
                            >
                                − {{ tagName(id) }} ×
                            </button>
                            <p v-if="!draftExcluded.length">None</p>
                            <label class="strict-match">
                                <input
                                    v-model="draftStrict"
                                    type="checkbox"
                                />
                                Strict match
                            </label>
                            <button
                                class="button tag-browse"
                                @click="
                                    tagsOpen = true;
                                    readTagNames();
                                "
                            >
                                Browse tags
                            </button>
                        </div>
                        <button
                            class="button button--lime"
                            @click="applyFilters"
                        >
                            Apply filters
                        </button>
                    </section>
                </Teleport>

                <section class="selection-card">
                    <p class="eyebrow">YOUR SELECTION</p>
                    <h2>
                        Good stories.
                        <br />
                        No limits.
                    </h2>
                    <dl>
                        <div>
                            <dt>Language</dt>
                            <dd>
                                {{ selectionLanguageLabel }}
                                <span aria-hidden="true">↗</span>
                            </dd>
                        </div>
                        <div>
                            <dt>Tags</dt>
                            <dd>
                                {{
                                    [
                                        ...applied.includedTags.map((id) => '+ ' + tagName(id)),
                                        ...applied.excludedTags.map((id) => '− ' + tagName(id)),
                                    ].join(', ') || 'Anything goes'
                                }}
                                <span aria-hidden="true">✳</span>
                            </dd>
                        </div>
                        <div>
                            <dt>Order</dt>
                            <dd>
                                {{
                                    applied.sort === CATALOG_SORTS.RATING
                                        ? 'Highest rated first'
                                        : 'Newest first release'
                                }}
                                <span aria-hidden="true">★</span>
                            </dd>
                        </div>
                    </dl>
                    <div class="selection-card__note">
                        <span aria-hidden="true">↳</span>
                        Start with the stories readers love.
                    </div>
                </section>

                <div class="reading-card">
                    <span
                        class="reading-card__flower"
                        aria-hidden="true"
                    >
                        ✳
                    </span>
                    <p>
                        Different worlds.
                        <br />
                        <strong>Same curiosity.</strong>
                    </p>
                    <span class="reading-card__bottom">GET LOST IN A GOOD ONE ↗</span>
                </div>
                <p class="source-note">
                    Stories & artwork from
                    <a
                        href="https://vndb.org"
                        target="_blank"
                        rel="noreferrer"
                    >
                        VNDB ↗
                    </a>
                </p>
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
        />
    </section>
</template>

<style scoped>
    .catalog-page {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: 29px;
        height: 100%;
        padding: 30px 38px 0;
    }

    .chapter-stamp {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 173px;
        height: 95px;
        margin: 0 27px;
        border: 1px solid #656c5d;
        border-radius: 50%;
        transform: rotate(-8deg);
    }

    .chapter-stamp span {
        font-size: var(--font-size-tiny);
        letter-spacing: 1px;
    }

    .chapter-stamp strong {
        font-size: 29px;
        font-style: italic;
        line-height: 1.1;
        letter-spacing: -1px;
        color: var(--pink);
    }

    .catalog-workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 265px;
        gap: 27px;
        min-height: 0;
    }

    .catalog-feed {
        display: grid;
        grid-template-rows: 72px minmax(0, 1fr) 61px;
        min-width: 0;
        min-height: 0;
    }

    .catalog-toolbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 15px;
        border-bottom: 1px solid var(--line);
    }

    .catalog-sidebar {
        min-height: 0;
        padding-bottom: var(--space-lg);
        overflow: auto;
        scrollbar-width: thin;
    }

    .selection-card {
        padding: 25px 22px;
        color: #1b241c;
        background: var(--mint);
        border-radius: 20px 20px 5px;
    }

    .selection-card .eyebrow {
        font-size: var(--font-size-micro);
        letter-spacing: 1.2px;
        color: var(--mint-ink);
    }

    .selection-card h2 {
        margin-top: 22px;
        font-size: 32px;
        line-height: 1.06;
        letter-spacing: -1.4px;
    }

    .selection-card dl {
        margin: 24px 0 18px;
    }

    .selection-card dl > div {
        padding: 14px 0;
        border-top: 1px solid #7d9a8566;
    }

    .selection-card dt {
        margin-bottom: 7px;
        font-size: var(--font-size-micro);
        color: #4b6050;
    }

    .selection-card dd {
        display: flex;
        justify-content: space-between;
        margin: 0;
        font-size: var(--font-size-sm);
        font-weight: bold;
    }

    .selection-card__note span {
        font-size: 22px;
        line-height: 20px;
    }

    .selection-card dd span {
        font-size: 17px;
        line-height: 12px;
    }

    .selection-card__note {
        display: flex;
        gap: var(--space-xs);
        padding-top: 15px;
        font-size: var(--font-size-caption);
        line-height: 1.5;
        border-top: 1px solid #7d9a8566;
    }

    .reading-card {
        position: relative;
        margin-top: 15px;
        padding: 19px 22px;
        overflow: hidden;
        color: #2a2027;
        background: var(--pink);
        border-radius: 5px 20px 20px;
    }

    .reading-card__flower {
        display: block;
        font-size: 73px;
        line-height: 1;
        text-align: right;
    }

    .reading-card p {
        margin-top: 5px;
        font-size: 25px;
        line-height: 1.06;
        letter-spacing: -1px;
    }

    .reading-card p strong {
        font-weight: 800;
    }

    .reading-card__bottom {
        display: block;
        margin-top: 22px;
        padding-top: 13px;
        font-size: var(--font-size-tiny);
        letter-spacing: 0.9px;
        border-top: 1px solid #a6779466;
    }

    .source-note {
        padding: 16px 4px;
        font-size: var(--font-size-micro);
        color: var(--muted);
    }

    .source-note a {
        text-decoration: none;
        color: #d9dfd1;
    }

    @media (width >= 1700px) {
        .catalog-page {
            padding-right: 50px;
            padding-left: 50px;
        }

        .catalog-workspace {
            grid-template-columns: minmax(0, 1fr) 290px;
            gap: 32px;
        }
    }

    @media (--viewport-compact) {
        .catalog-workspace {
            grid-template-columns: minmax(0, 1fr) 225px;
            gap: var(--space-lg);
        }

        .catalog-page {
            padding: 25px 24px 0;
        }

        .selection-card {
            padding: 22px 18px;
        }

        .selection-card h2 {
            font-size: 29px;
        }

        .reading-card {
            padding: 18px;
        }

        .chapter-stamp {
            margin-right: 0;
        }
    }

    @media (--viewport-mobile) {
        .catalog-page {
            gap: 23px;
            padding: 23px 17px 0;
        }

        .chapter-stamp,
        .catalog-sidebar {
            display: none;
        }

        .catalog-workspace {
            display: block;
        }

        .catalog-feed {
            grid-template-rows: 36px minmax(0, 1fr) 56px;
            height: 100%;
        }
    }

    .tag-draft {
        display: grid;
        gap: 10px;
        margin: 20px 0;
        font-size: var(--font-size-sm);
    }

    .tag-chip {
        padding: 10px;
        text-align: left;
        overflow-wrap: anywhere;
        color: inherit;
        background: #fff5;
        border-radius: var(--radius-small);
    }

    .tag-browse {
        justify-content: center;
        color: inherit;
        background: transparent;
        border: 1px solid #718775;
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
        padding: var(--space-xs);
        color: inherit;
        background: transparent;
        border: 1px solid var(--line);
        border-radius: var(--radius-small);
    }

    .catalog-toolbar--search {
        align-items: flex-start;
        gap: var(--space-sm);
    }

    .catalog-search {
        display: flex;
        flex: 1;
        gap: var(--space-xs);
        min-width: 0;
    }

    .catalog-search input {
        width: 100%;
        min-width: 0;
        padding: var(--space-sm);
        color: inherit;
        background: var(--panel);
        border: 1px solid #66705c;
        border-radius: var(--radius-control);
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
        font-size: var(--font-size-sm);
        color: var(--lime);
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: var(--radius-control);
    }

    @media (--viewport-mobile) {
        .mobile-filters {
            display: inline-flex;
            min-height: 32px;
            padding: 5px 12px;
            font-size: var(--font-size-xs);
        }

        .catalog-feed {
            grid-template-rows: 109px minmax(0, 1fr) 82px;
        }

        .catalog-toolbar--search {
            flex-wrap: wrap;
            gap: var(--space-xs);
            margin-bottom: 10px;
        }

        .catalog-search {
            flex-basis: 100%;
        }

        .catalog-search input {
            font-size: var(--font-size-sm);
        }

        .catalog-search .button {
            gap: var(--space-xs);
            padding: var(--space-sm);
        }

        .catalog-order select {
            height: 32px;
            padding: 5px 8px;
            font-size: var(--font-size-xs);
        }
    }
</style>
