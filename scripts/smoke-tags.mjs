import { openLivePage, startDevServer } from './lib/live-browser.ts';

const server = await startDevServer(process.env.PLAYWRIGHT_PORT ?? '4176');
const origin = server.origin;
let browser;
try {
    const live = await openLivePage();
    browser = live.browser;
    const page = live.page;
    await page.goto(`${origin}/?tag=g96`);
    await page.getByRole('heading', { name: 'Romantic story' }).count();
    const result = await page.evaluate(async () => {
        const query = async (endpoint, body) => {
            const response = await fetch(`https://api.vndb.org/kana/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(15_000),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error(`${endpoint}: HTTP ${response.status}`);
            }
            return response.json();
        };
        const tags = [];
        for (const page of [1, 2]) {
            tags.push(
                await query('tag', {
                    fields: 'name,description,searchable',
                    sort: 'id',
                    results: 2,
                    page,
                })
            );
        }
        const novels = await query('vn', {
            filters: ['tag', '=', ['g96', 0, 0]],
            fields: 'title,tags{id,spoiler,rating}',
            sort: 'rating',
            reverse: true,
            results: 2,
            count: true,
        });
        return {
            directoryPages: tags.map((page) => ({
                tags: page.results.map((tag) => tag.id),
                more: page.more,
            })),
            catalogCount: novels.count,
            firstTitles: novels.results.map((novel) => novel.title),
        };
    });
    console.log(JSON.stringify(result));
} finally {
    try {
        await browser?.close();
    } finally {
        await server.close();
    }
}
