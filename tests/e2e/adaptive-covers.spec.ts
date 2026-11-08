import { expect, test } from '@playwright/test';

test('complete Catalog heading fits on one line on phone and tablet', async ({
    page,
}, testInfo) => {
    await page.route('https://api.vndb.org/kana/vn', (route) =>
        route.fulfill({ json: { results: [], more: false } }));
    await page.goto('/');
    for (const width of [320, 390, 768, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        const heading = page.getByRole('heading', { name: 'Find your next story.', exact: true });
        await expect(heading).toBeVisible();
        const layout = await heading.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return {
                lines: new Set([...range.getClientRects()].map((rect) => Math.round(rect.y))).size,
                textWidth: range.getBoundingClientRect().width,
                available: element.clientWidth,
                right: element.getBoundingClientRect().right,
                overflow: getComputedStyle(element).textOverflow,
            };
        });
        expect(layout.lines, `heading lines at ${width}px`).toBe(1);
        expect(layout.textWidth).toBeLessThanOrEqual(layout.available + 1);
        expect(layout.right).toBeLessThanOrEqual(width);
        expect(layout.overflow).not.toBe('ellipsis');
        if (width === 320) {
            await page.screenshot({ path: testInfo.outputPath('heading-320.png') });
        }
    }
});

test('covers fill their cards while landscape art stays short and cards pack in source order', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.route('https://covers.example.test/**', (route) => {
        const portrait = route.request().url().includes('portrait');
        return route.fulfill({
            contentType: 'image/svg+xml',
            body: `<svg xmlns="http://www.w3.org/2000/svg" width="${portrait ? 100 : 400}" height="${portrait ? 300 : 200}"><rect width="100%" height="100%" fill="${portrait ? '#eabbd5' : '#c2dfd0'}"/></svg>`,
        });
    });
    await page.route('https://api.vndb.org/kana/vn', (route) =>
        route.fulfill({
            json: {
                results: Array.from({ length: 6 }, (_, index) => ({
                    id: `v${index + 1}`,
                    title: `Story ${index + 1}`,
                    released: '2020',
                    rating: 90 - index,
                    image: {
                        url: `https://covers.example.test/${index % 2 ? 'portrait' : 'landscape'}.svg`,
                        dims: index % 2 ? [100, 300] : [400, 200],
                    },
                })),
                more: false,
            },
        }));
    await page.goto('/');
    const images = page.getByRole('img', { name: /Story \d cover/ });
    await expect(images).toHaveCount(6);
    const landscape = await images.nth(0).boundingBox();
    const portrait = await images.nth(1).boundingBox();
    expect(landscape!.height / landscape!.width).toBeCloseTo(0.5, 2);
    expect(portrait!.height / portrait!.width).toBeCloseTo(1.25, 2);
    for (const image of await images.all()) {
        expect(await image.evaluate((element) => getComputedStyle(element).objectFit)).toBe(
            'cover'
        );
        const bounds = await image.boundingBox();
        const card = await image.locator('xpath=ancestor::article').boundingBox();
        expect(bounds!.x).toBe(card!.x);
        expect(bounds!.y).toBe(card!.y);
        expect(bounds!.width).toBe(card!.width);
    }
    const cards = page.getByRole('article');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    const third = await cards.nth(2).boundingBox();
    expect(first!.y).toBe(second!.y);
    expect(third!.y).toBeLessThan(second!.y + second!.height);
    expect(third!.y - first!.y - first!.height).toBeGreaterThanOrEqual(16);
    expect(third!.y - first!.y - first!.height).toBeLessThan(25);
    await expect(cards.getByRole('heading')).toHaveText([
        'Story 1',
        'Story 2',
        'Story 3',
        'Story 4',
        'Story 5',
        'Story 6',
    ]);
    await page.screenshot({ path: testInfo.outputPath('masonry-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
        .poll(async () => {
            const image = await images.nth(0).boundingBox();
            return Math.round((image!.height / image!.width) * 100);
        })
        .toBe(50);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
    );
    await page.screenshot({ path: testInfo.outputPath('masonry-mobile.png') });
});

test('cover dimensions reserve short areas before loading and natural dimensions fill in missing metadata', async ({
    page,
}) => {
    let releaseImage!: () => void;
    const gate = new Promise<void>((resolve) => {
        releaseImage = resolve;
    });
    const image = { url: 'https://covers.example.test/landscape.svg', dims: [400, 200] };
    await page.route(image.url, async (route) => {
        await gate;
        await route.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#c2dfd0"/></svg>',
        });
    });
    await page.route('https://api.vndb.org/kana/vn', (route) =>
        route.fulfill({
            json: {
                results: [
                    { id: 'v1', title: 'Known dimensions', image, released: '2020', rating: 90 },
                    {
                        id: 'v2',
                        title: 'Natural dimensions',
                        image: { url: image.url },
                        released: '2020',
                        rating: 89,
                    },
                ],
                more: false,
            },
        }));
    await page.goto('/');
    const cover = page.getByRole('img', { name: 'Known dimensions cover', exact: true });
    await expect(page.getByLabel('Loading cover')).toHaveCount(2);
    const before = await cover.boundingBox();
    expect(before!.height / before!.width).toBeCloseTo(0.5, 2);
    releaseImage();
    await expect(page.getByLabel('Loading cover')).toHaveCount(0);
    expect(await cover.boundingBox()).toEqual(before);
    await expect
        .poll(async () => {
            const natural = await page
                .getByRole('img', { name: 'Natural dimensions cover', exact: true })
                .boundingBox();
            return Math.round((natural!.height / natural!.width) * 100);
        })
        .toBe(50);
    await page.getByRole('link', { name: 'Open Known dimensions', exact: true }).click();
    const detail = page.getByRole('img', { name: 'Known dimensions cover', exact: true });
    await expect(detail).toBeVisible();
    expect(await detail.evaluate((element) => getComputedStyle(element).objectFit)).toBe('contain');
});
