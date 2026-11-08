export interface IReleaseAssignment {
    id: string;
    languages: string[];
}

export interface IReleaseDetails {
    id: string;
    title: string;
    released: string | null;
    minimumAge: number | null;
    official: boolean;
    platforms: readonly string[];
    externalLinks: readonly { name: string; label: string; url: string }[];
    patch: boolean | null;
    languages: readonly { language: string; machineTranslated: boolean | null }[];
    novels: readonly { id: string; kind: string }[];
}

export interface IReleaseLanguageGroup {
    code: string;
    ids: string[];
    name: string;
}
