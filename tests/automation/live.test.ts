import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createTemporaryDirectory } from '../../scripts/lib/temporary-directory.ts';

const LIVE_CLI = fileURLToPath(new URL('../../scripts/smoke-vndb.mjs', import.meta.url));
const listen = async (server: Server, port = 0) => {
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });
    const address = server.address();
    assert(address && typeof address !== 'string');
    return address.port;
};
const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));
const run = (cwd: string, port: string) =>
    new Promise<{ code: number | string | null | undefined; stderr: string }>((resolve) => {
        execFile(
            process.execPath,
            [LIVE_CLI],
            {
                cwd,
                env: {
                    ...process.env,
                    PLAYWRIGHT_PORT: port,
                    PLAYWRIGHT_BROWSERS_PATH: join(cwd, 'no-browsers'),
                },
                timeout: 20_000,
                windowsHide: true,
            },
            (error, _stdout, stderr) => resolve({ code: error?.code, stderr })
        );
    });

// Substitute the external Vite process at its executable boundary. No network API or
// application module is mocked, and no browser can reach VNDB in these process tests.
const fixture = async (responseDelayMs = 0) => {
    const temporary = await createTemporaryDirectory('vndb-live-process-');
    const bin = join(temporary.path, 'node_modules/vite/bin');
    await mkdir(bin, { recursive: true });
    await writeFile(
        join(bin, 'vite.js'),
        `
const { createServer } = require('node:http');
const port = process.argv[process.argv.indexOf('--port') + 1];
const server = createServer((_request, response) => setTimeout(() => response.end('ready'), ${responseDelayMs}));
server.on('error', (error) => { console.error(error.code); process.exit(1); });
server.listen(Number(port), '127.0.0.1', () => console.log('http://127.0.0.1:' + port));
`
    );
    return temporary;
};

test('live CLI rejects invalid ports before launching a server', async () => {
    const temporary = await fixture();
    try {
        const result = await run(temporary.path, 'invalid');
        assert.equal(result.code, 1);
        assert.match(result.stderr, /valid TCP port/);
    } finally {
        await temporary.cleanup();
    }
});

test('live CLI refuses an occupied port rather than probing an unrelated server', async () => {
    const temporary = await fixture();
    const occupied = createServer((_request, response) => response.end('unrelated'));
    try {
        const port = await listen(occupied);
        const result = await run(temporary.path, String(port));
        assert.equal(result.code, 1);
        assert.match(result.stderr, /Local server exited:.*EADDRINUSE/s);
        assert.doesNotMatch(result.stderr, /Executable doesn't exist/);
    } finally {
        await close(occupied);
        await temporary.cleanup();
    }
});

test('live CLI terminates its owned server when browser launch fails', async () => {
    const temporary = await fixture();
    const reservation = createServer();
    const port = await listen(reservation);
    await close(reservation);
    try {
        const result = await run(temporary.path, String(port));
        assert.equal(result.code, 1);
        assert.match(result.stderr, /Executable doesn't exist/);
        const reclaimed = createServer();
        await listen(reclaimed, port);
        await close(reclaimed);
    } finally {
        await temporary.cleanup();
    }
});

test('live CLI allows a cold server response within its overall startup deadline', async () => {
    const temporary = await fixture(750);
    const reservation = createServer();
    const port = await listen(reservation);
    await close(reservation);
    try {
        const result = await run(temporary.path, String(port));
        assert.equal(result.code, 1);
        assert.match(result.stderr, /Executable doesn't exist/);
        assert.doesNotMatch(result.stderr, /Local server did not start/);
    } finally {
        await temporary.cleanup();
    }
});
