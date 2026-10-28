import { describe, expect, it } from 'vitest';

import { selectionFromQuery, selectionToQuery } from '@/modules/catalog/selection';

describe('applied Catalog URL conditions', () => {
    it('restores included/excluded tags, match mode, language and pagination from a shared URL', () => {
        const selection = selectionFromQuery({
            q: '  moon  ',
            tag: ['g3', 'g1', 'g3', 'invalid'],
            exclude: ['g3', 'g2'],
            strict: '0',
            language: 'ru',
            sort: 'released',
            page: '4',
        });

        expect(selection).toEqual({
            search: 'moon',
            includedTags: ['g1'],
            excludedTags: ['g2', 'g3'],
            strictMatch: false,
            language: 'ru',
            sort: 'released',
            page: 4,
        });
        expect(selectionToQuery(selection)).toEqual({
            q: 'moon',
            tag: ['g1'],
            exclude: ['g2', 'g3'],
            strict: '0',
            language: 'ru',
            sort: 'released',
            page: '4',
        });
    });

    it('drops invalid parameters without putting default conditions into the URL', () => {
        const selection = selectionFromQuery({
            language: 'unsupported',
            sort: 'unsupported',
            page: '-2',
            tag: ['g0', 'g01', null],
        });

        expect(selection).toEqual({
            search: '',
            includedTags: [],
            excludedTags: [],
            strictMatch: true,
            language: 'all',
            sort: 'rating',
            page: 1,
        });
        expect(selectionToQuery(selection)).toEqual({});
    });
});
