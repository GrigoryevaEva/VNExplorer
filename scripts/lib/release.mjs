import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Trust only this process's checkout; never edit the user's global Git configuration.
export const git = (...args) =>
    execFileSync('git', ['-c', `safe.directory=${process.cwd()}`, ...args], {
        encoding: 'utf8',
        windowsHide: true,
    }).trim();

export const readPackage = () => JSON.parse(readFileSync('package.json', 'utf8'));

export const releaseSection = (version) => {
    const section = readFileSync('CHANGELOG.md', 'utf8')
        .split(/^## /m)
        .slice(1)
        .find((entry) => entry.split(/\r?\n/)[0].trim() === version);
    if (!section) {
        throw new Error('Missing changelog section.');
    }
    return `## ${section.trim()}\n`;
};
