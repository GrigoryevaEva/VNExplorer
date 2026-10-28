export const SAVED_STORE_ID = 'saved';
export const SAVED_STORAGE_KEY = 'vndb-explorer:saved:v1';
export const SAVED_STORAGE_VERSION = 1;
export const SAVED_UNDO_TIMEOUT_MS = 8000;
export const SAVED_READ_ERROR_MESSAGE =
    'Could not read Saved from this browser. Your stored collection has not been changed.';
export const SAVED_WRITE_ERROR_MESSAGE =
    'Could not update Saved. Browser storage is unavailable or full. Your change was not saved.';
export const SAVED_SORTS = { ADDED: 'added', RATING: 'rating', RELEASED: 'released' } as const;
