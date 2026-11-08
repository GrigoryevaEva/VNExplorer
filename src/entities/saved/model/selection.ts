import type { IVisualNovelCard } from '@/entities/visual-novel/model';

import { SAVED_SORTS } from './constants';
import { snapshotNovel } from './snapshot';
import type { ISavedEntry, TSavedSort } from './types';

const releaseDateKey = (value: string | null): string =>
    value && /^\d{4}(?:-\d{2}){0,2}$/.test(value) ? value : '';

export const selectSaved = (
    entries: readonly Readonly<ISavedEntry>[],
    search: string,
    sort: TSavedSort
): IVisualNovelCard[] => {
    const text = search.trim().toLocaleLowerCase('en');
    return entries
        .filter((entry) => entry.novel.title.toLocaleLowerCase('en').includes(text))
        .sort((first, second) => {
            if (sort === SAVED_SORTS.RATING) {
                return (
                    (second.novel.rating ?? -1) - (first.novel.rating ?? -1) ||
                    second.addedAt - first.addedAt
                );
            }
            if (sort === SAVED_SORTS.RELEASED) {
                return (
                    releaseDateKey(second.novel.released).localeCompare(
                        releaseDateKey(first.novel.released)
                    ) || second.addedAt - first.addedAt
                );
            }
            return second.addedAt - first.addedAt;
        })
        .map((entry) => snapshotNovel(entry.novel));
};
