import { z } from 'zod';

import type { IVisualNovelCard } from '@/entities/visual-novel/model';

export const novelCardSchema = z.looseObject({
    id: z.string().regex(/^v[1-9]\d*$/),
    title: z.string(),
    released: z.string().nullable().optional(),
    rating: z.number().finite().nullable().optional(),
    image: z
        .looseObject({
            url: z.string(),
            thumbnail: z.string().optional(),
            dims: z.tuple([z.number(), z.number()]).optional(),
        })
        .nullable()
        .optional(),
});
export type TNovelCardDto = z.infer<typeof novelCardSchema>;
export const mapNovelCard = (dto: TNovelCardDto): IVisualNovelCard => ({
    id: dto.id,
    title: dto.title,
    released: dto.released ?? null,
    rating: dto.rating ?? null,
    image: dto.image ?? null,
});
