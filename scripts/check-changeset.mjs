import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.argv[2];
if (!base || base.startsWith('-'))
    throw new Error('Usage: npm run changeset:check -- <base-revision>');
const git = (...args) =>
    execFileSync('git', ['-c', `safe.directory=${process.cwd()}`, ...args], {
        encoding: 'utf8',
    }).trim();
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const names = git('diff', '--name-only', '--diff-filter=A', base, 'HEAD', '--', '.changeset').split(
    '\n'
);
for (const name of names.filter((n) => n.endsWith('.md') && !n.endsWith('/README.md'))) {
    const match = readFileSync(name, 'utf8')
        .replaceAll('\r\n', '\n')
        .match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/);
    const valid = match?.[1].split('\n').some((line) => {
        const item = line.match(/^\s*["']?([^"':]+)["']?:\s*(patch|minor|major)\s*$/);
        return item?.[1] === pkg.name;
    });
    if (valid && match[2].trim().length > 10) {
        console.log(`Changeset present: ${name}`);
        process.exit(0);
    }
}
const before = JSON.parse(git('show', `${base}:package.json`));
if (
    before.version !== pkg.version &&
    git('diff', '--name-only', base, 'HEAD').split('\n').includes('CHANGELOG.md')
) {
    console.log(`Version preparation: ${before.version} -> ${pkg.version}`);
    process.exit(0);
}
console.error(
    'Add a new application changeset with a bump level and summary before merging into dev.'
);
process.exit(1);
