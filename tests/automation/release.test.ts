import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createTemporaryDirectory } from '../../scripts/lib/temporary-directory.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TEMP_PREFIX = 'vndb-automation-';
const fixtureEnvironment = (cwd: string) => ({
    ...process.env,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: join(cwd, '.git', 'fixture-global-config'),
    GIT_CONFIG_COUNT: '0',
    GIT_AUTHOR_NAME: 'Automation fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Automation fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
});
const git = (cwd: string, ...args: string[]) => {
    const result = spawnSync('git', ['-c', `safe.directory=${cwd}`, ...args], {
        cwd,
        encoding: 'utf8',
        windowsHide: true,
        env: fixtureEnvironment(cwd),
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};
const cli = (cwd: string, script: string, ...args: string[]) =>
    spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], {
        cwd,
        encoding: 'utf8',
        timeout: 30_000,
        env: fixtureEnvironment(cwd),
        windowsHide: true,
    });

const withRepository = async (run: (cwd: string) => Promise<void>, version = '1.0.0') => {
    const temporary = await createTemporaryDirectory(TEMP_PREFIX);
    const cwd = temporary.path;
    try {
        git(cwd, 'init', '--initial-branch=fixture');
        await writeFile(
            join(cwd, 'package.json'),
            JSON.stringify({ name: 'visual-novels', version, private: true })
        );
        await writeFile(
            join(cwd, 'CHANGELOG.md'),
            `# Changes\n\n## ${version}\n\nPrepared release.\n\n## 0.9.0\n\nOlder release.\n`
        );
        git(cwd, 'add', '.');
        git(cwd, 'commit', '-m', 'fixture');
        git(cwd, 'branch', 'dev');
        await run(cwd);
    } finally {
        await temporary.cleanup();
    }
};

test('release CLI creates an annotated matching tag and emits only its notes', async () => {
    await withRepository(async (cwd) => {
        const result = cli(cwd, 'tag-release.mjs');
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /Created v1.0.0/);
        assert.equal(git(cwd, 'cat-file', '-t', 'v1.0.0'), 'tag');
        assert.equal(git(cwd, 'rev-parse', 'v1.0.0^{}'), git(cwd, 'rev-parse', 'HEAD'));
        const notes = cli(cwd, 'release-notes.mjs', 'v1.0.0');
        assert.equal(notes.status, 0, notes.stderr);
        assert.equal(notes.stdout, '## 1.0.0\n\nPrepared release.\n');
        assert.notEqual(cli(cwd, 'release-notes.mjs', 'v0.9.0').status, 0);
        assert.notEqual(cli(cwd, 'tag-release.mjs').status, 0);
    });
});

test('tagging refuses an unprepared version or a dirty repository', async () => {
    await withRepository(async (cwd) => {
        assert.notEqual(cli(cwd, 'tag-release.mjs').status, 0);
        assert.equal(git(cwd, 'tag', '--list'), '');
    }, '0.0.0');
    await withRepository(async (cwd) => {
        await writeFile(join(cwd, 'uncommitted.txt'), 'pending');
        const result = cli(cwd, 'tag-release.mjs');
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Commit or stash/);
        assert.equal(git(cwd, 'tag', '--list'), '');
    });
});

test('changeset check requires a new application note, or committed version preparation', async () => {
    await withRepository(async (cwd) => {
        const base = git(cwd, 'rev-parse', 'HEAD');
        assert.notEqual(cli(cwd, 'check-changeset.mjs', base).status, 0);
        assert.notEqual(cli(cwd, 'check-changeset.mjs', '--help').status, 0);
        await mkdir(join(cwd, '.changeset'));
        const note = join(cwd, '.changeset', 'fixture.md');
        await writeFile(note, '---\n"other-package": patch\n---\nA different package note.\n');
        git(cwd, 'add', '.');
        git(cwd, 'commit', '-m', 'wrong package');
        assert.notEqual(cli(cwd, 'check-changeset.mjs', base).status, 0);
        await writeFile(
            note,
            '---\n"visual-novels": patch\n---\nPreserve release automation contracts.\n'
        );
        git(cwd, 'add', '.');
        git(cwd, 'commit', '-m', 'application note');
        const result = cli(cwd, 'check-changeset.mjs', base);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /Changeset present/);
    });
    await withRepository(async (cwd) => {
        const base = git(cwd, 'rev-parse', 'HEAD');
        await writeFile(
            join(cwd, 'package.json'),
            JSON.stringify({ name: 'visual-novels', version: '1.0.1', private: true })
        );
        await writeFile(join(cwd, 'CHANGELOG.md'), '# Changes\n\n## 1.0.1\n\nPrepared patch.\n');
        git(cwd, 'add', '.');
        git(cwd, 'commit', '-m', 'prepared version');
        const result = cli(cwd, 'check-changeset.mjs', base);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /Version preparation: 1.0.0 -> 1.0.1/);
    });
});

test('Changesets forwards arguments and consumes notes only in its calling fixture repository', async () => {
    await withRepository(async (cwd) => {
        await mkdir(join(cwd, '.changeset'));
        await writeFile(
            join(cwd, '.changeset', 'config.json'),
            await readFile(join(ROOT, '.changeset', 'config.json'))
        );
        await writeFile(
            join(cwd, '.changeset', 'fixture.md'),
            '---\n"visual-novels": patch\n---\nPreserve release automation contracts.\n'
        );
        git(cwd, 'add', '.');
        git(cwd, 'commit', '-m', 'note');
        const status = cli(cwd, 'changesets.mjs', 'status');
        assert.equal(status.status, 0, status.stderr + status.stdout);
        assert.match(status.stdout, /visual-novels/);
        const version = cli(cwd, 'changesets.mjs', 'version');
        assert.equal(version.status, 0, version.stderr);
        const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8')) as {
            version: string;
        };
        assert.equal(pkg.version, '1.0.1');
        assert.match(await readFile(join(cwd, 'CHANGELOG.md'), 'utf8'), /## 1.0.1/);
        assert.match(git(cwd, 'status', '--porcelain'), /D .changeset\/fixture.md/);
        assert.equal(git(cwd, 'tag', '--list'), '');
    });
});

test('release tag rejects a different version heading without creating a tag', async () => {
    const temporary = await createTemporaryDirectory(TEMP_PREFIX);
    const cwd = temporary.path;
    try {
        git(cwd, 'init', '--initial-branch=fixture');
        await writeFile(
            join(cwd, 'package.json'),
            JSON.stringify({ name: 'visual-novels', version: '1.0.0', private: true })
        );
        await writeFile(join(cwd, 'CHANGELOG.md'), '# Changes\n\n## 1.0.00\n\nWrong version.\n');
        git(cwd, 'add', '.');
        git(cwd, 'commit', '-m', 'fixture');
        const result = cli(cwd, 'tag-release.mjs');
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Missing changelog/);
        assert.equal(git(cwd, 'tag', '--list'), '');
    } finally {
        await temporary.cleanup();
    }
});
