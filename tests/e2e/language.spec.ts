import { expect, test } from '@playwright/test';

test('language is a draft until Apply, then combines published releases with submitted search and navigation', async ({
    page,
}) => {
    const queries: Record<string, unknown>[] = [];
    await page.route('https://api.vndb.org/kana/vn', async (route) => {
        const query = route.request().postDataJSON();
        queries.push(query);
        await route.fulfill({
            json: {
                results: [
                    {
                        id: 'v2016',
                        title: 'A published Russian demo',
                        released: '2009',
                        rating: 90,
                        image: null,
                    },
                ],
                more: true,
                count: 49,
            },
        });
    });
    await page.goto('/?q=story&page=2');
    await expect(page.getByRole('heading', { name: 'A published Russian demo' })).toBeVisible();
    await page.getByRole('radio', { name: 'Russian', exact: true }).check();
    await expect(page).toHaveURL(/q=story&page=2$/);
    expect(queries).toHaveLength(1);
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await expect(page).toHaveURL(/q=story&language=ru$/);
    await expect.poll(() => queries.length).toBe(2);
    expect(queries[1]?.filters).toEqual([
        'and',
        ['search', '=', 'story'],
        [
            'release',
            '=',
            [
                'and',
                ['lang', '=', 'ru'],
                ['released', '<=', 'today'],
                ['released', '!=', 'unknown'],
            ],
        ],
    ]);
    expect(queries[1]?.page).toBe(1);
    await page.getByRole('radio', { name: 'English', exact: true }).check();
    await page.getByRole('combobox', { name: 'Sort stories' }).selectOption('released');
    await expect.poll(() => queries.length).toBe(3);
    expect(JSON.stringify(queries[2]?.filters)).toContain('ru');
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect.poll(() => queries.length).toBe(4);
    expect(queries[3]?.page).toBe(2);
    expect(JSON.stringify(queries[3]?.filters)).toContain('ru');
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Russian', exact: true })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /machine/i })).toHaveCount(0);
});

test('mobile Filters accepts published full, partial, demo, unofficial and machine-translated releases without requiring aggregate languages', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requests: unknown[] = [];
    const published = [
        'Published full translation',
        'Published partial translation',
        'Published demo',
        'Unofficial translation',
        'Machine translation',
    ];
    await page.route('https://api.vndb.org/kana/vn', async (route) => {
        const query = route.request().postDataJSON();
        requests.push(query.filters);
        if (requests.length > 1) {
            expect(query.filters).toEqual([
                'release',
                '=',
                [
                    'and',
                    ['lang', '=', 'en'],
                    ['released', '<=', 'today'],
                    ['released', '!=', 'unknown'],
                ],
            ]);
        }
        // The source performs release matching and returns full VN cards; aggregate vn.languages
        // can omit demo/partial languages. Future-only and unknown-date translations do not qualify.
        const titles =
            requests.length === 1
                ? [...published, 'Future-only translation', 'Unknown publication date']
                : published;
        await route.fulfill({
            json: {
                results: titles.map((title, index) => ({
                    id: `v${index + 1}`,
                    title,
                    languages: ['ja'],
                    released: '2009',
                    rating: 80,
                    image: null,
                })),
                more: false,
                count: titles.length,
            },
        });
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Future-only translation' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'English', exact: true })).not.toBeVisible();
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Catalog filters' })).toBeVisible();
    await page.getByRole('radio', { name: 'English', exact: true }).check();
    await expect(page).toHaveURL(/\/$/);
    expect(requests).toHaveLength(1);
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page).toHaveURL(/language=en$/);
    for (const title of published) {
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Future-only translation' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Unknown publication date' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('radio', { name: 'All', exact: true }).check();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/language=en$/);
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(page.getByRole('radio', { name: 'All', exact: true })).toBeChecked();
});
