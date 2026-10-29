import {
    PRESENTATION_LOCALE,
    PRESENTATION_TIME_ZONE,
    RELEASE_DATE_MARKERS,
    RELEASE_DATE_PLANNED,
    RELEASE_DATE_UNKNOWN,
} from './constants';

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
