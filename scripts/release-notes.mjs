import { readPackage, releaseSection } from './lib/release.mjs';

const { version } = readPackage();
if (process.argv[2] !== `v${version}`) {
    throw new Error('Tag does not match package version.');
}
process.stdout.write(releaseSection(version));
