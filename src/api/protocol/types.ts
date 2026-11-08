import type { VNDB_ENDPOINTS } from './constants';

export type TVndbEndpoint = (typeof VNDB_ENDPOINTS)[keyof typeof VNDB_ENDPOINTS];

export interface IVndbQuery {
    filters?: unknown[];
    fields: string;
    sort?: string;
    reverse?: boolean;
    results?: number;
    page?: number;
    count?: boolean;
}

export interface IVndbResponse<T> {
    results: T[];
    more: boolean;
    count?: number;
    stale?: boolean;
    fetchedAt?: number;
}
