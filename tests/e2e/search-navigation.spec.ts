import { expect, test } from '@playwright/test';

test('submitted alternative title search, sorting and numbered pages preserve applied selection', async ({
    page,
}) => {
    const requests: any[] = [];
    await page.route('https://api.vndb.org/kana/vn', async (route) => {
        const query = route.request().postDataJSON();
        requests.push(query);
        const title = query.filters.length ? 'Steins;Gate' : 'Top story';
        await route.fulfill({
            json: {
                results: [
                    {
                        id: 'v2002',
                        title: `${title} page ${query.page}`,
                        released: '2009-10-15',
                        rating: 90,
                        image: null,
                    },
                ],
                count: 61,
                more: query.page < 3,
            },
        });
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Top story page 1' })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search titles' }).fill('シュタインズ・ゲート');
    await expect(page).toHaveURL(/\/$/);
    expect(requests).toHaveLength(1);
    await page.getByRole('searchbox', { name: 'Search titles' }).press('Enter');
    await expect(page.getByRole('heading', { name: 'Steins;Gate page 1' })).toBeVisible();
    expect(requests.at(-1).filters).toEqual(['search', '=', 'シュタインズ・ゲート']);
    await expect(page).toHaveURL(/q=/);
    await page.getByRole('searchbox', { name: 'Search titles' }).fill('unsubmitted draft');
    await page.getByRole('combobox', { name: 'Sort stories' }).selectOption('released');
    await expect.poll(() => requests.at(-1).sort).toBe('released');
    await expect(page.getByRole('searchbox')).toHaveValue('unsubmitted draft');
    expect(requests.at(-1).filters).toEqual(['search', '=', 'シュタインズ・ゲート']);
    await page.getByRole('button', { name: 'Page 2', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Steins;Gate page 2' })).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText('61 stories', { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Steins;Gate page 2' })).toBeVisible();
    await expect(page.getByRole('searchbox')).toHaveValue('シュタインズ・ゲート');
});

test('history restores grid position while a new page starts at the top', async ({ page }) => {
    await page.route('https://api.vndb.org/kana/vn', (route) => {
        const query = route.request().postDataJSON();
        return route.fulfill({
            json: {
                results: Array.from({ length: 24 }, (_, index) => ({
                    id: `v${index + 1}`,
                    title: `Page ${query.page} story ${index + 1}`,
                    released: '2020',
                    rating: 80,
                    image: null,
                })),
                more: query.page < 3,
                count: 61,
            },
        });
    });
    await page.goto('/');
    const grid = page.getByRole('region', { name: 'Catalog results' });
    await expect(page.getByRole('heading', { name: 'Page 1 story 1', exact: true })).toBeVisible();
    await grid.evaluate((element) => {
        element.scrollTop = 500;
    });
    await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBe(500);
    await page.getByRole('button', { name: 'Page 2', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Page 2 story 1', exact: true })).toBeVisible();
    await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBe(0);
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Page 1 story 1', exact: true })).toHaveCount(1);
    await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBe(500);
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Page 2 story 1', exact: true })).toBeVisible();
    await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBe(0);
});

test('latest selection wins when earlier responses arrive late and errors differ from no matches', async ({
    page,
}) => {
    let finishOld: (() => void) | undefined;
    const oldGate = new Promise<void>((resolve) => {
        finishOld = resolve;
    });
    await page.route('https://api.vndb.org/kana/vn', async (route) => {
        const query = route.request().postDataJSON();
        const search = query.filters[2];
        if (search === 'old') {
            await oldGate;
        }
        if (search === 'failure') {
            return route.fulfill({ status: 503, json: {} });
        }
        await route.fulfill({
            json: {
                results:
                    search === 'missing'
                        ? []
                        : [
                              {
                                  id: 'v1',
                                  title: search || 'Initial story',
                                  released: '2020',
                                  rating: 80,
                                  image: null,
                              },
                          ],
                more: false,
                count: search === 'missing' ? 0 : 1,
            },
        });
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Initial story' })).toBeVisible();
    const search = page.getByRole('searchbox');
    await search.fill('old');
    await search.press('Enter');
    await expect(page.getByRole('status')).toBeVisible();
    await search.fill('new');
    await page.getByRole('button', { name: 'Search', exact: false }).click();
    await expect(page.getByRole('heading', { name: 'new', exact: true })).toBeVisible();
    finishOld?.();
    await expect(page.getByRole('heading', { name: 'new', exact: true })).toBeVisible();
    await search.fill('missing');
    await search.press('Enter');
    await expect(page.getByRole('heading', { name: 'No stories here yet.' })).toBeVisible();
    await expect(page.getByText('0 stories', { exact: true })).toBeVisible();
    await search.fill('failure');
    await search.press('Enter');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No stories here yet.' })).toHaveCount(0);
});

test('mobile search and pagination stay reachable while the grid scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.route('https://api.vndb.org/kana/vn', (route) =>
        route.fulfill({
            json: {
                results: Array.from({ length: 24 }, (_, index) => ({
                    id: `v${index + 1}`,
                    title: `Mobile story ${index + 1}`,
                    released: '2020',
                    rating: 80,
                    image: null,
                })),
                more: true,
                count: 2400,
            },
        }));
    await page.goto('/?page=50');
    await expect(page.getByRole('heading', { name: 'Mobile story 1', exact: true })).toBeVisible();
    const search = page.getByRole('searchbox');
    const next = page.getByRole('button', { name: 'Next page' });
    await expect(search).toBeInViewport();
    await expect(next).toBeInViewport();
    await page.getByRole('region', { name: 'Catalog results' }).evaluate((element) => {
        element.scrollTop = 500;
    });
    await expect(search).toBeInViewport();
    await expect(next).toBeInViewport();
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await page.screenshot({ path: 'test-results/ticket02-mobile.png' });
});
