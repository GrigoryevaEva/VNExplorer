import { TAG_SECTIONS } from './constants';
import type { IDirectoryTag } from './types';

export const selectDirectoryTags = (
    tags: readonly IDirectoryTag[],
    section: string,
    search: string
): readonly IDirectoryTag[] => {
    const term = search.trim().toLocaleLowerCase('en');
    const ids = TAG_SECTIONS.find((item) => item.name === section)?.ids;
    return tags.filter((tag) =>
        term ? tag.name.toLocaleLowerCase('en').includes(term) : !ids || ids.includes(tag.id));
};
