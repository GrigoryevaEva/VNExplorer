import { afterEach, expect, it, vi } from 'vitest';

import type { IReleaseDetails } from '@/entities/release';
import {
    isPlanned,
    newestReleases,
    releaseAgeLabel,
    releaseEditionLabels,
    releaseWebsites,
} from '@/entities/release';

const edition = (overrides: Partial<IReleaseDetails> = {}): IReleaseDetails => ({
    id: 'r1',
    title: 'Edition',
    released: null,
    minimumAge: null,
    official: false,
    platforms: [],
    externalLinks: [],
    patch: null,
    languages: [],
    novels: [],
    ...overrides,
});
afterEach(() => vi.useRealTimers());

it('keeps novel-specific edition kinds separate from per-language machine translation', () => {
    const release = edition({
        patch: true,
        languages: [
            { language: 'en', machineTranslated: true },
            { language: 'ru', machineTranslated: false },
        ],
        novels: [
            { id: 'v1', kind: 'trial' },
            { id: 'v2', kind: 'partial' },
        ],
    });
    expect(releaseEditionLabels(release, 'v1', 'en')).toEqual([
        'Demo',
        'Patch',
        'Machine translation',
    ]);
    expect(releaseEditionLabels(release, 'v2', 'ru')).toEqual(['Partial', 'Patch']);
    expect(releaseEditionLabels(release, 'v3', 'ru')).toEqual(['Patch']);
});

it('retains multiple distinct safe websites while dropping duplicate or executable destinations', () => {
    const first = { name: 'website', label: 'Official', url: 'https://example.org/a' };
    const second = { name: 'website', label: 'Mirror', url: 'http://example.org/b' };
    expect(
        releaseWebsites(
            edition({
                externalLinks: [
                    first,
                    second,
                    first,
                    { name: 'website', label: 'Unsafe', url: 'javascript:alert(1)' },
                    { name: 'vndb', label: 'Catalog', url: 'https://vndb.org/r1' },
                ],
            })
        )
    ).toEqual([first, second]);
});

it('preserves date ordering, planned status and honest unknown minimum age', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T00:00:00Z'));
    expect(
        newestReleases([
            edition({ id: 'r1' }),
            edition({ id: 'r2', released: '2020-03' }),
            edition({ id: 'r3', released: '2025' }),
        ]).map((release) => release.id)
    ).toEqual(['r3', 'r2', 'r1']);
    expect(isPlanned('TBA')).toBe(true);
    expect(isPlanned('2028')).toBe(true);
    expect(isPlanned(null)).toBe(false);
    expect(releaseAgeLabel(null)).toBe('Age unknown');
    expect(releaseAgeLabel(0)).toBe('All ages');
    expect(releaseAgeLabel(18)).toBe('18+');
});

it('sorts a release view without mutating the caller collection', () => {
    const original = [
        edition({ id: 'r11', released: '2000' }),
        edition({ id: 'r12', released: '2020' }),
    ];
    expect(newestReleases(original).map((release) => release.id)).toEqual(['r12', 'r11']);
    expect(original.map((release) => release.id)).toEqual(['r11', 'r12']);
});
