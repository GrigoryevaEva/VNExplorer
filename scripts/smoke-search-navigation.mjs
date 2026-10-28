import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const port = 4173;
const base = `http://127.0.0.1:${port}`;
const server = spawn(
    process.execPath,
    [
        'node_modules/vite/bin/vite.js',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--strictPort',
    ],
    { stdio: 'pipe', windowsHide: true }
);
let browser;
try {
    for (let attempt = 0; attempt < 40; attempt++) {
        try {
            if ((await fetch(base)).ok) break;
        } catch {
            // The dev server may still be starting; retry until the bounded deadline.
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    const responsePromise = page.waitForResponse(
        (response) => response.url() === 'https://api.vndb.org/kana/vn'
    );
    await page.goto(`${base}/?q=${encodeURIComponent('シュタインズ・ゲート')}`);
    const response = await responsePromise;
    const body = await response.json();
    console.log(
        JSON.stringify({
            status: response.status(),
            titles: body.results?.map((vn) => ({ id: vn.id, title: vn.title })),
            error: body.error,
        })
    );
    if (!response.ok() || !body.results.some((vn) => vn.id === 'v2002'))
        throw new Error('Alias search did not return Steins;Gate');
    const pages = await page.evaluate(async () => {
        const output = [];
        for (const page of [1, 2]) {
            const response = await fetch('https://api.vndb.org/kana/vn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filters: ['search', '=', 'sakura'],
                    fields: 'title,released',
                    sort: 'released',
                    reverse: true,
                    results: 2,
                    page,
                    count: true,
                }),
            });
            output.push({ status: response.status, ...(await response.json()) });
        }
        return output;
    });
    if (
        pages.some((result) => result.status !== 200 || !result.more) ||
        pages[0].count !== pages[1].count ||
        pages[0].results[0].id === pages[1].results[0].id
    )
        throw new Error('Unexpected page/count semantics');
    await page.screenshot({ path: 'test-results/ticket02-live-desktop.png' });
    console.log(
        JSON.stringify(
            {
                alias: {
                    status: response.status(),
                    count: body.count,
                    mainTitle: body.results.find((vn) => vn.id === 'v2002').title,
                },
                pages,
            },
            null,
            2
        )
    );
} finally {
    await browser?.close();
    server.kill();
}
