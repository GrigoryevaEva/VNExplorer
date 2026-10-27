<script setup lang="ts">
import type { VisualNovelCard } from '../modules/vndb/types'
import { formatRating, formatReleaseDate } from '../modules/vndb/format'
import CoverImage from './CoverImage.vue'
defineProps<{ novel: VisualNovelCard; index?: number }>()
</script>

<template>
  <article class="novel-card">
    <RouterLink :to="`/vn/${novel.id}`" class="novel-card__art" :aria-label="`Open ${novel.title}`"><CoverImage :src="novel.image?.thumbnail || novel.image?.url" :title="novel.title" /><span v-if="index != null" class="novel-card__number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span></RouterLink>
    <div class="novel-card__ticket"><h2 class="novel-card__title"><RouterLink :to="`/vn/${novel.id}`">{{ novel.title }}</RouterLink></h2><div class="novel-card__facts"><span class="novel-card__date">{{ formatReleaseDate(novel.released) }}</span><span class="novel-card__rating" :class="{ 'novel-card__rating--empty': novel.rating == null }"><span v-if="novel.rating != null" aria-hidden="true">★</span> {{ formatRating(novel.rating) }}</span></div></div>
  </article>
</template>
