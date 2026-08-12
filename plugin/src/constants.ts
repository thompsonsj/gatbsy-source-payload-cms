export const NODE_TYPES = {
  Post: `Post`,
  Author: `Author`,
  Asset: `Asset`,
} as const

export const CACHE_KEYS = {
  Timestamp: `updatedAt`,
} as const

/**
 * Requests-per-page defaults are driven by the Payload REST API's own `limit`
 * query param. If a caller sets a very small page size (via `limit`, or by
 * accident via a raw `params.limit`) on a large collection, pagination will
 * otherwise silently fire one request per remaining page.
 */
export const PAGE_COUNT_WARNING_THRESHOLD = 20

/** How often (in fetched pages) to log a progress summary for a single collection/locale fetch. */
export const PROGRESS_LOG_INTERVAL = 10

/**
 * Default request timeout in milliseconds (see axios-instance.ts). Without a
 * timeout, a stalled connection never fails, so it's never retried and the
 * build never gives up on it - the only backstop becomes whatever external
 * timeout a CI platform enforces, which is both far too long to be useful and
 * outside this plugin's control.
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30000

/**
 * The IDs for your errors can be arbitrary (since they are scoped to your plugin), but it's good practice to have a system for them.
 * For example, you could start all third-party API errors with 1000x, all transformation errors with 2000x, etc.
 */
export const ERROR_CODES = {
  GraphQLSourcing: `10000`,
} as const
