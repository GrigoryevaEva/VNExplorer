import { expect, it } from 'vitest';

import { parseSourceMarkup, safeSourceUrl } from '@/shared/utils/source-markup';

it('keeps nested markup and paragraph breaks inside a spoiler while rejecting executable links', () => {
    const nodes = parseSourceMarkup(
        '[spoiler]First\n\n[b]second[/b][/spoiler]',
        'https://vndb.org'
    );
    expect(nodes).toContainEqual({
        kind: 'spoiler',
        children: [
            { kind: 'text', text: 'First' },
            { kind: 'paragraph-break' },
            { kind: 'text', text: '' },
            { kind: 'format', format: 'b', children: [{ kind: 'text', text: 'second' }] },
            { kind: 'text', text: '' },
        ],
    });
    expect(safeSourceUrl('/v17', 'https://vndb.org')).toBe('https://vndb.org/v17');
    expect(safeSourceUrl('javascript:alert(1)', 'https://vndb.org')).toBeNull();
    expect(safeSourceUrl('data:text/html,<script>', 'https://vndb.org')).toBeNull();
});
