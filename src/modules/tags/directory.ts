import { queryVndb } from '../vndb/client';
import mapping from './sections.json';
export interface DirectoryTag {
    id: string;
    name: string;
    description: string;
    searchable: boolean;
}
export const tagSections = mapping;
let pending: Promise<DirectoryTag[]> | undefined;
let loaded = 0;
let stale = false;
const listeners = new Set<{ progress: (count: number) => void; onStale?: () => void }>();
export function loadTagDirectory(
    progress: (count: number) => void,
    onStale?: () => void
): Promise<DirectoryTag[]> {
    if (pending) {
        listeners.add({ progress, onStale });
        progress(loaded);
        if (stale) {
            onStale?.();
        }
        return pending;
    }
    loaded = 0;
    stale = false;
    listeners.add({ progress, onStale });
    progress(loaded);
    pending = (async () => {
        const tags = new Map<string, DirectoryTag>();
        for (let page = 1; ; page++) {
            const response = await queryVndb<DirectoryTag>(
                'tag',
                { fields: 'name,description,searchable', sort: 'id', results: 100, page },
                {
                    onStale: () => {
                        stale = true;
                        for (const listener of listeners) {
                            listener.onStale?.();
                        }
                    },
                }
            );
            for (const tag of response.results) {
                if (tag.searchable) {
                    tags.set(tag.id, tag);
                }
            }
            loaded = tags.size;
            for (const listener of listeners) {
                listener.progress(loaded);
            }
            if (!response.more) {
                break;
            }
        }
        return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'));
    })().finally(() => {
        pending = undefined;
        listeners.clear();
    });
    return pending;
}
