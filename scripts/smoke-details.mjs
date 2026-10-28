import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const port = process.env.PLAYWRIGHT_PORT ?? '4171';
const base = `http://127.0.0.1:${port}`;
const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', port, '--strictPort'],
    { stdio: 'pipe', windowsHide: true }
);
let serverLog = '';
server.stderr.on('data', (chunk) => {
    serverLog += chunk;
});
let browser;
try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
        try {
            ready = (await fetch(base)).ok;
        } catch {
            /* Wait for the local server. */
        }
        if (ready) {
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) {
        throw new Error(`Dev server did not start. ${serverLog}`);
    }
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    const request = page.waitForResponse(
        (response) =>
            response.url() === 'https://api.vndb.org/kana/vn' &&
            response.request().method() === 'POST',
        { timeout: 30000 }
    );
    await page.goto(`${base}/vn/v17`);
    const response = await request;
    if (!response.ok()) {
        throw new Error(`Live API returned ${response.status()}`);
    }
    const body = await response.json();
    await page
        .getByRole('heading', { name: body.results[0].title, exact: true, level: 1 })
        .waitFor();
    await page.waitForTimeout(1500);
    if (process.env.SMOKE_SCREENSHOT) {
        await page.screenshot({ path: process.env.SMOKE_SCREENSHOT, fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
            path: process.env.SMOKE_SCREENSHOT.replace('.png', '-mobile.png'),
            fullPage: true,
        });
    }
    console.log(
        JSON.stringify({
            status: response.status(),
            description: !!body.results[0].description,
            durationMinutes: body.results[0].length_minutes,
            alternativeTitles: body.results[0].titles.length,
            firstTitle: body.results[0].title,
            firstRating: body.results[0].rating,
            total: body.count,
            browserOrigin: new URL(page.url()).origin,
        })
    );
} finally {
    await browser?.close();
    server.kill();
}
