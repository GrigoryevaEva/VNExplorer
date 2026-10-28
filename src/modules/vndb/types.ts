export interface VndbImage {
    url: string;
    thumbnail?: string;
    dims?: [number, number];
}

export interface VisualNovelCard {
    id: string;
    title: string;
    released: string | null;
    rating: number | null;
    image: VndbImage | null;
}

export type { IVndbQuery as VndbQuery, IVndbResponse as VndbResponse } from '@/api/protocol';
