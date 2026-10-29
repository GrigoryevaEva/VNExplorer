import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

export const createTemporaryDirectory = async (
    prefix: string
): Promise<{ path: string; cleanup: () => Promise<void> }> => {
    assert(/^vndb-[a-z-]+-$/.test(prefix), 'Use an owned VNDB temporary directory prefix');
    const temporaryRoot = resolve(tmpdir());
    const path = await mkdtemp(join(temporaryRoot, prefix));
    const cleanup = async (): Promise<void> => {
        const target = resolve(path);
        const child = relative(temporaryRoot, target);
        assert(
            dirname(target) === temporaryRoot &&
                !isAbsolute(child) &&
                child === basename(target) &&
                child.startsWith(prefix),
            'Cleanup target must be an owned direct child of the system temporary directory'
        );
        await rm(target, { recursive: true, force: true });
    };
    return { path, cleanup };
};
