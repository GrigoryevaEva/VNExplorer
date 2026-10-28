import { z } from 'zod';

import type { IRequestOptions } from '@/api/client';
import { queryVndb } from '@/api/client';
import { VNDB_ENDPOINTS, VNDB_FIELDS, VNDB_OPERATORS } from '@/api/protocol';
import type { IVisualNovelDetails } from '@/entities/visual-novel';

import { mapNovelCard, novelCardSchema } from './cards';
import { NOVEL_DETAIL_FIELDS, NOVEL_DETAIL_RESULTS_LIMIT } from './constants';

const dimensionsSchema = z.tuple([z.number().int(), z.number().int()]);
const novelDetailsSchema = novelCardSchema.extend({
    description: z.string().nullable().optional(),
    votecount: z.number().int().nonnegative().nullable().optional(),
    length: z.number().int().min(1).max(5).nullable().optional(),
    length_minutes: z.number().int().nonnegative().nullable().optional(),
    aliases: z.array(z.string()).optional(),
    titles: z
        .array(
            z.looseObject({
                lang: z.string(),
                title: z.string(),
                latin: z.string().nullable(),
                main: z.boolean(),
                official: z.boolean(),
            })
        )
        .optional(),
    tags: z
        .array(
            z.looseObject({
                id: z.string().regex(/^g[1-9]\d*$/),
                name: z.string(),
                spoiler: z.number().int().min(0).max(2).nullable().optional(),
            })
        )
        .optional(),
    screenshots: z
        .array(
            z.looseObject({
                id: z.string(),
                url: z.string(),
                thumbnail: z.string(),
                dims: dimensionsSchema,
                thumbnail_dims: dimensionsSchema,
            })
        )
        .optional(),
});

type TNovelDetailsDto = z.infer<typeof novelDetailsSchema>;

const mapNovelDetails = (dto: TNovelDetailsDto): IVisualNovelDetails => ({
    ...mapNovelCard(dto),
    description: dto.description ?? null,
    voteCount: dto.votecount ?? null,
    lengthCategory: dto.length ?? null,
    playTimeMinutes: dto.length_minutes ?? null,
    aliases: dto.aliases ?? [],
    titles: (dto.titles ?? []).map((title) => ({
        language: title.lang,
        title: title.title,
        romanized: title.latin,
        main: title.main,
        official: title.official,
    })),
    tags: (dto.tags ?? []).map((tag) => ({
        id: tag.id,
        name: tag.name,
        spoilerLevel: tag.spoiler ?? null,
    })),
    screenshots: (dto.screenshots ?? []).map((image) => ({
        id: image.id,
        url: image.url,
        thumbnail: image.thumbnail,
        dims: image.dims,
        thumbnailDimensions: image.thumbnail_dims,
    })),
});

export const fetchNovelDetails = async (
    id: string,
    options: IRequestOptions = {}
): Promise<IVisualNovelDetails | null> => {
    const response = await queryVndb(
        VNDB_ENDPOINTS.NOVELS,
        {
            filters: [VNDB_FIELDS.ID, VNDB_OPERATORS.EQUAL, id],
            fields: NOVEL_DETAIL_FIELDS,
            results: NOVEL_DETAIL_RESULTS_LIMIT,
        },
        { ...options, schema: novelDetailsSchema }
    );
    const novel = response.results[0];
    return novel ? mapNovelDetails(novel) : null;
};
