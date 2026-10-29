import type { Browser, Page } from '@playwright/test';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const STARTUP_TIMEOUT_MS = 10_000;
const STARTUP_POLL_MS = 250;
const LIVE_TIMEOUT_MS = 120_000;
const MAX_API_REQUESTS = 24;
const MAX_TAG_RESULTS = 2;
const API_ORIGIN = 'https://api.vndb.org';
const API_ROUTE = `${API_ORIGIN}/kana/**`;
const LOG_LIMIT = 8_000;

export const startDevServer = async (port: string) => {
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
        throw new Error('PLAYWRIGHT_PORT must be a valid TCP port.');
    }
    const origin = `http://127.0.0.1:${port}`;
    const server = spawn(
        process.execPath,
        ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', port, '--strictPort'],
        { stdio: 'pipe', windowsHide: true }
    );
    let log = '';
    let spawnError: Error | undefined;
    let probeFailure = '';
    server.on('error', (error) => {
        spawnError = error;
    });
    const appendLog = (chunk: Buffer) => {
        log = (log + chunk.toString()).slice(-LOG_LIMIT);
    };
    server.stdout.on('data', appendLog);
    server.stderr.on('data', appendLog);
    const close = async (): Promise<void> => {
        if (server.exitCode !== null || server.signalCode !== null || spawnError) {
            return;
        }
        await new Promise<void>((resolve) => {
            server.once('exit', () => resolve());
            server.kill();
        });
    };
    try {
        const deadline = Date.now() + STARTUP_TIMEOUT_MS;
        while (Date.now() < deadline) {
            if (spawnError || server.exitCode !== null) {
                throw new Error(`Local server exited: ${spawnError?.message ?? log}`);
            }
            // Vite's own ready message prevents accepting an unrelated server on this port.
            if (log.includes(origin)) {
                try {
                    const response = await fetch(origin, {
                        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
                    });
                    if (response.ok) {
                        return { origin, close };
                    }
                    probeFailure = `HTTP ${response.status}`;
                } catch (error) {
                    // The socket may still be opening; retry within the startup deadline.
                    probeFailure =
                        error instanceof Error ? `${error.message}: ${error.cause}` : String(error);
                }
            }
            await delay(STARTUP_POLL_MS);
        }
        throw new Error(
            `Local server did not start within ${STARTUP_TIMEOUT_MS}ms: ${probeFailure}\n${log}`
        );
    } catch (error) {
        await close();
        throw error;
    }
};

export const openLivePage = async (viewport?: {
    width: number;
    height: number;
}): Promise<{ browser: Browser; page: Page }> => {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({ viewport });
        let requests = 0;
        await page.route(API_ROUTE, async (route) => {
            requests++;
            const request = route.request();
            const body = request.postDataJSON() as { results?: number } | null;
            const isLargeTagQuery =
                new URL(request.url()).pathname.endsWith('/tag') &&
                (!body?.results || body.results > MAX_TAG_RESULTS);
            if (requests > MAX_API_REQUESTS || isLargeTagQuery) {
                console.error(
                    `Live probe request budget exceeded or unbounded tag query: ${request.url()}`
                );
                await route.abort('blockedbyclient');
                return;
            }
            await route.continue();
        });
        const deadline = setTimeout(() => {
            console.error(`Live probe exceeded ${LIVE_TIMEOUT_MS}ms; closing its browser.`);
            void browser.close();
        }, LIVE_TIMEOUT_MS);
        deadline.unref();
        browser.once('disconnected', () => clearTimeout(deadline));
        return { browser, page };
    } catch (error) {
        await browser.close();
        throw error;
    }
};
