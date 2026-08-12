import axios from "axios"
import axiosRetry from "axios-retry"

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

  const headers: { [key: string]: string } = {}

  if (accessToken) {
    headers.Authorization = `${accessCollectionSlug || 'users'} API-Key ${accessToken}`
  }

  const instance = axios.create({
    baseURL: apiURL,
    headers,
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
      // retry on Network Error & 5xx responses
      retryCondition: axiosRetry.isRetryableError,
    })
  }

  /** Add throttling interceptors */
  throttlingInterceptors(instance, maxParallelRequests)

  return instance
}
