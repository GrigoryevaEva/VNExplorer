<script setup lang="ts">
    import { computed } from 'vue';

    import type { IReleaseDetails } from '@/entities/release';
    import {
        isPlanned,
        platformName,
        releaseAgeLabel,
        releaseEditionLabels,
        releaseWebsites,
    } from '@/entities/release';
    import { formatReleaseDate } from '@/shared/utils/dates';
    interface IReleaseRowProps {
        release: IReleaseDetails;
        novelId: string;
        language: string;
    }
    const props = defineProps<IReleaseRowProps>();
    const websites = computed(() => releaseWebsites(props.release));
    const editionLabels = computed(() =>
        releaseEditionLabels(props.release, props.novelId, props.language));
    const ageLabel = computed(() => releaseAgeLabel(props.release.minimumAge));
</script>
<template>
    <li class="release-row">
        <div class="release-date"
            >{{ formatReleaseDate(release.released)
            }}<span
                v-if="isPlanned(release.released)"
                class="planned"
                >Planned</span
            ></div
        >
        <span class="release-age">{{ ageLabel }}</span>
        <div class="release-title">
            <a
                v-if="websites.length === 1"
                :href="websites[0]!.url"
                target="_blank"
                rel="noopener noreferrer"
                >{{ release.title }} ↗</a
            >
            <details
                v-else-if="websites.length > 1"
                class="website-menu"
                ><summary>{{ release.title }} ↗</summary
                ><div
                    ><p
                        v-for="link in websites"
                        :key="link.url"
                        ><a
                            :href="link.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            >{{ link.label }} · {{ link.url }}</a
                        ></p
                    ></div
                ></details
            >
            <span v-else>{{ release.title }}</span>
            <div
                v-if="editionLabels.length"
                class="edition-labels"
                ><span
                    v-for="label in editionLabels"
                    :key="label"
                    >{{ label }}</span
                ></div
            >
        </div>
        <span class="release-platforms"
            ><span
                v-for="platform in release.platforms"
                :key="platform"
                class="platform"
                >{{ platformName(platform) }}</span
            ></span
        >
        <span class="release-status">{{ release.official ? 'Official' : 'Unofficial' }}</span>
    </li>
</template>
<style scoped>
    .release-row {
        display: grid;
        grid-template-columns: 130px 88px minmax(0, 1fr) 125px 80px;
        align-items: center;
        gap: var(--space-sm);
        padding: 17px 0;
        font-size: var(--font-size-sm);
        line-height: 1.6;
        border-top: 1px dashed var(--line);
    }

    .release-title {
        font-size: 14px;
        overflow-wrap: anywhere;
    }

    .edition-labels {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 10px;
        margin-top: 4px;
        font-size: var(--font-size-xs);
        color: var(--muted);
    }

    a {
        color: var(--mint);
    }

    .release-age,
    .release-date,
    .release-platforms,
    .release-status {
        color: var(--muted);
    }

    .planned {
        display: block;
        font-size: var(--font-size-caption);
        text-transform: uppercase;
        color: var(--lime);
    }

    .platform {
        display: inline-block;
        margin-right: 6px;
    }

    .website-menu summary {
        color: var(--mint);
        cursor: pointer;
    }

    .website-menu div {
        padding-left: 18px;
    }

    @media (--viewport-mobile) {
        .release-row {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 6px 12px;
        }

        .release-title {
            grid-column: 1 / -1;
            grid-row: 1;
        }

        .release-platforms {
            grid-column: 1;
        }

        .release-status {
            text-align: right;
        }
    }
</style>
