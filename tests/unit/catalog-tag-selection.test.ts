import { expect, it } from 'vitest';

import { toggleCatalogTag } from '@/entities/catalog';

it('replaces opposite draft tag actions and toggles the same action without mutating the input', () => {
    const original = { includedTags: ['g96'], excludedTags: ['g2'] };
    const excluded = toggleCatalogTag(original, 'g96', 'exclude');
    expect(excluded).toEqual({ includedTags: [], excludedTags: ['g2', 'g96'] });
    expect(toggleCatalogTag(excluded, 'g96', 'exclude')).toEqual({
        includedTags: [],
        excludedTags: ['g2'],
    });
    expect(toggleCatalogTag(excluded, 'g2', 'include')).toEqual({
        includedTags: ['g2'],
        excludedTags: ['g96'],
    });
    expect(original).toEqual({ includedTags: ['g96'], excludedTags: ['g2'] });
});
