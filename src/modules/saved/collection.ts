import { computed, ref } from 'vue';

import type { VisualNovelCard } from '../vndb/types';

interface SavedEntry {
    addedAt: number;
    novel: VisualNovelCard;
}
export type SavedSort = 'added' | 'rating' | 'released';
const STORAGE_KEY = 'vndb-explorer:saved:v1';
const entries = ref<SavedEntry[]>([]);
export const savedError = ref('');
export const removedEntry = ref<SavedEntry | null>(null);
let undoTimer: ReturnType<typeof setTimeout> | undefined;
let readable = true;

function snapshot(novel: VisualNovelCard): VisualNovelCard {
    return {
        id: novel.id,
        title: novel.title,
        released: novel.released,
        rating: novel.rating,
        image: novel.image ? { ...novel.image } : null,
    };
}

function read() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        readable = true;
        if (!raw) {
            entries.value = [];
            return;
        }
        const data = JSON.parse(raw);
        if (
            data.version !== 1 ||
            !Array.isArray(data.entries) ||
            data.entries.some(
                (entry: SavedEntry) =>
                    !entry?.novel ||
                    !/^v[1-9]\d*$/.test(entry.novel.id) ||
                    typeof entry.novel.title !== 'string' ||
                    !Number.isFinite(entry.addedAt)
            )
        )
            throw new Error('Invalid collection');
        const unique = new Map<string, SavedEntry>();
        for (const entry of data.entries as SavedEntry[])
            unique.set(entry.novel.id, { addedAt: entry.addedAt, novel: snapshot(entry.novel) });
        entries.value = [...unique.values()];
    } catch {
        readable = false;
        savedError.value =
            'Could not read Saved from this browser. Your stored collection has not been changed.';
    }
}
read();
window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) read();
});

function persist(next: SavedEntry[]) {
    if (!readable) return false;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, entries: next }));
        entries.value = next;
        savedError.value = '';
        return true;
    } catch {
        savedError.value =
            'Could not update Saved. Browser storage is unavailable or full. Your change was not saved.';
        return false;
    }
}

export const savedNovels = computed(() => entries.value.map((entry) => entry.novel));
export function isSaved(id: string) {
    return entries.value.some((entry) => entry.novel.id === id);
}
export function toggleSaved(novel: VisualNovelCard) {
    const existing = entries.value.find((entry) => entry.novel.id === novel.id);
    if (!existing) {
        persist([...entries.value, { addedAt: Date.now(), novel: snapshot(novel) }]);
        return;
    }
    if (!persist(entries.value.filter((entry) => entry.novel.id !== novel.id))) return;
    clearTimeout(undoTimer);
    removedEntry.value = existing;
    undoTimer = setTimeout(() => {
        removedEntry.value = null;
    }, 8000);
}
export function undoRemoval() {
    const entry = removedEntry.value;
    if (!entry) return;
    if (!isSaved(entry.novel.id) && !persist([...entries.value, entry])) return;
    clearTimeout(undoTimer);
    removedEntry.value = null;
}
export function selectSaved(search: string, sort: SavedSort): VisualNovelCard[] {
    const text = search.trim().toLocaleLowerCase('en');
    return entries.value
        .filter((entry) => entry.novel.title.toLocaleLowerCase('en').includes(text))
        .slice()
        .sort((a, b) => {
            if (sort === 'rating')
                return (b.novel.rating ?? -1) - (a.novel.rating ?? -1) || b.addedAt - a.addedAt;
            if (sort === 'released') {
                const date = (value: string | null) =>
                    value && /^\d{4}(?:-\d{2}){0,2}$/.test(value) ? value : '';
                return (
                    date(b.novel.released).localeCompare(date(a.novel.released)) ||
                    b.addedAt - a.addedAt
                );
            }
            return b.addedAt - a.addedAt;
        })
        .map((entry) => entry.novel);
}
export function updateSavedSnapshots(novels: VisualNovelCard[]) {
    const byId = new Map(novels.map((novel) => [novel.id, novel]));
    const next = entries.value.map((entry) => ({
        ...entry,
        novel: byId.has(entry.novel.id) ? snapshot(byId.get(entry.novel.id)!) : entry.novel,
    }));
    if (JSON.stringify(next) !== JSON.stringify(entries.value)) persist(next);
}
