import axios from "axios"
import axiosRetry from "axios-retry"
import { DEFAULT_MAX_PARALLEL_REQUESTS } from "./constants"

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
    // Unbounded concurrency on a large fetch can overwhelm the origin API or the
    // build machine. Raising this (or a smaller `limit`/larger page size) trades
    // memory/API load for wall-clock time — see the README for the tradeoff.
    maxParallelRequests = DEFAULT_MAX_PARALLEL_REQUESTS,
    accessToken,
    accessCollectionSlug,
    apiURL,
  } = pluginConfig

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
