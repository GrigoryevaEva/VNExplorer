<script setup lang="ts">
    import { storeToRefs } from 'pinia';
    import { onBeforeUnmount, watch } from 'vue';

    import { VNDB_SITE_URL } from '@/api/protocol';
    import { catalogTagLocation, useCatalogReturn, useNovelRouteId } from '@/app/route';
    import { CoverImage } from '@/components/cover-image';
    import { ReleaseGroups } from '@/components/releases';
    import { SaveButton } from '@/components/save-button';
    import { ScreenshotGallery } from '@/components/screenshots';
    import { SourceDescription } from '@/components/source-description';
    import { CacheNotice } from '@/components/vndb-feedback';
    import { formatPlayTime, formatRating } from '@/entities/visual-novel/model';
    import { useNovelDetailsStore } from '@/entities/visual-novel/store';
    import { BackLink } from '@/shared/ui/components/back-link';
    import { formatReleaseDate } from '@/shared/utils/dates';

    const returnToCatalog = useCatalogReturn();
    const novelId = useNovelRouteId();
    const store = useNovelDetailsStore();
    const {
        load,
        retry,
        clear,
    } = store;

    const {
        novel,
        loading,
        error,
        stale,
        titles,
        tags,
    } = storeToRefs(store);

    watch(novelId, (id) => void load(id), { immediate: true });
    onBeforeUnmount(clear);
</script>

<template>
    <div class="detail-page">
        <BackLink
            to="/"
            @click="returnToCatalog"
        >
            ← Catalog
        </BackLink>

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
            <h1>Opening the story…</h1>
        </div>
        <div
            v-else-if="error"
            class="feed-message feed-message--error"
            role="alert"
        >
            <h1>Could not open this story</h1>
            <p>{{ error }}</p>
            <button
                class="button button--lime"
                @click="retry"
            >
                Try again ↗
            </button>
        </div>
        <div
            v-else-if="!novel"
            class="feed-message"
        >
            <h1>Story not found</h1>
            <p>This visual novel is unavailable or its ID is unknown.</p>
            <RouterLink to="/">Explore Catalog</RouterLink>
        </div>
        <article v-else>
            <div class="detail-hero">
                <div class="detail-cover">
                    <CoverImage
                        :src="novel.image?.url"
                        :title="novel.title"
                    />
                </div>
                <div class="detail-introduction">
                    <p class="eyebrow">A STORY TO GET LOST IN / {{ novel.id }}</p>
                    <h1>{{ novel.title }}</h1>
                    <dl class="detail-facts">
                        <div>
                            <dt>Rating</dt>
                            <dd class="detail-rating">{{ formatRating(novel.rating) }}</dd>
                            <p>
                                {{
                                    novel.voteCount === null || novel.voteCount === undefined
                                        ? 'Vote count unknown'
                                        : `${novel.voteCount.toLocaleString('en')} votes`
                                }}
                            </p>
                        </div>
                        <div>
                            <dt>First release</dt>
                            <dd>{{ formatReleaseDate(novel.released) }}</dd>
                        </div>
                        <div>
                            <dt>Approximate play time</dt>
                            <dd>{{ formatPlayTime(novel) }}</dd>
                        </div>
                    </dl>
                    <SaveButton :novel="novel" />
                </div>
            </div>

            <section
                class="detail-section"
                aria-labelledby="description-heading"
            >
                <h2 id="description-heading">The story</h2>
                <SourceDescription
                    v-if="novel.description"
                    :base-url="VNDB_SITE_URL"
                    class="detail-description"
                    :text="novel.description"
                />
                <p
                    v-else
                    class="detail-empty"
                >
                    No description available.
                </p>
            </section>

            <section
                class="detail-section"
                aria-labelledby="titles-heading"
            >
                <h2 id="titles-heading">Alternative titles</h2>
                <ul
                    v-if="titles.length"
                    class="detail-titles"
                >
                    <li
                        v-for="title in titles"
                        :key="title"
                    >
                        {{ title }}
                    </li>
                </ul>
                <p
                    v-else
                    class="detail-empty"
                >
                    No alternative titles listed.
                </p>
            </section>

            <section
                class="detail-section"
                aria-labelledby="tags-heading"
            >
                <h2 id="tags-heading">Spoiler-free tags</h2>
                <ul
                    v-if="tags.length"
                    class="detail-tags"
                >
                    <li
                        v-for="tag in tags"
                        :key="tag.id"
                    >
                        <RouterLink :to="catalogTagLocation(tag.id)">
                            {{ tag.name }}
                        </RouterLink>
                    </li>
                </ul>
                <p
                    v-else
                    class="detail-empty"
                >
                    No spoiler-free tags listed.
                </p>
            </section>

            <ScreenshotGallery :screenshots="novel.screenshots" />

            <ReleaseGroups
                :key="novel.id"
                :novel-id="novel.id"
            />
        </article>
    </div>
</template>

<style scoped>
    .detail-page {
        max-width: 1240px;
        margin: auto;
        padding: 30px 38px 80px;
    }

    .detail-hero {
        display: grid;
        grid-template-columns: minmax(220px, 330px) minmax(0, 1fr);
        align-items: center;
        gap: 48px;
    }

    .detail-cover {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 18px 18px 4px;
    }

    .detail-introduction h1 {
        margin-top: 22px;
        font-size: clamp(36px, 5vw, 64px);
        line-height: 1.1;
        letter-spacing: -2px;
        overflow-wrap: anywhere;
    }

    .detail-facts {
        display: grid;
        gap: 22px;
        margin: 30px 0 0;
    }

    .detail-facts dt {
        margin-bottom: var(--space-xs);
        font-size: var(--font-size-xs);
        color: var(--muted);
    }

    .detail-facts dd {
        margin: 0;
        font-size: 18px;
    }

    .detail-facts p {
        margin-top: 6px;
        font-size: var(--font-size-sm);
        color: var(--muted);
    }

    .detail-facts .detail-rating {
        font-size: 32px;
        font-weight: bold;
        color: var(--lime);
    }

    .detail-section {
        margin-top: 42px;
        padding-top: 25px;
        border-top: 1px dashed var(--line);
    }

    .detail-section h2 {
        margin-bottom: var(--space-lg);
        font-size: 24px;
        letter-spacing: -0.5px;
    }

    .detail-description {
        line-height: 1.8;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .detail-titles {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-sm);
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .detail-titles li {
        padding: 12px 17px;
        line-height: 1.5;
        border: 1px solid var(--line);
        border-radius: 3px 14px 14px;
    }

    .detail-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .detail-tags li {
        min-width: 0;
        max-width: 100%;
    }

    .detail-tags a {
        display: block;
        min-height: 44px;
        padding: 12px 16px;
        text-decoration: none;
        overflow-wrap: anywhere;
        color: var(--mint);
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 3px 14px 14px;
    }

    .detail-tags a:hover {
        border-color: var(--mint);
    }

    .detail-empty {
        line-height: 1.6;
        color: var(--muted);
    }

    @media (--viewport-mobile) {
        .detail-page {
            padding: 24px 18px 60px;
        }

        .detail-hero {
            grid-template-columns: 1fr;
            gap: 28px;
        }

        .detail-cover {
            width: min(100%, 330px);
            margin: auto;
        }

        .detail-introduction h1 {
            font-size: 38px;
        }

        .detail-facts {
            gap: var(--space-lg);
        }
    }
</style>
