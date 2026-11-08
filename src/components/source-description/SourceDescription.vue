<script setup lang="ts">
    import type { VNodeChild } from 'vue';
    import { computed, h } from 'vue';

    import type { TSourceNode } from '@/shared/utils/source-markup';
    import { parseSourceMarkup } from '@/shared/utils/source-markup';

    import { SOURCE_ELEMENTS, SOURCE_LINK_REL, SOURCE_SPOILER_LABEL } from './model/constants';

    interface ISourceDescriptionProps {
        text: string;
        baseUrl: string;
    }
    const props = defineProps<ISourceDescriptionProps>();
    const nodes = computed(() => parseSourceMarkup(props.text, props.baseUrl));

    const renderNode = (node: TSourceNode): VNodeChild => {
        if (node.kind === 'literal') {
            return node.text;
        }
        if (node.kind === 'text') {
            return h('span', node.text);
        }
        if (node.kind === 'paragraph-break') {
            return h('span', { class: 'source-paragraph-break', 'aria-hidden': 'true' });
        }
        const children = node.children.map(renderNode);
        if (node.kind === 'link') {
            return h('a', { href: node.href, rel: SOURCE_LINK_REL }, children);
        }
        if (node.kind === 'spoiler') {
            return h('details', { class: 'source-spoiler' }, [
                h('summary', SOURCE_SPOILER_LABEL),
                h('div', children),
            ]);
        }
        return h(SOURCE_ELEMENTS[node.format]!, {}, children);
    };
    const SourceNodes = (nodeProps: { nodes: TSourceNode[] }) => nodeProps.nodes.map(renderNode);
</script>

<template>
    <div class="source-description">
        <SourceNodes :nodes="nodes" />
    </div>
</template>

<style scoped>
    .source-description :deep(.source-paragraph-break) {
        display: block;
        height: 1.25em;
    }

    .source-description :deep(a) {
        color: var(--mint);
        text-underline-offset: 3px;
    }

    .source-description :deep(blockquote) {
        margin: 1em 0;
        padding-left: 18px;
        color: var(--muted);
        border-left: 3px solid var(--mint);
    }

    .source-description :deep(.source-spoiler) {
        padding: 10px 14px;
        border: 1px solid var(--line);
    }

    .source-description :deep(.source-spoiler summary) {
        color: var(--pink);
        cursor: pointer;
    }
</style>
