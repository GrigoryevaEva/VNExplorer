<script setup lang="ts">
    import type { RouteLocationRaw } from 'vue-router';

    defineProps<{ to: RouteLocationRaw }>();
</script>

<template>
    <RouterLink
        :to="to"
        class="back-link"
    >
        <slot />
    </RouterLink>
</template>

<style scoped>
    .back-link {
        display: inline-block;
        margin-bottom: 30px;
        font-size: var(--font-size-body);
        text-decoration: none;
        color: var(--mint);
    }

    .back-link:hover {
        text-decoration: underline;
    }
</style>
