<script setup lang="ts">
    import { onMounted, ref } from 'vue';

    import { useResizeObserver } from '@vueuse/core';

    import type { IVisualNovelCard } from '@/entities/visual-novel';
    import { formatRating } from '@/entities/visual-novel';
    import { formatReleaseDate } from '@/shared/utils/dates';

    import CoverImage from './CoverImage.vue';
    defineProps<{ novel: IVisualNovelCard; index?: number }>();
    const card = ref<HTMLElement>();
    // Measure natural height, never the allocated grid area: spanning rows cannot
    // feed back into this observation. VueUse disconnects on unmount.
    const measure = (): void => {
        const element = card.value;
        if (!element) {
            return;
        }
        const gap =
            Number.parseFloat(getComputedStyle(element).getPropertyValue('--masonry-gap')) || 0;
        element.style.gridRowEnd = `span ${Math.ceil(element.getBoundingClientRect().height + gap)}`;
    };
    useResizeObserver(card, measure);
    onMounted(measure);
</script>

<template>
    <article
        ref="card"
        class="novel-card"
    >
        <RouterLink
            :to="`/vn/${novel.id}`"
            class="novel-card__art"
            :aria-label="`Open ${novel.title}`"
            ><CoverImage
                mode="card"
                :dims="novel.image?.dims"
                :src="novel.image?.thumbnail || novel.image?.url"
                :title="novel.title"
            /><span
                v-if="index !== null && index !== undefined"
                class="novel-card__number"
                aria-hidden="true"
                >{{ String(index + 1).padStart(2, '0') }}</span
            ></RouterLink
        >
        <div class="novel-card__ticket"
            ><h2 class="novel-card__title"
                ><RouterLink :to="`/vn/${novel.id}`">{{ novel.title }}</RouterLink></h2
            ><div class="novel-card__facts"
                ><span class="novel-card__date">{{ formatReleaseDate(novel.released) }}</span
                ><span
                    class="novel-card__rating"
                    :class="{
                        'novel-card__rating--empty':
                            novel.rating === null || novel.rating === undefined,
                    }"
                    ><span
                        v-if="novel.rating !== null && novel.rating !== undefined"
                        aria-hidden="true"
                        >★</span
                    >
                    {{ formatRating(novel.rating) }}</span
                ></div
            ><slot name="actions"
        /></div>
    </article>
</template>

<style scoped>
    .novel-card {
        align-self: start;
        min-width: 0;
        overflow: hidden;
        background: #30362e;
        border-radius: 17px;
    }

    .novel-card__art {
        position: relative;
        display: block;
        background: #10130f;
    }

    .novel-card__title a {
        text-decoration: none;
    }

    .novel-card__title a:hover {
        color: var(--lime);
    }

    .novel-card__number {
        position: absolute;
        top: 12px;
        left: 12px;
        padding: 5px 8px;
        font-size: var(--font-size-caption);
        letter-spacing: 1px;
        color: #e7eadf;
        background: #141a12c9;
        border: 1px solid #f3f0e638;
        border-radius: 20px;
        backdrop-filter: blur(5px);
    }

    .novel-card__ticket {
        position: relative;
        min-height: 103px;
        padding: 17px 16px 16px;
        border-top: 1px dashed #74846a66;
    }

    .novel-card__ticket::before,
    .novel-card__ticket::after {
        position: absolute;
        top: -8px;
        width: 15px;
        height: 15px;
        background: var(--bg);
        border-radius: 50%;
        content: '';
    }

    .novel-card__ticket::before {
        left: -8px;
    }

    .novel-card__ticket::after {
        right: -8px;
    }

    .novel-card__title {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: -0.25px;
        overflow-wrap: anywhere;
    }

    .novel-card__facts {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-xs);
        margin-top: 13px;
    }

    .novel-card__date {
        font-size: var(--font-size-caption);
        color: #bdc5b7;
    }

    .novel-card__rating {
        font-size: var(--font-size-sm);
        font-weight: bold;
        white-space: nowrap;
        color: var(--lime);
    }

    .novel-card__rating span {
        margin-right: 2px;
        font-size: var(--font-size-xs);
    }

    .novel-card__rating--empty {
        font-size: var(--font-size-caption);
        font-weight: 400;
        color: #c0c6b8;
    }

    @media (--viewport-mobile) {
        .novel-card {
            border-radius: 12px;
        }

        .novel-card__ticket {
            min-height: 108px;
            padding: 14px 11px;
        }

        .novel-card__title {
            font-size: var(--font-size-body);
        }

        .novel-card__facts {
            align-items: flex-start;
            gap: 5px;
        }

        .novel-card__date {
            max-width: 85px;
            font-size: var(--font-size-micro);
        }

        .novel-card__rating {
            font-size: var(--font-size-xs);
        }

        .novel-card__rating--empty {
            font-size: var(--font-size-micro);
        }

        .novel-card__number {
            top: 8px;
            left: 8px;
            padding: 4px 6px;
            font-size: var(--font-size-tiny);
        }
    }

    @media (width <= 350px) {
        .novel-card__date {
            max-width: none;
        }
    }
</style>
