import axios from 'axios';

import { HTTP_STATUS } from '@/api/protocol';

import { ABORT_ERROR_NAME, TRANSPORT_ERROR_CODES } from './constants';

export const VNDB_ERROR_KINDS = {
    HTTP: 'http',
    NETWORK: 'network',
    TIMEOUT: 'timeout',
    CANCELLED: 'cancelled',
    INVALID_RESPONSE: 'invalid-response',
    UNKNOWN: 'unknown',
} as const;

export type TVndbErrorKind = (typeof VNDB_ERROR_KINDS)[keyof typeof VNDB_ERROR_KINDS];

interface IVndbErrorDetails extends ErrorOptions {
    status?: number;
    code?: string;
}

export class VndbError extends Error {
    readonly kind: TVndbErrorKind;
    readonly status?: number;
    readonly code?: string;

    constructor(kind: TVndbErrorKind, details: IVndbErrorDetails = {}) {
        super(`VNDB request failed: ${kind}`, { cause: details.cause });
        this.name = 'VndbError';
        this.kind = kind;
        this.status = details.status;
        this.code = details.code;
    }
}

export const normalizeVndbError = (error: unknown): VndbError => {
    if (error instanceof VndbError) {
        return error;
    }
    if (
        axios.isCancel(error) ||
        (error instanceof DOMException && error.name === ABORT_ERROR_NAME)
    ) {
        return new VndbError(VNDB_ERROR_KINDS.CANCELLED, {
            cause: error,
            code: TRANSPORT_ERROR_CODES.CANCELLED,
        });
    }
    if (axios.isAxiosError(error)) {
        const details = { cause: error, status: error.response?.status, code: error.code };
        if (error.response) {
            return new VndbError(VNDB_ERROR_KINDS.HTTP, details);
        }
        if (
            error.code === TRANSPORT_ERROR_CODES.TIMEOUT ||
            error.code === TRANSPORT_ERROR_CODES.ABORTED
        ) {
            return new VndbError(VNDB_ERROR_KINDS.TIMEOUT, details);
        }
        if (error.code === TRANSPORT_ERROR_CODES.NETWORK || error.request) {
            return new VndbError(VNDB_ERROR_KINDS.NETWORK, details);
        }
        return new VndbError(VNDB_ERROR_KINDS.UNKNOWN, details);
    }
    return new VndbError(VNDB_ERROR_KINDS.UNKNOWN, { cause: error });
};

export const isVndbCancellation = (error: unknown): boolean =>
    (error instanceof VndbError && error.kind === VNDB_ERROR_KINDS.CANCELLED) ||
    (error instanceof DOMException && error.name === ABORT_ERROR_NAME);

export const isTemporaryVndbError = (error: unknown): boolean =>
    error instanceof VndbError &&
    (error.kind === VNDB_ERROR_KINDS.NETWORK ||
        error.kind === VNDB_ERROR_KINDS.TIMEOUT ||
        (error.kind === VNDB_ERROR_KINDS.HTTP &&
            (error.status === HTTP_STATUS.RATE_LIMIT ||
                (error.status !== undefined && error.status >= HTTP_STATUS.SERVER_ERROR_MIN))));
