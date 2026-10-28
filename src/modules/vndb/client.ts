// Temporary compatibility entry point; removed after scenario migration in ticket 11.
export type { IRequestOptions as QueryOptions } from '@/api/client';
export { isTemporaryVndbError, isVndbCancellation, queryVndb, VndbError } from '@/api/client';
export { CARD_FIELDS, VNDB_API } from '@/api/protocol';
