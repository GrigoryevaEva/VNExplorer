<script setup lang="ts">
    import { VNDB_STALE_MESSAGE } from './model/constants';
</script>

<template>
    <p
        class="cache-notice"
        role="status"
    >
        {{ VNDB_STALE_MESSAGE }}
    </p>
</template>

<style scoped>
    .cache-notice {
        margin-bottom: var(--space-md);
        padding: var(--space-sm);
        font-size: var(--font-size-sm);
        line-height: 1.6;
        color: var(--pink);
        border: 1px dashed var(--line);
        border-radius: var(--radius-control);
    }
</style>
