import { z } from 'zod';

import type { ISavedEntry } from '../model';
import { snapshotNovel } from '../model';
import { SAVED_STORAGE_KEY, SAVED_STORAGE_VERSION } from './constants';

const savedSnapshotSchema = z.looseObject({
    id: z.string().regex(/^v[1-9]\d*$/),
    title: z.string(),
    released: z.string().nullable().optional(),
    rating: z.number().finite().nullable().optional(),
    image: z
        .looseObject({
            url: z.string(),
            thumbnail: z.string().optional(),
            dims: z.tuple([z.number().finite(), z.number().finite()]).optional(),
        })
        .nullable()
        .optional(),
});
const savedCollectionSchema = z.looseObject({
    version: z.literal(SAVED_STORAGE_VERSION),
    entries: z.array(z.looseObject({ addedAt: z.number().finite(), novel: savedSnapshotSchema })),
});
type TReadResult = { ok: true; entries: ISavedEntry[] } | { ok: false };

export const readSavedCollection = (): TReadResult => {
    try {
        const raw = localStorage.getItem(SAVED_STORAGE_KEY);
        if (raw === null) {
            return { ok: true, entries: [] };
        }
        const parsed = savedCollectionSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
            return { ok: false };
        }
        const unique = new Map<string, ISavedEntry>();
        for (const entry of parsed.data.entries) {
            unique.set(entry.novel.id, {
                addedAt: entry.addedAt,
                novel: snapshotNovel({
                    ...entry.novel,
                    released: entry.novel.released ?? null,
                    rating: entry.novel.rating ?? null,
                    image: entry.novel.image ?? null,
                }),
            });
        }
        return { ok: true, entries: [...unique.values()] };
    } catch {
        return { ok: false };
    }
};

export const writeSavedCollection = (entries: ISavedEntry[]): boolean => {
    try {
        localStorage.setItem(
            SAVED_STORAGE_KEY,
            JSON.stringify({ version: SAVED_STORAGE_VERSION, entries })
        );
        return true;
    } catch {
        return false;
    }
};
