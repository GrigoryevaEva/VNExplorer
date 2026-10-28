import { defineComponent, h, type VNodeChild } from 'vue';

function safeUrl(value: string): string | null {
    try {
        const url = new URL(value, 'https://vndb.org');
        return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

// Build Vue nodes from the small source BBCode vocabulary. Source HTML is always text.
function inline(source: string, depth = 0): VNodeChild[] {
    if (depth > 30) return [source];
    const nodes: VNodeChild[] = [];
    const tags = /\[(b|i|u|s|url|quote|spoiler|raw|code)(?:=([^\]\r\n]*))?\]/gi;
    let cursor = 0;
    for (let match = tags.exec(source); match; match = tags.exec(source)) {
        const name = match[1]!.toLowerCase();
        const closing = `[/${name}]`;
        // Match the corresponding closing tag, including same-tag nesting.
        let end = source.toLowerCase().indexOf(closing, tags.lastIndex);
        if (end < 0) continue;
        if (!['raw', 'code'].includes(name)) {
            const nested = new RegExp(`\\[(/?)${name}(?:=[^\\]]*)?\\]`, 'gi');
            nested.lastIndex = tags.lastIndex;
            let level = 1;
            for (let token = nested.exec(source); token; token = nested.exec(source)) {
                level += token[1] ? -1 : 1;
                if (level === 0) {
                    end = token.index;
                    break;
                }
            }
        }
        nodes.push(...plain(source.slice(cursor, match.index)));
        const content = source.slice(tags.lastIndex, end);
        const children = ['raw', 'code'].includes(name) ? [content] : inline(content, depth + 1);
        if (name === 'url') {
            const href = safeUrl(match[2] ?? content);
            nodes.push(
                href
                    ? h('a', { href, rel: 'noopener noreferrer' }, children)
                    : h('span', {}, children)
            );
        } else if (name === 'spoiler') {
            nodes.push(
                h('details', { class: 'source-spoiler' }, [
                    h('summary', 'Source spoiler'),
                    h('div', children),
                ])
            );
        } else {
            const element = {
                b: 'strong',
                i: 'em',
                u: 'u',
                s: 's',
                quote: 'blockquote',
                raw: 'span',
                code: 'code',
            }[name]!;
            nodes.push(h(element, {}, children));
        }
        cursor = end + closing.length;
        tags.lastIndex = cursor;
    }
    nodes.push(...plain(source.slice(cursor)));
    return nodes;
}

function plain(source: string): VNodeChild[] {
    return source.split(/(https?:\/\/[^\s<>[\]]+)/g).flatMap((part) => {
        const href = /^https?:\/\//.test(part) ? safeUrl(part) : null;
        if (href) return [h('a', { href, rel: 'noopener noreferrer' }, part)];
        // Paragraph presentation belongs to text nodes after paired formatting has
        // been recognized. A break inside bold/link/spoiler content must not split
        // its source delimiters or reveal the contents of a closed disclosure.
        return part
            .split(/(\n\s*\n)/)
            .map((text, index) =>
                index % 2
                    ? h('span', { class: 'source-paragraph-break', 'aria-hidden': 'true' })
                    : h('span', text));
    });
}

export default defineComponent({
    props: { text: { type: String, required: true } },
    setup: (props) => () => h('div', { class: 'source-description' }, inline(props.text)),
});
