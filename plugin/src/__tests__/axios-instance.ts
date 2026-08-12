import axiosRetry from "axios-retry"
import { createAxiosInstance } from "../axios-instance"
import { DEFAULT_REQUEST_TIMEOUT_MS } from "../constants"

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
    expect(config.retryCondition).toBeInstanceOf(Function)
    // Without this, axios-retry treats the request's timeout as a total budget
    // across the initial attempt + delay + retry, and silently abandons any
    // retry of a request that failed by timing out (elapsed time ≈ its own
    // timeout, so the "remaining" budget it computes is always <= 0) -
    // regardless of what retryCondition says. See axios-instance-hung-connection.ts
    // for the real-server test this exists to make actually work end to end.
    expect(config.shouldResetTimeout).toBe(true)
  })

  it(`always attaches a throttling request interceptor`, () => {
    const instance = createAxiosInstance({})
    expect((instance.interceptors.request as any).handlers).toHaveLength(1)
    expect((instance.interceptors.response as any).handlers).toHaveLength(1)
  })

  describe(`requestTimeout`, () => {
    it(`defaults the request timeout to DEFAULT_REQUEST_TIMEOUT_MS`, () => {
      // Without a timeout, a stalled connection never fails - so it never gets
      // retried, and nothing on the client side ever gives up on it.
      const instance = createAxiosInstance({})
      expect(instance.defaults.timeout).toEqual(DEFAULT_REQUEST_TIMEOUT_MS)
    })

    it(`honors a configured requestTimeout`, () => {
      const instance = createAxiosInstance({ requestTimeout: 5000 })
      expect(instance.defaults.timeout).toEqual(5000)
    })

    it.each([0, -1, -100])(
      `falls back to the default when requestTimeout is %i (Joi rejects this, but the runtime shouldn't silently disable the timeout either)`,
      (invalidValue) => {
        const instance = createAxiosInstance({ requestTimeout: invalidValue })
        expect(instance.defaults.timeout).toEqual(DEFAULT_REQUEST_TIMEOUT_MS)
      }
    )
  })

  describe(`retryCondition`, () => {
    it(`treats a timed-out request (ECONNABORTED) as retryable, unlike axios-retry's own default`, () => {
      // axios-retry's isRetryableError explicitly excludes ECONNABORTED
      // ("Prevents retrying timed out requests") - for this plugin, a request
      // that timed out against a possibly transiently-slow Payload instance is
      // exactly the case we DO want retried, so this overrides that default.
      ;(axiosRetry.isRetryableError as jest.Mock).mockReturnValue(false)
      createAxiosInstance({ retries: 3 })
      const [, config] = (axiosRetry as unknown as jest.Mock).mock.calls[0]

      expect(config.retryCondition({ code: `ECONNABORTED` })).toBe(true)
    })

    it(`still delegates to axios-retry's own logic for non-timeout errors`, () => {
      ;(axiosRetry.isRetryableError as jest.Mock).mockReturnValue(false)
      createAxiosInstance({ retries: 3 })
      const [, config] = (axiosRetry as unknown as jest.Mock).mock.calls[0]

      expect(config.retryCondition({ response: { status: 404 } })).toBe(false)

      ;(axiosRetry.isRetryableError as jest.Mock).mockReturnValue(true)
      expect(config.retryCondition({ response: { status: 503 } })).toBe(true)
    })
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

    it.each([0, -1, -100])(
      `does not deadlock when maxParallelRequests is %i (Joi rejects this, but the runtime shouldn't hang either)`,
      async (invalidValue) => {
        const instance = createAxiosInstance({ maxParallelRequests: invalidValue })
        const requestInterceptor = (instance.interceptors.request as any).handlers[0].fulfilled

        const resolved = jest.fn()
        requestInterceptor({ url: `/foo` }).then(resolved)

        await jest.advanceTimersByTimeAsync(50)

        expect(resolved).toHaveBeenCalled()
      }
    )

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
