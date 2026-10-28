import { expect, type Page, test } from '@playwright/test';

const screenshots = [1, 2, 3].map((index) => ({
    id: `sf${index}`,
    url: `https://images.example/full-${index}.svg`,
    thumbnail: `https://images.example/thumb-${index}.svg`,
    dims: [1600, 900],
    thumbnail_dims: [256, 144],
}));
async function gallery(page: Page, images = screenshots, brokenImage = false) {
    await page.route('https://images.example/**', (route) => {
        if (brokenImage && route.request().url().endsWith('-2.svg')) return route.abort();
        return route.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#c2dfd0"/></svg>',
        });
    });
    await page.route('https://api.vndb.org/kana/vn', (route) => {
        expect(route.request().postDataJSON().fields).toContain('screenshots{');
        return route.fulfill({
            json: {
                results: [
                    {
                        id: 'v17',
                        title: 'Gallery story',
                        image: null,
                        titles: [],
                        aliases: ['Another title'],
                        description: 'The story.\n\n'.repeat(50),
                        screenshots: images,
                    },
                ],
                more: false,
            },
        });
    });
    await page.goto('/vn/v17');
}

test('reader opens thumbnails after alternative titles and views complete screenshots with controls', async ({
    page,
}) => {
    await gallery(page);
    const thumbnail = page.getByRole('button', { name: 'Open screenshot 2', exact: true });
    await thumbnail.scrollIntoViewIfNeeded();
    expect(
        (await page.getByRole('heading', { name: 'Screenshots' }).boundingBox())!.y
    ).toBeGreaterThan((await page.getByText('Another title', { exact: true }).boundingBox())!.y);
    await thumbnail.click();
    const viewer = page.getByRole('dialog', { name: 'Screenshot viewer' });
    await expect(viewer).toBeVisible();
    const image = viewer.getByRole('img', { name: 'Screenshot 2 of 3', exact: true });
    await expect(image).toHaveAttribute('src', screenshots[1]!.url);
    await expect(image).toHaveCSS('object-fit', 'contain');
    await expect(image).toHaveCSS('filter', 'none');
    await viewer.getByRole('button', { name: 'Next screenshot' }).click();
    await expect(viewer.getByRole('img', { name: 'Screenshot 3 of 3', exact: true })).toBeVisible();
    await viewer.getByRole('button', { name: 'Previous screenshot' }).click();
    await expect(image).toBeVisible();
    await viewer.getByRole('button', { name: 'Close viewer' }).click();
    await expect(viewer).not.toBeVisible();
});

test('keyboard browsing traps focus and Escape restores the thumbnail and page position', async ({
    page,
}) => {
    await gallery(page);
    const thumbnail = page.getByRole('button', { name: 'Open screenshot 1', exact: true });
    await thumbnail.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => window.scrollY);
    await thumbnail.click();
    const viewer = page.getByRole('dialog', { name: 'Screenshot viewer' });
    await expect(viewer.getByRole('button', { name: 'Close viewer' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(viewer.getByRole('img', { name: 'Screenshot 2 of 3', exact: true })).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(viewer.getByRole('img', { name: 'Screenshot 1 of 3', exact: true })).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    await expect(viewer.getByRole('button', { name: 'Next screenshot' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(viewer.getByRole('button', { name: 'Close viewer' })).toBeFocused();
    await page.mouse.wheel(0, -1500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scroll);
    await page.keyboard.press('Escape');
    await expect(viewer).not.toBeVisible();
    await expect(thumbnail).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
});

test('empty gallery has a clear state without opening an empty viewer', async ({ page }) => {
    await gallery(page, []);
    await expect(page.getByText('No screenshots available.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Open screenshot/ })).toHaveCount(0);
});

test('a failed thumbnail and full image leave the remaining gallery usable', async ({ page }) => {
    await gallery(page, screenshots, true);
    const thumbnail = page.getByRole('button', { name: 'Open screenshot 2', exact: true });
    await thumbnail.scrollIntoViewIfNeeded();
    await expect(thumbnail).toContainText('Screenshot unavailable');
    await thumbnail.click();
    const viewer = page.getByRole('dialog', { name: 'Screenshot viewer' });
    await expect(viewer.getByText('Screenshot unavailable')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(viewer.getByRole('img', { name: 'Screenshot 3 of 3', exact: true })).toBeVisible();
    await viewer.getByRole('button', { name: 'Close viewer' }).click();
    await expect(thumbnail).toBeFocused();
});

test('phone viewer keeps loading feedback, complete artwork and controls within reach', async ({
    page,
}) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await gallery(page, [screenshots[0]!]);
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('https://images.example/full-1.svg', async (route) => {
        await wait;
        await route.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600"><rect width="900" height="1600" fill="#eabbd5"/></svg>',
        });
    });
    const thumbnail = page.getByRole('button', { name: 'Open screenshot 1', exact: true });
    await thumbnail.click();
    const viewer = page.getByRole('dialog', { name: 'Screenshot viewer' });
    await expect(viewer.getByRole('status')).toHaveText('Loading screenshot…');
    release();
    await expect(viewer.getByRole('status')).toHaveCount(0);
    const image = viewer.getByRole('img', { name: 'Screenshot 1 of 1' });
    await expect(image).toHaveCSS('object-fit', 'contain');
    await expect(viewer.getByRole('button', { name: 'Previous screenshot' })).toBeDisabled();
    await expect(viewer.getByRole('button', { name: 'Next screenshot' })).toBeDisabled();
    for (const element of [viewer, image, viewer.getByRole('button', { name: 'Close viewer' })]) {
        const box = (await element.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(320);
        expect(box.y + box.height).toBeLessThanOrEqual(568);
    }
    await page.screenshot({ path: 'test-results/gallery-mobile.png' });
    await viewer.getByRole('button', { name: 'Close viewer' }).click();
    await expect(thumbnail).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
    );
});
