import { expect, test } from '@playwright/test';

for (const mobile of [false, true]) {
    test(`empty filtered title search explains the exact total and recovers without filters (${mobile ? 'phone' : 'desktop'})`, async ({
        page,
    }) => {
        if (mobile) {
            await page.setViewportSize({ width: 390, height: 844 });
        }
        await page.route('https://api.vndb.org/kana/tag', (route) =>
            route.fulfill({
                json: { results: [{ id: 'g4', name: 'Fantasy', description: '' }], more: false },
            }));
        const queries: Record<string, unknown>[] = [];
        await page.route('https://api.vndb.org/kana/vn', async (route) => {
            const query = route.request().postDataJSON();
            queries.push(query);
            const recovered =
                query.results !== 0 &&
                JSON.stringify(query.filters) === JSON.stringify(['search', '=', 'story']);
            await route.fulfill({
                json: {
                    results: recovered
                        ? [
                              {
                                  id: 'v1',
                                  title: 'Recovered story',
                                  released: '2009',
                                  rating: 80,
                                  image: null,
                              },
                          ]
                        : [],
                    more: recovered,
                    count: query.results === 0 || recovered ? 73 : 0,
                },
            });
        });
        await page.goto('/?q=story&language=ru&tag=g4&sort=released&page=3');
        await expect(
            page.getByText('73 matches hidden by filters.', { exact: true })
        ).toBeVisible();
        expect(queries).toHaveLength(2);
        expect(queries[1]).toMatchObject({
            filters: ['search', '=', 'story'],
            count: true,
            results: 0,
        });
        await page.getByRole('button', { name: 'Show without filters', exact: true }).click();
        await expect(page).toHaveURL(/\?q=story&sort=released$/);
        await expect(page.getByRole('heading', { name: 'Recovered story' })).toBeVisible();
        await expect(page.getByRole('searchbox', { name: 'Search titles' })).toHaveValue('story');
        if (mobile) {
            await page.getByRole('button', { name: 'Filters', exact: true }).click();
        }
        await expect(page.getByRole('radio', { name: 'All', exact: true })).toBeChecked();
        await expect(page.getByRole('button', { name: /Remove included tag/ })).toHaveCount(0);
        expect(queries).toHaveLength(3);
    });
}

for (const mobile of [false, true]) {
    test(`failed diagnostic count is retriable, never a missing title (${mobile ? 'phone' : 'desktop'})`, async ({
        page,
    }) => {
        if (mobile) {
            await page.setViewportSize({ width: 390, height: 844 });
        }
        let failCount = true;
        await page.route('https://api.vndb.org/kana/vn', async (route) => {
            const query = route.request().postDataJSON();
            if (query.results === 0 && failCount) {
                await route.fulfill({ status: 503, json: { error: 'Unavailable' } });
            } else {
                await route.fulfill({
                    json: { results: [], count: query.results === 0 ? 42 : 0, more: false },
                });
            }
        });
        await page.goto('/?q=story&language=en');
        await expect(page.getByRole('alert')).toContainText('Could not check title matches.');
        await expect(page.getByText('No stories here yet.')).toHaveCount(0);
        failCount = false;
        await page.getByRole('button', { name: /Try again/ }).click();
        await expect(
            page.getByText('42 matches hidden by filters.', { exact: true })
        ).toBeVisible();
    });
}

for (const mobile of [false, true]) {
    test(`a true zero title count stays empty (${mobile ? 'phone' : 'desktop'})`, async ({
        page,
    }) => {
        if (mobile) {
            await page.setViewportSize({ width: 390, height: 844 });
        }
        const queries: Record<string, unknown>[] = [];
        await page.route('https://api.vndb.org/kana/vn', async (route) => {
            queries.push(route.request().postDataJSON());
            await route.fulfill({ json: { results: [], more: false, count: 0 } });
        });
        await page.goto('/?q=absent&language=ru');
        await expect(page.getByText('No stories here yet.', { exact: true })).toBeVisible();
        expect(queries).toHaveLength(2);
        await expect(page.getByRole('button', { name: 'Show without filters' })).toHaveCount(0);
    });
}

for (const scenario of [
    { url: '/?q=story&language=ru', title: 'Visible story' },
    { url: '/?language=ru', title: '' },
    { url: '/?q=absent', title: '' },
]) {
    test(`no diagnostic request for ${scenario.url} with ${scenario.title || 'empty results'}`, async ({
        page,
    }) => {
        let requests = 0;
        await page.route('https://api.vndb.org/kana/vn', async (route) => {
            requests++;
            await route.fulfill({
                json: {
                    results: scenario.title
                        ? [
                              {
                                  id: 'v1',
                                  title: scenario.title,
                                  released: null,
                                  rating: null,
                                  image: null,
                              },
                          ]
                        : [],
                    more: false,
                    count: scenario.title ? 1 : 0,
                },
            });
        });
        await page.goto(scenario.url);
        await expect(
            page.getByRole('heading', { name: scenario.title || 'No stories here yet.' })
        ).toBeVisible();
        expect(requests).toBe(1);
    });
}

test('missing diagnostic count is retriable and never treated as zero', async ({ page }) => {
    await page.route('https://api.vndb.org/kana/vn', async (route) => {
        await route.fulfill({ json: { results: [], more: false } });
    });
    await page.goto('/?q=story&language=en');
    await expect(page.getByRole('alert')).toContainText('Could not check title matches.');
    await expect(page.getByRole('button', { name: /Try again/ })).toBeVisible();
    await expect(page.getByText('No stories here yet.')).toHaveCount(0);
});

test('failed initial request offers retry before checking title matches', async ({ page }) => {
    let failed = true;
    const queries: Record<string, unknown>[] = [];
    await page.route('https://api.vndb.org/kana/vn', async (route) => {
        const query = route.request().postDataJSON();
        queries.push(query);
        if (failed) {
            await route.fulfill({ status: 503, json: { error: 'Unavailable' } });
        } else {
            await route.fulfill({
                json: { results: [], more: false, count: query.results === 0 ? 9 : 0 },
            });
        }
    });
    await page.goto('/?q=story&language=en');
    await expect(page.getByRole('alert')).toBeVisible();
    expect(queries).toHaveLength(1);
    failed = false;
    await page.getByRole('button', { name: /Try again/ }).click();
    await expect(page.getByText('9 matches hidden by filters.', { exact: true })).toBeVisible();
});
