import {
    SOURCE_LINK_PROTOCOLS,
    SOURCE_LITERAL_FORMATS,
    SOURCE_MARKUP_DEPTH_LIMIT,
} from './constants';

export type TSourceNode =

        | { kind: 'text'; text: string }
        | { kind: 'literal'; text: string }
        | { kind: 'paragraph-break' }
        | { kind: 'link'; href: string; children: TSourceNode[] }
        | { kind: 'spoiler'; children: TSourceNode[] }
        | { kind: 'format'; format: string; children: TSourceNode[] };

export const safeSourceUrl = (value: string, baseUrl: string): string | null => {
    try {
        const url = new URL(value, baseUrl);
        return SOURCE_LINK_PROTOCOLS.includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
};

const plainSource = (source: string, baseUrl: string): TSourceNode[] =>
    source.split(/(https?:\/\/[^\s<>[\]]+)/g).flatMap((part): TSourceNode[] => {
        const href = /^https?:\/\//.test(part) ? safeSourceUrl(part, baseUrl) : null;
        if (href) {
            return [{ kind: 'link', href, children: [{ kind: 'literal', text: part }] }];
        }
        return part
            .split(/(\n\s*\n)/)
            .map((text, index) =>
                index % 2 ? { kind: 'paragraph-break' } : { kind: 'text', text });
    });

const parseNodes = (source: string, baseUrl: string, depth: number): TSourceNode[] => {
    if (depth > SOURCE_MARKUP_DEPTH_LIMIT) {
        return [{ kind: 'literal', text: source }];
    }
    const nodes: TSourceNode[] = [];
    const tags = /\[(b|i|u|s|url|quote|spoiler|raw|code)(?:=([^\]\r\n]*))?\]/gi;
    let cursor = 0;
    for (let match = tags.exec(source); match; match = tags.exec(source)) {
        const name = match[1]!.toLowerCase();
        const closing = `[/${name}]`;
        let end = source.toLowerCase().indexOf(closing, tags.lastIndex);
        if (end < 0) {
            continue;
        }
        if (!SOURCE_LITERAL_FORMATS.includes(name)) {
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
        nodes.push(...plainSource(source.slice(cursor, match.index), baseUrl));
        const content = source.slice(tags.lastIndex, end);
        const children: TSourceNode[] = SOURCE_LITERAL_FORMATS.includes(name)
            ? [{ kind: 'literal', text: content }]
            : parseNodes(content, baseUrl, depth + 1);
        if (name === 'url') {
            const href = safeSourceUrl(match[2] ?? content, baseUrl);
            nodes.push(
                href
                    ? { kind: 'link', href, children }
                    : { kind: 'format', format: 'raw', children }
            );
        } else if (name === 'spoiler') {
            nodes.push({ kind: 'spoiler', children });
        } else {
            nodes.push({ kind: 'format', format: name, children });
        }
        cursor = end + closing.length;
        tags.lastIndex = cursor;
    }
    nodes.push(...plainSource(source.slice(cursor), baseUrl));
    return nodes;
};

export const parseSourceMarkup = (source: string, baseUrl: string): TSourceNode[] =>
    parseNodes(source, baseUrl, 0);
