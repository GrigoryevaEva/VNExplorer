import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
if (process.argv[2] !== `v${version}`) {
    throw new Error('Tag does not match package version.');
}
const section = readFileSync('CHANGELOG.md', 'utf8')
    .split(/^## /m)
    .slice(1)
    .find((s) => s.split(/\r?\n/)[0].trim() === version);
if (!section) {
    throw new Error('Missing changelog section.');
}
process.stdout.write(`## ${section.trim()}\n`);
