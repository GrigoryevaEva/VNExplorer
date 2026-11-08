import { z } from 'zod';

import type { IReleaseDetails } from '@/entities/release/model';

export const releaseDetailsSchema = z.looseObject({
    id: z.string().regex(/^r[1-9]\d*$/),
    title: z.string(),
    released: z.string().nullable().optional(),
    minage: z.number().int().nonnegative().nullable().optional(),
    official: z.boolean(),
    platforms: z.array(z.string()).optional(),
    extlinks: z
        .array(z.looseObject({ name: z.string(), label: z.string(), url: z.string() }))
        .optional(),
    patch: z.boolean().nullable().optional(),
    languages: z
        .array(z.looseObject({ lang: z.string(), mtl: z.boolean().nullable().optional() }))
        .optional(),
    vns: z
        .array(z.looseObject({ id: z.string().regex(/^v[1-9]\d*$/), rtype: z.string() }))
        .optional(),
});
type TReleaseDetailsDto = z.infer<typeof releaseDetailsSchema>;
export const mapReleaseDetails = (dto: TReleaseDetailsDto): IReleaseDetails => ({
    id: dto.id,
    title: dto.title,
    released: dto.released ?? null,
    minimumAge: dto.minage ?? null,
    official: dto.official,
    platforms: dto.platforms ?? [],
    externalLinks: dto.extlinks ?? [],
    patch: dto.patch ?? null,
    languages: (dto.languages ?? []).map((language) => ({
        language: language.lang,
        machineTranslated: language.mtl ?? null,
    })),
    novels: (dto.vns ?? []).map((novel) => ({ id: novel.id, kind: novel.rtype })),
});
