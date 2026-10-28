export function formatReleaseDate(value: string | null | undefined): string {
    if (!value || value === 'unknown') {
        return 'Release date unknown';
    }
    if (value === 'TBA') {
        return 'To be announced';
    }
    if (/^\d{4}$/.test(value)) {
        return value;
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
        return new Intl.DateTimeFormat('en', {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        }).format(new Date(`${value}-01T00:00:00Z`));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Intl.DateTimeFormat('en', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
        }).format(new Date(`${value}T00:00:00Z`));
    }
    return 'Release date unknown';
}

export function formatRating(value: number | null | undefined): string {
    return value == null ? 'Not rated' : (value / 10).toFixed(2);
}
