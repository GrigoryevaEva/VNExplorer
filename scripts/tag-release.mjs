import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (...args) =>
    execFileSync('git', ['-c', `safe.directory=${process.cwd()}`, ...args], {
        encoding: 'utf8',
    }).trim();
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version) || version === '0.0.0')
    throw new Error('Prepare a version with Changesets first.');
if (git('status', '--porcelain'))
    throw new Error('Commit or stash unignored changes before tagging.');
if (!readFileSync('CHANGELOG.md', 'utf8').includes(`## ${version}`))
    throw new Error('Missing changelog entry.');
git('tag', '-a', `v${version}`, '-m', `VNDB Explorer ${version}`);
console.log(`Created v${version}. Push this tag explicitly to publish the static build.`);
