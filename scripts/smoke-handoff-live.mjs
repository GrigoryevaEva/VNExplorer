import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Deliberately bounded: initial Catalog, alias, two tiny pages, one detail,
// its release manifest and one expanded language. Never open the full tag picker.
const port = process.env.PLAYWRIGHT_PORT ?? '4190';
const origin = `http://127.0.0.1:${port}`;
const artifacts = resolve(process.env.SMOKE_ARTIFACT_DIR ?? 'test-results/live-handoff');
await mkdir(artifacts, { recursive: true });
const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', port, '--strictPort'],
    { stdio: 'pipe', windowsHide: true }
);
let serverLog = '';
server.stdout.on('data', (chunk) => {
    serverLog += chunk;
});
server.stderr.on('data', (chunk) => {
    serverLog += chunk;
});
let browser;
try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
        if (server.exitCode !== null) {
            throw new Error(`Local server exited: ${serverLog}`);
        }
        try {
            ready = (await fetch(origin)).ok;
        } catch {
            /* Local development server startup. */
        }
        if (ready) {
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert(ready, `Local app started: ${serverLog}`);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    let apiRequests = 0;
    page.on('request', (request) => {
        if (request.url().startsWith('https://api.vndb.org/kana/')) {
            apiRequests++;
        }
    });
    const nextVn = () =>
        page.waitForResponse(
            (response) =>
                response.url() === 'https://api.vndb.org/kana/vn' &&
                response.request().method() === 'POST'
        );
    let pending = nextVn();
    await page.goto(origin);
    const catalogResponse = await pending;
    assert.equal(catalogResponse.status(), 200);
    const catalog = await catalogResponse.json();
    assert.equal(catalog.results.length, 24);
    assert(catalog.count > 24);
    await expect(
        page.getByRole('heading', { name: catalog.results[0].title, exact: true })
    ).toBeVisible();
    for (const novel of catalog.results.slice(0, 4)) {
        if (novel.image) {
            await expect
                .poll(
                    () =>
                        page
                            .getByRole('img', { name: `${novel.title} cover`, exact: true })
                            .evaluate((image) => image.complete && image.naturalWidth > 0),
                    { timeout: 20000 }
                )
                .toBe(true);
        }
    }
    await page.screenshot({ path: join(artifacts, 'live-catalog-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(artifacts, 'live-catalog-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    pending = nextVn();
    await page.getByRole('searchbox', { name: 'Search titles' }).fill('シュタインズ・ゲート');
    await page.getByRole('searchbox', { name: 'Search titles' }).press('Enter');
    const aliasResponse = await pending;
    assert.equal(aliasResponse.status(), 200);
    const alias = await aliasResponse.json();
    assert(alias.results.some((novel) => novel.id === 'v2002'));
    await expect(
        page.getByRole('heading', {
            name: alias.results.find((novel) => novel.id === 'v2002').title,
            exact: true,
        })
    ).toBeVisible();
    const pages = await page.evaluate(async () => {
        const pages = [];
        for (const page of [1, 2]) {
            const response = await fetch('https://api.vndb.org/kana/vn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filters: ['search', '=', 'sakura'],
                    fields: 'title,released',
                    results: 2,
                    sort: 'released',
                    reverse: true,
                    page,
                    count: true,
                }),
            });
            if (!response.ok) {
                throw new Error(`VNDB page ${page}: ${response.status}`);
            }
            pages.push(await response.json());
        }
        return pages;
    });
    assert.equal(pages[0].count, pages[1].count);
    assert(pages[0].count > 2 && pages.every((page) => page.more && page.results.length === 2));
    assert.notEqual(pages[0].results[0].id, pages[1].results[0].id);
    pending = nextVn();
    await page.goto(`${origin}/vn/v17`);
    const detailResponse = await pending;
    assert.equal(detailResponse.status(), 200);
    const detail = (await detailResponse.json()).results[0];
    assert(Array.isArray(detail.tags) && detail.tags.every((tag) => Number.isInteger(tag.spoiler)));
    await expect(page.getByRole('heading', { name: detail.title, level: 1 })).toBeVisible();
    const releasePending = page.waitForResponse(
        (response) =>
            response.url() === 'https://api.vndb.org/kana/release' &&
            response.request().method() === 'POST' &&
            response.request().postDataJSON().fields.includes('title')
    );
    await page.getByRole('button', { name: /^English · \d+ releases?$/ }).click();
    const releaseResponse = await releasePending;
    assert.equal(releaseResponse.status(), 200);
    const releases = (await releaseResponse.json()).results;
    assert(releases.length > 0);
    assert(
        releases.every(
            (release) =>
                typeof release.patch === 'boolean' &&
                release.languages.every((language) => typeof language.mtl === 'boolean') &&
                release.vns.some(
                    (novel) =>
                        novel.id === 'v17' && ['trial', 'partial', 'complete'].includes(novel.rtype)
                )
        )
    );
    await expect(
        page
            .getByRole('region', { name: 'English releases', exact: true })
            .getByRole('listitem')
            .first()
    ).toBeVisible();
    await page.screenshot({ path: join(artifacts, 'live-detail-desktop.png'), fullPage: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(artifacts, 'live-detail-desktop-hero.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(artifacts, 'live-detail-mobile.png'), fullPage: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(artifacts, 'live-detail-mobile-hero.png') });
    await page
        .getByRole('region', { name: 'English releases', exact: true })
        .scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(artifacts, 'live-detail-mobile-releases.png') });
    const evidence = {
        checkedAt: new Date().toISOString(),
        origin,
        apiRequests,
        catalog: {
            status: catalogResponse.status(),
            count: catalog.count,
            firstTitle: catalog.results[0].title,
        },
        alias: {
            status: aliasResponse.status(),
            title: alias.results.find((novel) => novel.id === 'v2002').title,
        },
        pages: pages.map((page) => ({
            count: page.count,
            ids: page.results.map((novel) => novel.id),
            more: page.more,
        })),
        detail: { status: detailResponse.status(), title: detail.title, tags: detail.tags.length },
        releases: {
            status: releaseResponse.status(),
            records: releases.length,
            sourceFlags: releases.map((release) => {
                const {
                    id,
                    patch,
                    languages,
                    vns,
                } = release;
                return { id, patch, languages, vns };
            }),
        },
    };
    await writeFile(join(artifacts, 'live-evidence.json'), JSON.stringify(evidence, null, 2));
    console.log(
        JSON.stringify({
            ...evidence,
            releases: { ...evidence.releases, sourceFlags: 'see live-evidence.json' },
        })
    );
} finally {
    await browser?.close();
    server.kill();
}
