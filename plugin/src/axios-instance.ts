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
  const { maxParallelRequests = Number.POSITIVE_INFINITY, accessToken, apiURL } = pluginConfig

  const headers: { [key: string]: string } = {}

  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`
  }

  const instance = axios.create({
    baseURL: apiURL,
    headers,
  })

  if (pluginConfig.retries) {
    axiosRetry(instance, {
      retries: pluginConfig.retries,
      retryDelay: axiosRetry.exponentialDelay,
    })
  }

  /** Add throttling interceptors */
  throttlingInterceptors(instance, maxParallelRequests)

  return instance
}
