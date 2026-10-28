import { VNDB_ERROR_KINDS, VndbError } from '@/api/client';
import { HTTP_STATUS } from '@/api/protocol';

import { VNDB_REQUEST_MESSAGES } from './constants';

// Presentation chooses trusted text; transport errors retain only technical context.
export const vndbRequestMessage = (error: unknown): string => {
    if (!(error instanceof VndbError)) {
        return VNDB_REQUEST_MESSAGES.DEFAULT;
    }
    if (error.kind === VNDB_ERROR_KINDS.CANCELLED) {
        return '';
    }
    if (error.kind === VNDB_ERROR_KINDS.NETWORK || error.kind === VNDB_ERROR_KINDS.TIMEOUT) {
        return VNDB_REQUEST_MESSAGES.NETWORK;
    }
    if (error.kind === VNDB_ERROR_KINDS.INVALID_RESPONSE) {
        return VNDB_REQUEST_MESSAGES.INVALID_RESPONSE;
    }
    if (error.status === HTTP_STATUS.RATE_LIMIT) {
        return VNDB_REQUEST_MESSAGES.RATE_LIMIT;
    }
    return VNDB_REQUEST_MESSAGES.DEFAULT;
};
