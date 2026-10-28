export interface IDirectoryTag {
    id: string;
    name: string;
    description: string;
    searchable: boolean;
}

export interface ITagSection {
    name: string;
    ids: readonly string[];
}
