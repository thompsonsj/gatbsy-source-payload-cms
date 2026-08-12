import axiosRetry from "axios-retry"
import { createAxiosInstance } from "../axios-instance"

jest.mock(`axios-retry`, () => {
  const mockAxiosRetry = jest.fn()
  ;(mockAxiosRetry as any).isRetryableError = jest.fn()
  return mockAxiosRetry
})

describe(`createAxiosInstance`, () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it(`sets no Authorization header when no accessToken is given`, () => {
    const instance = createAxiosInstance({})
    expect(instance.defaults.headers.Authorization).toBeUndefined()
  })

  it(`defaults the Authorization header to the "users" slug`, () => {
    const instance = createAxiosInstance({ accessToken: `secret-token` })
    expect(instance.defaults.headers.Authorization).toEqual(`users API-Key secret-token`)
  })

  it(`uses accessCollectionSlug in the Authorization header when given`, () => {
    const instance = createAxiosInstance({ accessToken: `secret-token`, accessCollectionSlug: `admins` })
    expect(instance.defaults.headers.Authorization).toEqual(`admins API-Key secret-token`)
  })

  it(`sets the baseURL from apiURL`, () => {
    const instance = createAxiosInstance({ apiURL: `http://localhost:3000/api` })
    expect(instance.defaults.baseURL).toEqual(`http://localhost:3000/api`)
  })

  it(`does not configure axios-retry when retries is not set`, () => {
    createAxiosInstance({})
    expect(axiosRetry).not.toHaveBeenCalled()
  })

  it(`configures axios-retry with the given retry count when retries is set`, () => {
    createAxiosInstance({ retries: 3 })
    expect(axiosRetry).toHaveBeenCalledTimes(1)
    const [, config] = (axiosRetry as unknown as jest.Mock).mock.calls[0]
    expect(config.retries).toEqual(3)
    expect(config.retryCondition).toBe((axiosRetry as any).isRetryableError)
  })

  it(`always attaches a throttling request interceptor`, () => {
    const instance = createAxiosInstance({})
    expect((instance.interceptors.request as any).handlers).toHaveLength(1)
    expect((instance.interceptors.response as any).handlers).toHaveLength(1)
  })

  describe(`throttling`, () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it(`resolves immediately when under the parallel request limit`, async () => {
      const instance = createAxiosInstance({ maxParallelRequests: 2 })
      const requestInterceptor = (instance.interceptors.request as any).handlers[0].fulfilled

      const config = { url: `/foo` }
      const resolved = jest.fn()
      requestInterceptor(config).then(resolved)

      await jest.advanceTimersByTimeAsync(50)

      expect(resolved).toHaveBeenCalledWith(config)
    })

    it(`defaults maxParallelRequests to unbounded, matching pre-1.1.2 behavior`, async () => {
      // Regression test for a bug shipped in 1.1.2: defaulting this to a bounded
      // value (10) turned a wide sourcing job (many collections x locales,
      // ~300+ concurrent page-1 requests in one real-world report) that
      // previously completed in one throttling "tick" into one that serialized
      // into dozens of sequential batches, with no config change on the
      // consumer's end. Reverted in 1.1.3 - this asserts the default stays
      // unbounded so that regression can't silently reappear.
      const instance = createAxiosInstance({})
      const requestInterceptor = (instance.interceptors.request as any).handlers[0].fulfilled

      const REQUEST_COUNT = 300
      const resolvedCount = { current: 0 }
      Array.from({ length: REQUEST_COUNT }, (_, index) =>
        requestInterceptor({ url: `/${index}` }).then(() => {
          resolvedCount.current += 1
        })
      )

      // A single throttling interval tick is enough to resolve every request
      // when concurrency is unbounded - none of them should still be queued.
      await jest.advanceTimersByTimeAsync(50)

      expect(resolvedCount.current).toEqual(REQUEST_COUNT)
    })

    it(`queues requests beyond the parallel limit until a slot frees up`, async () => {
      const instance = createAxiosInstance({ maxParallelRequests: 1 })
      const requestInterceptor = (instance.interceptors.request as any).handlers[0].fulfilled
      const responseInterceptor = (instance.interceptors.response as any).handlers[0].fulfilled

      const firstResolved = jest.fn()
      const secondResolved = jest.fn()

      requestInterceptor({ url: `/first` }).then(firstResolved)
      await jest.advanceTimersByTimeAsync(50)
      expect(firstResolved).toHaveBeenCalledTimes(1)

      requestInterceptor({ url: `/second` }).then(secondResolved)
      await jest.advanceTimersByTimeAsync(50)
      // Slot is taken by the first request; the second should still be queued.
      expect(secondResolved).not.toHaveBeenCalled()

      // Completing the first request frees up a slot.
      await responseInterceptor({ data: `first-response` })
      await jest.advanceTimersByTimeAsync(50)
      expect(secondResolved).toHaveBeenCalledTimes(1)
    })

    it(`also frees up a slot when a request fails`, async () => {
      const instance = createAxiosInstance({ maxParallelRequests: 1 })
      const requestInterceptor = (instance.interceptors.request as any).handlers[0].fulfilled
      const responseErrorInterceptor = (instance.interceptors.response as any).handlers[0].rejected

      const firstResolved = jest.fn()
      const secondResolved = jest.fn()

      requestInterceptor({ url: `/first` }).then(firstResolved)
      await jest.advanceTimersByTimeAsync(50)
      expect(firstResolved).toHaveBeenCalledTimes(1)

      requestInterceptor({ url: `/second` }).then(secondResolved)
      await jest.advanceTimersByTimeAsync(50)
      expect(secondResolved).not.toHaveBeenCalled()

      await expect(responseErrorInterceptor(new Error(`request failed`))).rejects.toThrow(`request failed`)
      await jest.advanceTimersByTimeAsync(50)
      expect(secondResolved).toHaveBeenCalledTimes(1)
    })
  })

  describe(`retryDelay`, () => {
    it(`grows exponentially with the retry number, plus jitter under 1000ms`, () => {
      createAxiosInstance({ retries: 3 })
      const [, config] = (axiosRetry as unknown as jest.Mock).mock.calls[0]

      jest.spyOn(Math, `random`).mockReturnValue(0)
      expect(config.retryDelay(0)).toEqual(1000)
      expect(config.retryDelay(1)).toEqual(2000)
      expect(config.retryDelay(2)).toEqual(4000)

      jest.spyOn(Math, `random`).mockReturnValue(0.5)
      expect(config.retryDelay(0)).toEqual(1500)

      jest.restoreAllMocks()
    })
  })
})
