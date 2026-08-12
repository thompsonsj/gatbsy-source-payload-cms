import axiosRetry from "axios-retry"
import { createAxiosInstance } from "../axios-instance"
import { DEFAULT_MAX_PARALLEL_REQUESTS } from "../constants"

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

    it(`defaults maxParallelRequests to a bounded value rather than unlimited`, async () => {
      const instance = createAxiosInstance({})
      const requestInterceptor = (instance.interceptors.request as any).handlers[0].fulfilled

      const resolvedCount = { current: 0 }
      // Intentionally not awaited as a whole - the request beyond the default
      // limit never resolves in this test, since nothing frees its slot.
      Array.from({ length: DEFAULT_MAX_PARALLEL_REQUESTS + 1 }, (_, index) =>
        requestInterceptor({ url: `/${index}` }).then(() => {
          resolvedCount.current += 1
        })
      )

      await jest.advanceTimersByTimeAsync(50)

      // Exactly the default number of slots are available; one request must still be queued.
      expect(resolvedCount.current).toEqual(DEFAULT_MAX_PARALLEL_REQUESTS)
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
