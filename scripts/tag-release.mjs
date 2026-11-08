import { git, readPackage, releaseSection } from './lib/release.mjs';

const { version } = readPackage();
if (!/^\d+\.\d+\.\d+$/.test(version) || version === '0.0.0') {
    throw new Error('Prepare a version with Changesets first.');
}
if (git('status', '--porcelain')) {
    throw new Error('Commit or stash unignored changes before tagging.');
}
releaseSection(version);
git('tag', '-a', `v${version}`, '-m', `VNDB Explorer ${version}`);
console.log(`Created v${version}. Push this tag explicitly to publish the static build.`);
