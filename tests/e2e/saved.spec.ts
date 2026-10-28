import { expect, test } from '@playwright/test';

const novels = [
    { id: 'v1', title: 'Amber Story', released: '2001-01-01', rating: 95, image: null },
    { id: 'v2', title: 'Blue Story', released: '2020-01-01', rating: 70, image: null },
    { id: 'v3', title: 'Crimson Story', released: null, rating: null, image: null },
];

test.beforeEach(async ({ page }) => {
    await page.route('https://api.vndb.org/kana/vn', (route) => {
        const body = route.request().postDataJSON();
        const results = body.fields.includes('description')
            ? novels.filter((novel) => novel.id === body.filters[2])
            : novels;
        return route.fulfill({ json: { results, more: false, count: results.length } });
    });
    await page.route('https://api.vndb.org/kana/release', (route) =>
        route.fulfill({ json: { results: [], more: false } }));
});

test('save stays synchronized across cards, details and reload without opening a card', async ({
    page,
}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Save Amber Story', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('link', { name: 'Amber Story', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Saved Amber Story', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(
        page.getByRole('button', { name: 'Saved Amber Story', exact: true })
    ).toBeVisible();
    await page.getByRole('link', { name: 'Saved', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Amber Story' })).toBeVisible();
    await page.getByRole('button', { name: 'Saved Amber Story', exact: true }).click();
    await expect(page.getByText('Your collection starts here.')).toBeVisible();
});

test('Saved searches and sorts locally while preserving added order after reload', async ({
    page,
}) => {
    const requests: unknown[] = [];
    page.on('request', (request) => {
        if (request.url().startsWith('https://api.vndb.org/')) {
            requests.push(request.url());
        }
    });
    await page.goto('/');
    for (const novel of novels) {
        await page.getByRole('button', { name: `Save ${novel.title}`, exact: true }).click();
    }
    await page.getByRole('link', { name: 'Saved', exact: true }).click();
    const titles = page
        .getByRole('region', { name: 'Saved results' })
        .getByRole('heading', { level: 2 });
    await expect(titles).toHaveText(['Crimson Story', 'Blue Story', 'Amber Story']);
    await expect(page.getByLabel('Sort saved stories')).toHaveValue('added');
    await page.reload();
    await expect(titles).toHaveText(['Crimson Story', 'Blue Story', 'Amber Story']);
    await page.getByLabel('Sort saved stories').selectOption('rating');
    await expect(titles).toHaveText(['Amber Story', 'Blue Story', 'Crimson Story']);
    await page.getByLabel('Sort saved stories').selectOption('released');
    await expect(titles).toHaveText(['Blue Story', 'Amber Story', 'Crimson Story']);
    const before = requests.length;
    await page.getByRole('searchbox', { name: 'Search Saved' }).fill('amber');
    await expect(titles).toHaveText(['Amber Story']);
    await page.getByRole('searchbox', { name: 'Search Saved' }).fill('not present');
    await expect(page.getByText('No saved stories match.')).toBeVisible();
    expect(requests.length).toBe(before);
});

test('removal offers Undo with the original addition order and survives reload', async ({
    page,
}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Save Amber Story', exact: true }).click();
    await page.getByRole('button', { name: 'Save Blue Story', exact: true }).click();
    await page.getByRole('link', { name: 'Saved', exact: true }).click();
    await page.getByRole('button', { name: 'Saved Amber Story', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Removed Amber Story');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(
        page.getByRole('region', { name: 'Saved results' }).getByRole('heading', { level: 2 })
    ).toHaveText(['Blue Story', 'Amber Story']);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Amber Story' })).toBeVisible();
});

test('storage failure leaves Save truthful and does not lose an existing collection', async ({
    page,
}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Save Amber Story', exact: true }).click();
    await page.evaluate(() => {
        Storage.prototype.setItem = () => {
            throw new DOMException('Full', 'QuotaExceededError');
        };
    });
    await page.getByRole('button', { name: 'Save Blue Story', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Your change was not saved');
    await expect(
        page.getByRole('button', { name: 'Save Blue Story', exact: true })
    ).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Saved Amber Story', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Saved Amber Story', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await page.getByRole('link', { name: 'Saved', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Amber Story' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Blue Story' })).toHaveCount(0);
});

test('Saved refreshes snapshots in a batch and reuses fresh data during an outage', async ({
    page,
}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Save Amber Story', exact: true }).click();
    await page.getByRole('button', { name: 'Save Blue Story', exact: true }).click();
    const batches: any[] = [];
    await page.route('https://api.vndb.org/kana/vn', (route) => {
        batches.push(route.request().postDataJSON());
        return route.fulfill({
            json: {
                results: novels.slice(0, 2).map((novel) => ({ ...novel, rating: 88 })),
                more: false,
            },
        });
    });
    await page.getByRole('link', { name: 'Saved', exact: true }).click();
    await expect(page.locator('.novel-card__rating').filter({ hasText: '8.80' })).toHaveCount(2);
    expect(batches).toHaveLength(1);
    expect(batches[0].filters).toEqual(['or', ['id', '=', 'v1'], ['id', '=', 'v2']]);
    let failedRequests = 0;
    await page.route('https://api.vndb.org/kana/vn', (route) => {
        failedRequests++;
        return route.fulfill({ status: 503, json: { error: 'outage' } });
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Amber Story' })).toBeVisible();
    await expect(page.locator('.novel-card__rating').filter({ hasText: '8.80' })).toHaveCount(2);
    await expect(page.getByText('Showing saved details while checking VNDB…')).toHaveCount(0);
    expect(failedRequests).toBe(0);
});

test('mobile Saved uses the shared cards and keeps all controls reachable', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Save Amber Story', exact: true }).click();
    await page.getByRole('link', { name: 'Saved', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Amber Story' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search Saved' })).toBeInViewport();
    await expect(page.getByLabel('Sort saved stories')).toBeInViewport();
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await page.getByRole('button', { name: 'Saved Amber Story', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Amber Story' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('searchbox', { name: 'Search Saved' })).toBeInViewport();
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
});

test('unreadable Saved stays untouched instead of being replaced by the next save', async ({
    page,
}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Save Amber Story', exact: true }).click();
    const key = await page.evaluate(() =>
        Object.keys(localStorage).find((key) => key.includes('saved'))!);
    await page.evaluate((key) => localStorage.setItem(key, '{broken record'), key);
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('Could not read Saved');
    await page.getByRole('button', { name: 'Save Blue Story', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Save Blue Story', exact: true })
    ).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('{broken record');
});

test('Undo expires and unknown release dates sort after known publication dates', async ({
    page,
}) => {
    await page.clock.install();
    await page.route('https://api.vndb.org/kana/vn', (route) =>
        route.fulfill({
            json: {
                results: novels.map((novel) => ({
                    ...novel,
                    released: novel.id === 'v3' ? 'TBA' : novel.released,
                })),
                more: false,
                count: 3,
            },
        }));
    await page.goto('/');
    for (const novel of novels) {
        await page.getByRole('button', { name: `Save ${novel.title}`, exact: true }).click();
    }
    await page.getByRole('link', { name: 'Saved', exact: true }).click();
    await page.getByLabel('Sort saved stories').selectOption('released');
    await expect(
        page.getByRole('region', { name: 'Saved results' }).getByRole('heading', { level: 2 })
    ).toHaveText(['Blue Story', 'Amber Story', 'Crimson Story']);
    await page.getByRole('button', { name: 'Saved Amber Story', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
    await page.clock.fastForward(8001);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
});
