import { openLivePage, startDevServer } from './lib/live-browser.ts';

const server = await startDevServer(process.env.PLAYWRIGHT_PORT ?? '4171');
const base = server.origin;
let browser;
try {
    const live = await openLivePage({ width: 1440, height: 1050 });
    browser = live.browser;
    const page = live.page;
    const request = page.waitForResponse(
        (response) =>
            response.url() === 'https://api.vndb.org/kana/vn' &&
            response.request().method() === 'POST',
        { timeout: 30000 }
    );
    await page.goto(base);
    const response = await request;
    if (!response.ok()) {
        throw new Error(`Live API returned ${response.status()}`);
    }
    const body = await response.json();
    await page.getByRole('heading', { name: body.results[0].title, exact: true }).waitFor();
    await page.waitForTimeout(1500);
    if (process.env.SMOKE_SCREENSHOT) {
        await page.screenshot({ path: process.env.SMOKE_SCREENSHOT });
    }
    console.log(
        JSON.stringify({
            status: response.status(),
            stories: body.results.length,
            firstTitle: body.results[0].title,
            firstRating: body.results[0].rating,
            total: body.count,
            browserOrigin: new URL(page.url()).origin,
        })
    );
} finally {
    try {
        await browser?.close();
    } finally {
        await server.close();
    }
}
