<script setup lang="ts">
    import { CacheNotice } from '@/components/vndb-feedback';

    import ReleaseRow from './ReleaseRow.vue';
    import { useReleaseGroups } from './useReleaseGroups';
    interface IReleaseGroupsProps {
        novelId: string;
    }
    const props = defineProps<IReleaseGroupsProps>();
    const {
        manifestLoading,
        manifestError,
        manifestStale,
        staleReleases,
        expanded,
        loading,
        errors,
        groups,
        loadDirectory,
        loaded,
        rows,
        loadGroup,
        toggle,
    } = useReleaseGroups(props.novelId);
</script>
<template>
    <section
        class="releases"
        aria-labelledby="releases-heading"
    >
        <h2 id="releases-heading">Releases</h2>
        <CacheNotice v-if="manifestStale && !manifestLoading" />
        <p
            v-if="manifestLoading"
            role="status"
            >Finding release languages…</p
        >
        <div
            v-else-if="manifestError"
            role="alert"
            ><p>Could not load release languages. {{ manifestError }}</p
            ><button
                class="button"
                @click="loadDirectory"
                >Retry release directory</button
            ></div
        >
        <p
            v-else-if="!groups.length"
            class="muted"
            >No releases listed.</p
        >
        <div
            v-for="group in groups"
            :key="group.code"
            class="release-group"
        >
            <h3
                ><button
                    :id="`release-language-${group.code}`"
                    class="group-toggle"
                    :aria-expanded="expanded.has(group.code)"
                    :aria-controls="`release-group-${group.code}`"
                    @click="toggle(group.code, group.ids)"
                    >{{ group.name }} · {{ group.ids.length }}
                    {{ group.ids.length === 1 ? 'release' : 'releases'
                    }}<span aria-hidden="true">{{
                        expanded.has(group.code) ? '−' : '+'
                    }}</span></button
                ></h3
            >
            <div
                v-if="expanded.has(group.code)"
                :id="`release-group-${group.code}`"
                role="region"
                :aria-label="`${group.name} releases`"
                class="group-content"
            >
                <CacheNotice v-if="group.ids.some((id) => staleReleases.has(id))" />
                <p
                    v-if="loading.has(group.code)"
                    role="status"
                    >Loading releases: {{ loaded(group.ids) }} / {{ group.ids.length }}</p
                >
                <div
                    v-if="errors.has(group.code)"
                    role="alert"
                    ><p
                        >Could not load {{ group.name }} releases.
                        {{ errors.get(group.code) }} Loaded {{ loaded(group.ids) }} /
                        {{ group.ids.length }}.</p
                    ><button
                        class="button"
                        @click="loadGroup(group.code, group.ids)"
                        >Retry {{ group.name }} releases</button
                    ></div
                >
                <ul class="release-list">
                    <ReleaseRow
                        v-for="release in rows(group.ids)"
                        :key="release.id"
                        :release="release"
                        :novel-id="novelId"
                        :language="group.code"
                    />
                </ul>
            </div>
        </div>
    </section>
</template>

<style scoped>
    .releases {
        margin-top: 42px;
        padding-top: 25px;
        border-top: 1px dashed var(--line);
    }

    h2 {
        margin-bottom: var(--space-lg);
        font-size: 24px;
    }

    h3 {
        margin: 0;
    }

    .release-group {
        margin-top: var(--space-sm);
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 4px 16px 4px 4px;
    }

    .group-toggle {
        display: flex;
        justify-content: space-between;
        gap: 15px;
        width: 100%;
        padding: 18px;
        font: inherit;
        text-align: left;
        color: var(--mint);
        background: var(--panel, #22252c);
        border: 0;
        cursor: pointer;
    }

    .group-content {
        padding: 0 16px;
    }

    .release-list {
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .muted {
        color: var(--muted);
    }
</style>
