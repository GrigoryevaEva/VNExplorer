export const PLATFORM_NAMES: Record<string, string> = {
    win: 'Windows',
    lin: 'Linux',
    mac: 'macOS',
    and: 'Android',
    ios: 'iOS',
    web: 'Browser',
    swi: 'Switch',
    ps4: 'PS4',
    ps5: 'PS5',
    psp: 'PSP',
    psv: 'PS Vita',
    ps2: 'PS2',
    ps3: 'PS3',
    ps1: 'PlayStation',
    x3s: 'Xbox Series',
    xb1: 'Xbox One',
    dvd: 'DVD Player',
    bdp: 'Blu-ray Player',
};
export const RELEASE_SITE_KIND = 'website';
export const RELEASE_WEBSITE_PROTOCOLS = ['http:', 'https:'];
export const RELEASE_EDITION_KINDS = {
    DEMO: 'trial',
    PARTIAL: 'partial',
    COMPLETE: 'complete',
} as const;
export const RELEASE_EDITION_LABELS = {
    DEMO: 'Demo',
    PARTIAL: 'Partial',
    PATCH: 'Patch',
    MACHINE_TRANSLATED: 'Machine translation',
} as const;
export const RELEASE_PLANNED_MARKER = 'TBA';
export const RELEASE_LOCALE = 'en';
export const RELEASE_DATE_KEY_LENGTH = 10;
export const RELEASE_DATE_KEY_PADDING = '-00';
export const RELEASE_AGE_UNKNOWN = 'Age unknown';
export const RELEASE_ALL_AGES = 'All ages';
