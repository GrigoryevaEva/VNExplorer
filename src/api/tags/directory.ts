import { z } from 'zod';

import { queryVndb } from '@/api/client';
import { VNDB_ENDPOINTS, VNDB_FIELDS } from '@/api/protocol';
import type { IDirectoryTag } from '@/entities/tag';

import { TAG_DIRECTORY_FIELDS, TAG_DIRECTORY_PAGE_SIZE } from './constants';

const tagSchema = z.looseObject({
    id: z.string().regex(/^g[1-9]\d*$/),
    name: z.string(),
    description: z.string().optional(),
    searchable: z.boolean(),
});

type TTagDto = z.infer<typeof tagSchema>;

interface ITagDirectoryOptions {
    onProgress?: (count: number) => void;
    onStale?: () => void;
}

const mapTag = (tag: TTagDto): IDirectoryTag => ({
    id: tag.id,
    name: tag.name,
    description: tag.description ?? '',
    searchable: tag.searchable,
});

export const fetchTagDirectory = async (
    options: ITagDirectoryOptions = {}
): Promise<IDirectoryTag[]> => {
    const tags = new Map<string, IDirectoryTag>();
    for (let page = 1; ; page++) {
        const response = await queryVndb(
            VNDB_ENDPOINTS.TAGS,
            {
                fields: TAG_DIRECTORY_FIELDS,
                sort: VNDB_FIELDS.ID,
                results: TAG_DIRECTORY_PAGE_SIZE,
                page,
            },
            { schema: tagSchema, onStale: options.onStale }
        );
        for (const tag of response.results) {
            if (tag.searchable) {
                tags.set(tag.id, mapTag(tag));
            }
        }
        options.onProgress?.(tags.size);
        if (!response.more) {
            return [...tags.values()].sort((first, second) =>
                first.name.localeCompare(second.name, 'en'));
        }
    }
};
