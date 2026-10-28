export const VNDB_REQUEST_MESSAGES = {
    NETWORK: 'VNDB is out of reach. Check your connection and try again.',
    RATE_LIMIT: 'VNDB needs a little time. Please try again shortly.',
    INVALID_RESPONSE: 'VNDB returned an unexpected response. Please try again.',
    DEFAULT: 'We could not load stories from VNDB. Please try again.',
} as const;
