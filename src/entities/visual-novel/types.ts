export interface INovelImage {
    url: string;
    thumbnail?: string;
    dims?: [number, number];
}

export interface IVisualNovelCard {
    id: string;
    title: string;
    released: string | null;
    rating: number | null;
    image: INovelImage | null;
}
