import axios from "axios"
import axiosRetry from "axios-retry"
import { DEFAULT_REQUEST_TIMEOUT_MS } from "./constants"

/**
 * axios-retry's own isRetryableError explicitly excludes ECONNABORTED (timeout)
 * errors - "Prevents retrying timed out requests" - a deliberate default on its
 * part. For this plugin, a request that timed out against a possibly
 * transiently-slow Payload instance is exactly the case we want retried, so
 * this is a superset: everything axios-retry's own logic treats as retryable,
 * plus timeouts.
 */
const isRetryableIncludingTimeouts = (error): boolean => {
  return error.code === `ECONNABORTED` || axiosRetry.isRetryableError(error)
}

/**
 * Inspiration from:
 * https://gist.github.com/matthewsuan/2bdc9e7f459d5b073d58d1ebc0613169
 */
const throttlingInterceptors = (axiosInstance, maxParallelRequests) => {
  const INTERVAL_MS = 50 // Wait time until retrying request
  let PENDING_REQUESTS = 0

  /** Axios Request Interceptor */
  axiosInstance.interceptors.request.use(function (config) {
    return new Promise((resolve, _) => {
      const interval = setInterval(() => {
        if (PENDING_REQUESTS < maxParallelRequests) {
          PENDING_REQUESTS++
          clearInterval(interval)
          resolve(config)
        }
      }, INTERVAL_MS)
    })
  })

  /** Axios Response Interceptor */
  axiosInstance.interceptors.response.use(
    function (response) {
      PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1)
      return Promise.resolve(response)
    },
    function (error) {
      PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1)
      return Promise.reject(error)
    }
  )
}

export const createAxiosInstance = (pluginConfig) => {
  const {
    // Unbounded by default, matching pre-1.1.2 behavior - this is an opt-in knob,
    // not something existing consumers should have to set to avoid a regression.
    // Setting it can help large/wide sourcing operations avoid overwhelming the
    // origin API or the build machine, at the cost of wall-clock time — see the
    // README for the tradeoff.
    maxParallelRequests: configuredMaxParallelRequests = Number.POSITIVE_INFINITY,
    // Without a timeout, a stalled connection (no RST/FIN, a black-holed
    // response, a proxy silently dropping the connection) never fails - so it
    // never gets retried, and nothing on the client side ever gives up on it.
    // The only backstop becomes whatever external timeout a CI platform
    // enforces, which is both far too long to be useful and outside this
    // plugin's control.
    requestTimeout: configuredRequestTimeout = DEFAULT_REQUEST_TIMEOUT_MS,
    accessToken,
    accessCollectionSlug,
    apiURL,
  } = pluginConfig

  // The plugin options schema already rejects values below 1 - this is a
  // second line of defense so a bad value can never deadlock every request
  // waiting for a free slot that can never exist, even if schema validation
  // is bypassed (e.g. createAxiosInstance called directly).
  const maxParallelRequests =
    isFinite(configuredMaxParallelRequests) && configuredMaxParallelRequests >= 1
      ? configuredMaxParallelRequests
      : Number.POSITIVE_INFINITY

  // Same defense-in-depth as maxParallelRequests above: a value of 0 is
  // axios's own convention for "no timeout", which would silently reintroduce
  // the exact hang this option exists to prevent.
  const requestTimeout =
    isFinite(configuredRequestTimeout) && configuredRequestTimeout >= 1
      ? configuredRequestTimeout
      : DEFAULT_REQUEST_TIMEOUT_MS

  const headers: { [key: string]: string } = {}

  if (accessToken) {
    headers.Authorization = `${accessCollectionSlug || 'users'} API-Key ${accessToken}`
  }

  const instance = axios.create({
    baseURL: apiURL,
    headers,
    timeout: requestTimeout,
  })
  if (pluginConfig.retries) {
    // https://github.com/softonic/axios-retry/issues/87
    const retryDelay = (retryNumber = 0) => {
      const seconds = Math.pow(2, retryNumber) * 1000
      const randomMs = 1000 * Math.random()
      return seconds + randomMs
    }

    axiosRetry(instance, {
      retries: pluginConfig.retries,
      retryDelay,
      // Retry on network errors, 5xx responses, and timeouts (see
      // isRetryableIncludingTimeouts above for why timeouts are included).
      retryCondition: isRetryableIncludingTimeouts,
      // Without this, axios-retry treats the original request's `timeout` as a
      // TOTAL budget shared across the initial attempt + delay + retry, not a
      // per-attempt timeout: it computes `config.timeout - elapsedTime - delay`
      // as the "remaining" timeout for the retry, and silently abandons the
      // retry if that's <= 0. A request that failed BY timing out has elapsed
      // time ≈ its own timeout, so that's always negative - meaning a timed-out
      // request could never actually be retried regardless of retryCondition,
      // even with the override above. shouldResetTimeout gives each retry its
      // own fresh timeout instead.
      shouldResetTimeout: true,
    })
  }

  /** Add throttling interceptors */
  throttlingInterceptors(instance, maxParallelRequests)

  return instance
}
