import type { Locator } from '@playwright/test';
import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
    test(`Catalog, Details and Saved preserve layout and keyboard access at ${width}px`, async ({
        page,
    }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const novels = Array.from({ length: 12 }, (_, index) => ({
            id: `v${index + 1}`,
            title: `Chapter ${index + 1}`,
            released: '2020-05-01',
            rating: 85,
            image:
                index % 3 === 2
                    ? null
                    : {
                          url: `https://covers.example.test/${index % 2 ? 'portrait' : 'landscape'}.svg`,
                          dims: index % 2 ? [200, 300] : [400, 200],
                      },
            description: 'A quiet journey. [url=https://vndb.org]Source[/url]',
            titles: [],
            screenshots: [],
            tags: [],
        }));
        await page.route('https://covers.example.test/**', (route) => {
            const portrait = route.request().url().includes('portrait');
            return route.fulfill({
                contentType: 'image/svg+xml',
                body: `<svg xmlns="http://www.w3.org/2000/svg" width="${portrait ? 200 : 400}" height="${portrait ? 300 : 200}"><rect width="100%" height="100%" fill="${portrait ? '#eabbd5' : '#c2dfd0'}"/><circle cx="100" cy="100" r="60" fill="#425345"/></svg>`,
            });
        });
        await page.route('https://api.vndb.org/kana/vn', (route) =>
            route.fulfill({
                json: {
                    results:
                        route.request().postDataJSON().filters?.[0] === 'id' ? [novels[0]] : novels,
                    more: true,
                    count: 48,
                },
            }));
        await page.route('https://api.vndb.org/kana/release', (route) =>
            route.fulfill({ json: { results: [], more: false } }));
        await page.goto('/');
        await expect(page.getByRole('article')).toHaveCount(12);
        await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText('Chapter 1');
        const results = page.getByRole('region', { name: 'Catalog results' });
        const search = page.getByRole('searchbox', { name: 'Search titles' });
        const before = await search.boundingBox();
        await results.focus();
        await page.keyboard.press('PageDown');
        await expect
            .poll(() => results.evaluate((element) => element.scrollTop))
            .toBeGreaterThan(0);
        expect(await search.boundingBox()).toEqual(before);
        await results.evaluate((element) => {
            element.scrollTop = 0;
        });
        await page.getByRole('button', { name: 'Save Chapter 1', exact: true }).click();
        await page.getByRole('button', { name: 'Save Chapter 2', exact: true }).click();
        if (width === 390) {
            const filters = page.getByRole('button', { name: 'Filters', exact: true });
            await filters.focus();
            await page.keyboard.press('Enter');
            await expect(page.getByRole('dialog', { name: 'Catalog filters' })).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(filters).toBeFocused();
        } else {
            const sidebar = page.getByRole('complementary', { name: 'Current catalog selection' });
            await sidebar.evaluate((element) => {
                element.scrollTop = element.scrollHeight;
            });
            await expect(sidebar.getByRole('link', { name: 'VNDB' })).toBeInViewport();
            await sidebar.evaluate((element) => {
                element.scrollTop = 0;
            });
        }
        await expect(page.getByLabel('Loading cover')).toHaveCount(0);
        await page.screenshot({
            path: testInfo.outputPath(`catalog-${width}.png`),
            animations: 'disabled',
        });
        await page.getByRole('link', { name: 'Open Chapter 1', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Chapter 1', exact: true })).toBeVisible();
        const cover = page.getByRole('img', { name: 'Chapter 1 cover', exact: true });
        await expect(cover).toBeVisible();
        await expect(page.getByLabel('Loading cover')).toHaveCount(0);
        expect(await cover.evaluate((element) => getComputedStyle(element).objectFit)).toBe(
            'contain'
        );
        await page.screenshot({
            path: testInfo.outputPath(`details-${width}.png`),
            animations: 'disabled',
        });
        await page.getByRole('link', { name: 'Saved', exact: true }).click();
        await expect(page.getByRole('article')).toHaveCount(2);
        await expect(page.getByLabel('Loading cover')).toHaveCount(0);
        await expect(page.getByRole('article').getByRole('heading')).toHaveText([
            'Chapter 2',
            'Chapter 1',
        ]);
        await page.screenshot({
            path: testInfo.outputPath(`saved-${width}.png`),
            animations: 'disabled',
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true
        );
    });
}

test('formatted source text keeps its visual cues in story and tag descriptions', async ({
    page,
}, testInfo) => {
    const description =
        'First paragraph.\n\nSecond paragraph. [url=https://vndb.org]Read source[/url] [quote]Quoted passage[/quote] [spoiler]Hidden passage[/spoiler]';
    await page.route('https://api.vndb.org/kana/vn', (route) =>
        route.fulfill({
            json: {
                results: [{ id: 'v1', title: 'Formatted story', image: null, description }],
                more: false,
            },
        }));
    await page.route('https://api.vndb.org/kana/release', (route) =>
        route.fulfill({ json: { results: [], more: false } }));
    await page.route('https://api.vndb.org/kana/tag', (route) =>
        route.fulfill({
            json: {
                results: [{ id: 'g96', name: 'Romance', searchable: true, description }],
                more: false,
            },
        }));
    await page.goto('/vn/v1');
    const story = page.getByRole('region', { name: 'The story', exact: true });
    const verify = async (description: Locator): Promise<void> => {
        await expect(description.getByRole('link', { name: 'Read source' })).toHaveCSS(
            'color',
            'rgb(194, 223, 208)'
        );
        await expect(description.locator('blockquote')).toHaveCSS('border-left-width', '3px');
        await expect(description.locator('blockquote')).toHaveCSS('color', 'rgb(161, 166, 156)');
        const first = await description
            .getByText('First paragraph.', { exact: true })
            .boundingBox();
        const second = await description
            .getByText('Second paragraph.', { exact: true })
            .boundingBox();
        expect(second!.y - first!.y).toBeGreaterThan(first!.height);
        const spoiler = description.getByText('Source spoiler', { exact: true });
        await expect(spoiler).toHaveCSS('color', 'rgb(234, 187, 213)');
        await expect(description.getByText('Hidden passage', { exact: true })).not.toBeVisible();
        await spoiler.focus();
        await page.keyboard.press('Enter');
        await expect(description.getByText('Hidden passage', { exact: true })).toBeVisible();
    };
    await verify(story);
    await page.screenshot({
        path: testInfo.outputPath('formatted-story.png'),
        animations: 'disabled',
    });
    await page.getByRole('link', { name: 'Catalog', exact: true }).click();
    await page.getByRole('button', { name: 'Browse tags' }).click();
    const picker = page.getByRole('dialog', { name: 'Discover tags' });
    await picker.getByRole('button', { name: 'All tags', exact: true }).click();
    await picker.getByRole('button', { name: 'About Romance', exact: true }).click();
    await verify(picker);
    await page.screenshot({
        path: testInfo.outputPath('formatted-tag.png'),
        animations: 'disabled',
    });
});
