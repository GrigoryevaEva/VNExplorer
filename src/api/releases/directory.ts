import { z } from 'zod';

import type { IRequestOptions } from '@/api/client';
import { queryVndb } from '@/api/client';
import { VNDB_ENDPOINTS, VNDB_FIELDS, VNDB_OPERATORS } from '@/api/protocol';
import type { IReleaseAssignment } from '@/entities/release/model';

import { RELEASE_DIRECTORY_FIELDS, RELEASE_PAGE_SIZE } from './constants';

const releaseAssignmentSchema = z.looseObject({
    id: z.string().regex(/^r[1-9]\d*$/),
    languages: z.array(z.looseObject({ lang: z.string() })),
});
type TReleaseAssignmentDto = z.infer<typeof releaseAssignmentSchema>;
const mapAssignment = (dto: TReleaseAssignmentDto): IReleaseAssignment => ({
    id: dto.id,
    languages: dto.languages.map((language) => language.lang),
});
export const fetchReleaseDirectory = async (
    id: string,
    options: IRequestOptions = {}
): Promise<IReleaseAssignment[]> => {
    const releases = new Map<string, IReleaseAssignment>();
    for (let page = 1; ; page++) {
        const response = await queryVndb(
            VNDB_ENDPOINTS.RELEASES,
            {
                filters: [
                    VNDB_FIELDS.NOVEL,
                    VNDB_OPERATORS.EQUAL,
                    [VNDB_FIELDS.ID, VNDB_OPERATORS.EQUAL, id],
                ],
                fields: RELEASE_DIRECTORY_FIELDS,
                sort: VNDB_FIELDS.ID,
                results: RELEASE_PAGE_SIZE,
                page,
            },
            { ...options, schema: releaseAssignmentSchema }
        );
        for (const release of response.results) {
            releases.set(release.id, mapAssignment(release));
        }
        if (!response.more) {
            return [...releases.values()];
        }
    }
};
