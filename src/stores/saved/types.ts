import type { IVisualNovelCard } from '@/entities/visual-novel';

import type { SAVED_SORTS } from './constants';

export interface ISavedEntry {
    addedAt: number;
    novel: IVisualNovelCard;
}
export type TSavedSort = (typeof SAVED_SORTS)[keyof typeof SAVED_SORTS];
