import { expect, it } from 'vitest';

import { formatRating } from '@/entities/visual-novel/model';
import { formatReleaseDate } from '@/shared/utils/dates';

it('keeps valid publication dates readable and treats invalid parsed dates as unknown', () => {
    expect(formatReleaseDate('2024-05')).toBe('May 2024');
    expect(formatReleaseDate('2003-12-26')).toBe('Dec 26, 2003');
    expect(formatReleaseDate('2020-13')).toBe('Release date unknown');
    expect(formatReleaseDate('2020-13-01')).toBe('Release date unknown');
});

it('formats VNDB scores on the ten-point scale and preserves unknown ratings', () => {
    expect(formatRating(87.56)).toBe('8.76');
    expect(formatRating(85)).toBe('8.50');
    expect(formatRating(0)).toBe('0.00');
    expect(formatRating(null)).toBe('Not rated');
    expect(formatRating(undefined)).toBe('Not rated');
});
