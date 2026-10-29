import {
    LENGTH_CATEGORY_LABELS,
    MINUTES_PER_HOUR,
    PLAY_TIME_LESS_THAN_HOUR,
    PLAY_TIME_UNKNOWN,
    RATING_SCALE,
    RATING_UNKNOWN,
    SPOILER_FREE_LEVEL,
} from './constants';
import type { INovelTag, IVisualNovelDetails } from './types';
export const formatRating = (value: number | null | undefined): string => {
    return value == null ? RATING_UNKNOWN : (value / RATING_SCALE).toFixed(2);
};

export const spoilerFreeTags = (novel: IVisualNovelDetails): INovelTag[] =>
    novel.tags.filter((tag) => tag.spoilerLevel === SPOILER_FREE_LEVEL);

export const alternativeTitles = (novel: IVisualNovelDetails): string[] =>
    [
        ...new Set([
            ...novel.titles.flatMap((title) => [title.title, title.romanized]),
            ...novel.aliases,
        ]),
    ].filter((title): title is string => !!title && title !== novel.title);

export const formatPlayTime = (novel: IVisualNovelDetails): string => {
    if (novel.playTimeMinutes !== null && novel.playTimeMinutes > 0) {
        if (novel.playTimeMinutes < MINUTES_PER_HOUR) {
            return PLAY_TIME_LESS_THAN_HOUR;
        }
        const hours = Math.round(novel.playTimeMinutes / MINUTES_PER_HOUR);
        return `About ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return LENGTH_CATEGORY_LABELS[novel.lengthCategory ?? 0] ?? PLAY_TIME_UNKNOWN;
};
