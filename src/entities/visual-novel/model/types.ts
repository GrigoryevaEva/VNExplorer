export interface INovelImage {
    url: string;
    thumbnail?: string;
    dims?: readonly [number, number];
}

export interface IVisualNovelCard {
    id: string;
    title: string;
    released: string | null;
    rating: number | null;
    image: INovelImage | null;
}

export interface INovelScreenshot {
    id: string;
    url: string;
    thumbnail: string;
    dims: readonly [number, number];
    thumbnailDimensions: readonly [number, number];
}

export interface INovelTitle {
    language: string;
    title: string;
    romanized: string | null;
    main: boolean;
    official: boolean;
}

export interface INovelTag {
    id: string;
    name: string;
    spoilerLevel: number | null;
}

export interface IVisualNovelDetails extends IVisualNovelCard {
    tags: readonly INovelTag[];
    screenshots: readonly INovelScreenshot[];
    titles: readonly INovelTitle[];
    aliases: readonly string[];
    description: string | null;
    voteCount: number | null;
    lengthCategory: number | null;
    playTimeMinutes: number | null;
}
