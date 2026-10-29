import { expect, it } from 'vitest';

import { formatReleaseDate } from '@/shared/utils/dates';

it('keeps valid publication dates readable and treats invalid parsed dates as unknown', () => {
    expect(formatReleaseDate('2024-05')).toBe('May 2024');
    expect(formatReleaseDate('2003-12-26')).toBe('Dec 26, 2003');
    expect(formatReleaseDate('2020-13')).toBe('Release date unknown');
    expect(formatReleaseDate('2020-13-01')).toBe('Release date unknown');
});
