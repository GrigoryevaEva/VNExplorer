<script setup lang="ts">
    interface IProps {
        currentPage: number;
        pageNumbers: number[];
        loading: boolean;
        more: boolean;
        resultCountLabel: string;
    }
    defineProps<IProps>();
    defineEmits<{ change: [page: number] }>();
</script>
<template>
    <footer class="catalog-footer"
        ><span class="catalog-result-count">{{ resultCountLabel }}</span
        ><nav
            class="catalog-pagination"
            aria-label="Catalog pages"
            ><button
                aria-label="Previous page"
                :disabled="currentPage <= 1"
                @click="$emit('change', currentPage - 1)"
                >←</button
            ><template
                v-for="(page, index) in pageNumbers"
                :key="page"
                ><span
                    v-if="index && page > pageNumbers[index - 1]! + 1"
                    aria-hidden="true"
                    >…</span
                ><button
                    :aria-label="`Page ${page}`"
                    :aria-current="page === currentPage ? 'page' : undefined"
                    @click="$emit('change', page)"
                    >{{ page }}</button
                ></template
            ><button
                aria-label="Next page"
                :disabled="!more || loading"
                @click="$emit('change', currentPage + 1)"
                >→</button
            ></nav
        ></footer
    >
</template>
<style scoped>
    .catalog-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: var(--font-size-caption);
        color: var(--muted);
        border-top: 1px solid var(--line);
    }

    @media (--viewport-mobile) {
        .catalog-footer {
            font-size: var(--font-size-micro);
        }
    }

    @media (--viewport-mobile) {
        .catalog-footer {
            flex-direction: column;
            justify-content: center;
            gap: 5px;
        }
    }

    .catalog-pagination {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .catalog-pagination button {
        min-width: 34px;
        min-height: 38px;
        color: var(--muted);
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: var(--radius-small);
    }

    .catalog-pagination button[aria-current] {
        font-weight: bold;
        color: var(--bg);
        background: var(--lime);
        border-color: var(--lime);
    }

    .catalog-pagination button:disabled {
        opacity: 0.35;
    }

    @media (--viewport-mobile) {
        .catalog-pagination {
            gap: 3px;
        }

        .catalog-pagination button {
            min-width: 30px;
            min-height: 40px;
        }
    }
</style>
