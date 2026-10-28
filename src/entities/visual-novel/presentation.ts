import {
    LENGTH_CATEGORY_LABELS,
    MINUTES_PER_HOUR,
    PLAY_TIME_LESS_THAN_HOUR,
    PLAY_TIME_UNKNOWN,
    PRESENTATION_LOCALE,
    PRESENTATION_TIME_ZONE,
    RATING_SCALE,
    RATING_UNKNOWN,
    RELEASE_DATE_MARKERS,
    RELEASE_DATE_PLANNED,
    RELEASE_DATE_UNKNOWN,
    SPOILER_FREE_LEVEL,
} from './constants';
import type { INovelTag, IVisualNovelDetails } from './types';
export const formatReleaseDate = (value: string | null | undefined): string => {
    if (!value || value === RELEASE_DATE_MARKERS.UNKNOWN) {
        return RELEASE_DATE_UNKNOWN;
    }
    if (value === RELEASE_DATE_MARKERS.PLANNED) {
        return RELEASE_DATE_PLANNED;
    }
    if (/^\d{4}$/.test(value)) {
        return value;
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
        const date = new Date(`${value}-01T00:00:00Z`);
        if (!Number.isFinite(date.getTime())) {
            return RELEASE_DATE_UNKNOWN;
        }
        return new Intl.DateTimeFormat(PRESENTATION_LOCALE, {
            month: 'short',
            year: 'numeric',
            timeZone: PRESENTATION_TIME_ZONE,
        }).format(date);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(`${value}T00:00:00Z`);
        if (!Number.isFinite(date.getTime())) {
            return RELEASE_DATE_UNKNOWN;
        }
        return new Intl.DateTimeFormat(PRESENTATION_LOCALE, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: PRESENTATION_TIME_ZONE,
        }).format(date);
    }
    return RELEASE_DATE_UNKNOWN;
};

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
