import { expect, test } from '@playwright/test';

import type { IVndbQuery } from '@/api/protocol';

const associationTags = [
    { id: 'g2', name: 'Fantasy', spoiler: 0 },
    { id: 'g96', name: 'Romance', spoiler: 1 },
    { id: 'g3', name: 'Violence', spoiler: 2 },
];

test('detail tags use the spoiler level of each novel association and sit before screenshots', async ({
    page,
}) => {
    const detailQueries: IVndbQuery[] = [];
    await page.route('https://api.vndb.org/kana/vn', (route) => {
        const query = route.request().postDataJSON();
        detailQueries.push(query);
        const id = query.filters[2];
        return route.fulfill({
            json: {
                results: [
                    {
                        id,
                        title: id === 'v17' ? 'First story' : 'Second story',
                        image: null,
                        tags: associationTags.map((tag) => {
                            if (id !== 'v18') {
                                return tag;
                            }
                            return { ...tag, spoiler: tag.id === 'g96' ? 0 : 2 };
                        }),
                    },
                ],
                more: false,
            },
        });
    });
    await page.route('https://api.vndb.org/kana/release', (route) =>
        route.fulfill({ json: { results: [], more: false } }));
    await page.goto('/vn/v17');
    const tags = page.getByRole('region', { name: 'Spoiler-free tags', exact: true });
    await expect(tags.getByRole('link', { name: 'Fantasy', exact: true })).toBeVisible();
    await expect(tags.getByRole('link', { name: 'Romance', exact: true })).toHaveCount(0);
    await expect(tags.getByRole('link', { name: 'Violence', exact: true })).toHaveCount(0);
    expect(detailQueries[0].fields).toContain('tags{id,name,spoiler}');
    const tagsBox = await tags.boundingBox();
    const screenshotsBox = await page
        .getByRole('heading', { name: 'Screenshots', exact: true })
        .boundingBox();
    expect(tagsBox!.y + tagsBox!.height).toBeLessThanOrEqual(screenshotsBox!.y);
    await page.goto('/vn/v18');
    await expect(tags.getByRole('link', { name: 'Romance', exact: true })).toBeVisible();
    await expect(tags.getByRole('link', { name: 'Fantasy', exact: true })).toHaveCount(0);
    await expect(tags.getByRole('button')).toHaveCount(0);
});

for (const mobile of [false, true]) {
    test.describe(mobile ? 'touch detail tag navigation' : 'keyboard detail tag navigation', () => {
        test.use(mobile ? { hasTouch: true, viewport: { width: 390, height: 844 } } : {});
        test('a displayed tag immediately replaces every prior Catalog condition with defaults', async ({
            page,
        }) => {
            const catalogQueries: IVndbQuery[] = [];
            await page.route('https://api.vndb.org/kana/vn', (route) => {
                const query = route.request().postDataJSON();
                const detail = query.fields.includes('description');
                if (!detail) {
                    catalogQueries.push(query);
                }
                return route.fulfill({
                    json: {
                        results: [
                            {
                                id: 'v17',
                                title: 'A fantasy story',
                                image: null,
                                tags: associationTags,
                            },
                        ],
                        more: false,
                        count: 72,
                    },
                });
            });
            await page.route('https://api.vndb.org/kana/release', (route) =>
                route.fulfill({ json: { results: [], more: false } }));
            await page.route('https://api.vndb.org/kana/tag', (route) =>
                route.fulfill({
                    json: {
                        results: associationTags.map((tag) => ({ ...tag, searchable: true })),
                        more: false,
                    },
                }));
            await page.goto(
                '/?q=Old+title&language=ru&tag=g96&exclude=g3&strict=0&sort=released&page=3'
            );
            await page.getByRole('link', { name: 'A fantasy story', exact: true }).click();
            const tag = page
                .getByRole('region', { name: 'Spoiler-free tags', exact: true })
                .getByRole('link', { name: 'Fantasy', exact: true });
            if (mobile) {
                await tag.tap();
            } else {
                await tag.focus();
                await page.keyboard.press('Enter');
            }
            await expect(page).toHaveURL(/\/\?tag=g2$/);
            await expect(
                page.getByRole('heading', { name: 'A fantasy story', exact: true })
            ).toBeVisible();
            expect(catalogQueries).toHaveLength(2);
            expect(catalogQueries.at(-1)).toMatchObject({
                filters: ['tag', '=', ['g2', 0, 0]],
                sort: 'rating',
                reverse: true,
                page: 1,
            });
            await expect(page.getByRole('searchbox', { name: 'Search titles' })).toHaveValue('');
            await expect(page.getByRole('combobox', { name: 'Sort stories' })).toHaveValue(
                'rating'
            );
            if (mobile) {
                await page.getByRole('button', { name: 'Filters', exact: true }).tap();
            }
            await expect(page.getByRole('radio', { name: 'All', exact: true })).toBeChecked();
            await expect(page.getByRole('checkbox', { name: 'Strict match' })).toBeChecked();
            await expect(
                page.getByRole('button', { name: 'Remove included tag Fantasy' })
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: 'Remove included tag Romance' })
            ).toHaveCount(0);
            await expect(
                page.getByRole('button', { name: 'Remove excluded tag Violence' })
            ).toHaveCount(0);
            if (mobile) {
                await page.keyboard.press('Escape');
            }
            await page.goBack();
            await expect(
                page.getByRole('heading', { name: 'A fantasy story', level: 1 })
            ).toBeVisible();
            await page.goBack();
            await expect(page).toHaveURL(
                /q=Old\+title&language=ru&tag=g96&exclude=g3&strict=0&sort=released&page=3$/
            );
        });
    });
}

test('no safe associations produce an honest empty state without a spoiler reveal action', async ({
    page,
}) => {
    await page.route('https://api.vndb.org/kana/vn', (route) =>
        route.fulfill({
            json: {
                results: [
                    {
                        id: 'v17',
                        title: 'Unclassified story',
                        image: null,
                        tags: [
                            ...associationTags.filter((tag) => tag.spoiler > 0),
                            { id: 'g9999', name: 'Unknown spoiler level' },
                        ],
                    },
                ],
                more: false,
            },
        }));
    await page.route('https://api.vndb.org/kana/release', (route) =>
        route.fulfill({ json: { results: [], more: false } }));
    await page.goto('/vn/v17');
    const tags = page.getByRole('region', { name: 'Spoiler-free tags', exact: true });
    await expect(tags.getByText('No spoiler-free tags listed.', { exact: true })).toBeVisible();
    await expect(tags.getByRole('link')).toHaveCount(0);
    await expect(tags.getByRole('button')).toHaveCount(0);
});
