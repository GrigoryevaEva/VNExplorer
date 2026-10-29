import {
    PLATFORM_NAMES,
    RELEASE_AGE_UNKNOWN,
    RELEASE_ALL_AGES,
    RELEASE_DATE_KEY_LENGTH,
    RELEASE_DATE_KEY_PADDING,
    RELEASE_EDITION_KINDS,
    RELEASE_EDITION_LABELS,
    RELEASE_LOCALE,
    RELEASE_PLANNED_MARKER,
    RELEASE_SITE_KIND,
    RELEASE_WEBSITE_PROTOCOLS,
} from './constants';
import type { IReleaseAssignment, IReleaseDetails, IReleaseLanguageGroup } from './types';

export const releaseWebsites = (release: IReleaseDetails) =>
    release.externalLinks.filter((link, index, links) => {
        if (
            link.name !== RELEASE_SITE_KIND ||
            links.findIndex((other) => other.url === link.url) !== index
        ) {
            return false;
        }
        try {
            return RELEASE_WEBSITE_PROTOCOLS.includes(new URL(link.url).protocol);
        } catch {
            return false;
        }
    });

export const releaseEditionLabels = (
    release: IReleaseDetails,
    novelId: string,
    language: string
): string[] => {
    const kind = release.novels.find((novel) => novel.id === novelId)?.kind;
    const labels: string[] = [];
    if (kind === RELEASE_EDITION_KINDS.DEMO) {
        labels.push(RELEASE_EDITION_LABELS.DEMO);
    } else if (kind === RELEASE_EDITION_KINDS.PARTIAL) {
        labels.push(RELEASE_EDITION_LABELS.PARTIAL);
    }
    if (release.patch) {
        labels.push(RELEASE_EDITION_LABELS.PATCH);
    }
    if (release.languages.some((entry) => entry.language === language && entry.machineTranslated)) {
        labels.push(RELEASE_EDITION_LABELS.MACHINE_TRANSLATED);
    }
    return labels;
};
const dateKey = (value: string | null): string =>
    value && /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(value)
        ? value.padEnd(RELEASE_DATE_KEY_LENGTH, RELEASE_DATE_KEY_PADDING)
        : '';
export const newestReleases = (releases: readonly IReleaseDetails[]): IReleaseDetails[] =>
    releases
        .slice()
        .sort(
            (first, second) =>
                dateKey(second.released).localeCompare(dateKey(first.released)) ||
                first.id.localeCompare(second.id, undefined, { numeric: true })
        );
export const isPlanned = (value: string | null): boolean => {
    if (value === RELEASE_PLANNED_MARKER) {
        return true;
    }
    const key = dateKey(value);
    return !!key && key > new Date().toISOString().slice(0, RELEASE_DATE_KEY_LENGTH);
};
export const languageName = (code: string): string => {
    try {
        return new Intl.DisplayNames([RELEASE_LOCALE], { type: 'language' }).of(code) ?? code;
    } catch {
        return code;
    }
};
export const platformName = (code: string): string => PLATFORM_NAMES[code] ?? code;
export const releaseAgeLabel = (minimumAge: number | null): string => {
    if (minimumAge === null) {
        return RELEASE_AGE_UNKNOWN;
    }
    if (minimumAge === 0) {
        return RELEASE_ALL_AGES;
    }
    return `${minimumAge}+`;
};
export const releaseLanguageGroups = (
    directory: readonly IReleaseAssignment[]
): IReleaseLanguageGroup[] => {
    const assignments = new Map<string, string[]>();
    for (const release of directory) {
        for (const language of release.languages) {
            if (!assignments.has(language)) {
                assignments.set(language, []);
            }
            if (!assignments.get(language)!.includes(release.id)) {
                assignments.get(language)!.push(release.id);
            }
        }
    }
    return [...assignments]
        .map(([code, ids]) => ({ code, ids, name: languageName(code) }))
        .sort((first, second) => first.name.localeCompare(second.name));
};
