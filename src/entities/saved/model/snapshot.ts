import type { IVisualNovelCard } from '@/entities/visual-novel/model';

export const snapshotNovel = (novel: Readonly<IVisualNovelCard>): IVisualNovelCard => ({
    id: novel.id,
    title: novel.title,
    released: novel.released ?? null,
    rating: novel.rating ?? null,
    image: novel.image
        ? {
              url: novel.image.url,
              ...(novel.image.thumbnail !== undefined ? { thumbnail: novel.image.thumbnail } : {}),
              ...(novel.image.dims ? { dims: [novel.image.dims[0], novel.image.dims[1]] } : {}),
          }
        : null,
});
