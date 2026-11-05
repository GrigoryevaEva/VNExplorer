<script setup lang="ts">
    import { SaveButton } from '@/components/saved';
    import { NovelCard, NovelGrid } from '@/components/visual-novel';
    import { CacheNotice } from '@/components/vndb-feedback';

    import { useSavedPage } from './useSavedPage';
    const {
        search,
        sort,
        novels,
        savedNovels,
        refreshError,
        refreshing,
        stale,
        refresh,
    } = useSavedPage();
</script>

<template>
    <section
        class="saved-page"
        aria-label="Saved visual novels"
    >
        <header class="page-heading">
            <div>
                <p class="eyebrow">KEPT FOR ANOTHER CHAPTER</p>
                <h1>
                    Your
                    <span>Saved.</span>
                </h1>
            </div>
        </header>

        <div>
            <CacheNotice v-if="stale && !refreshing" />
            <div class="saved-toolbar">
                <label>
                    Search Saved
                    <input
                        v-model="search"
                        type="search"
                        placeholder="Find a kept story…"
                    />
                </label>
                <label>
                    Sort saved stories
                    <select v-model="sort">
                        <option value="added">Recently added</option>
                        <option value="rating">Top rated</option>
                        <option value="released">First release · newest</option>
                    </select>
                </label>
            </div>
            <p
                v-if="refreshError"
                class="saved-refresh"
            >
                Could not refresh from VNDB. Showing your last-known saved details.
                <button @click="refresh">Try again</button>
            </p>
            <p
                v-else-if="refreshing"
                class="saved-refresh"
            >
                Showing saved details while checking VNDB…
            </p>
        </div>

        <div
            v-if="!savedNovels.length"
            class="feed-message"
        >
            <h2>Your collection starts here.</h2>
            <p>Save a story from Catalog to keep it for later.</p>
            <RouterLink to="/">Explore Catalog ↗</RouterLink>
        </div>
        <div
            v-else
            class="scroll-region"
            role="region"
            aria-label="Saved results"
            tabindex="0"
        >
            <div
                v-if="!novels.length"
                class="feed-message"
            >
                <h2>No saved stories match.</h2>
                <p>Try another title or clear your search.</p>
            </div>
            <NovelGrid v-else>
                <NovelCard
                    v-for="novel in novels"
                    :key="novel.id"
                    :novel="novel"
                >
                    <template #actions>
                        <SaveButton :novel="novel" />
                    </template>
                </NovelCard>
            </NovelGrid>
        </div>
    </section>
</template>

<style scoped>
    .saved-page {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        gap: 25px;
        height: 100%;
        padding: 30px 38px 0;
    }

    .saved-toolbar {
        display: flex;
        align-items: end;
        gap: var(--space-lg);
        padding-bottom: var(--space-md);
        border-bottom: 1px solid var(--line);
    }

    .saved-toolbar label {
        display: grid;
        gap: var(--space-xs);
        font-size: var(--font-size-xs);
        color: var(--muted);
    }

    .saved-toolbar label:first-child {
        flex: 1;
    }

    .saved-toolbar input,
    .saved-toolbar select {
        min-width: 0;
        max-width: 100%;
        padding: var(--space-sm);
        color: var(--mint);
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: var(--radius-control);
    }

    .saved-refresh {
        margin-top: var(--space-sm);
        font-size: var(--font-size-sm);
        line-height: 1.5;
        color: var(--muted);
    }

    .saved-refresh button {
        padding: 5px;
        text-decoration: underline;
        color: var(--mint);
        background: transparent;
    }

    @media (--viewport-mobile) {
        .saved-page {
            padding: 23px 17px 0;
        }
    }
</style>
