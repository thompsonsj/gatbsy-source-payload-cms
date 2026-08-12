import { fetchEntity, fetchEntities } from "../fetch"

const buildContext = (pluginOptions: { [key: string]: unknown } = {}) => ({
  axiosInstance: jest.fn(),
  reporter: {
    info: jest.fn(),
    panic: jest.fn(),
    warn: jest.fn(),
  },
  pluginOptions,
})

describe(`fetchEntity`, () => {
  it(`fetches a single entity and formats it when no locales are defined`, async () => {
    const context = buildContext()
    context.axiosInstance.mockResolvedValueOnce({ data: { id: `1`, title: `Hello` } })

    const result = await fetchEntity({ endpoint: `http://localhost/api/home`, type: `Home` }, context)

    expect(context.axiosInstance).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ id: `1`, title: `Hello`, gatsbyNodeType: `Home`, payloadImageSize: undefined }])
  })

  it(`fetches once per locale and adds a locale key to each result`, async () => {
    const context = buildContext({ fallbackLocale: `en` })
    context.axiosInstance.mockImplementation(async ({ params }) => ({
      data: { id: `1`, title: `Title-${params.locale}` },
    }))

    const result = await fetchEntity(
      { endpoint: `http://localhost/api/home`, type: `Home`, locales: [`en`, `fr`] },
      context
    )

    expect(context.axiosInstance).toHaveBeenCalledTimes(2)
    expect(context.axiosInstance.mock.calls[0][0].params).toEqual(
      expect.objectContaining({ locale: `en`, fallbackLocale: `en` })
    )
    expect(result).toEqual([
      { id: `1`, title: `Title-en`, gatsbyNodeType: `Home`, locale: `en`, payloadImageSize: undefined },
      { id: `1`, title: `Title-fr`, gatsbyNodeType: `Home`, locale: `fr`, payloadImageSize: undefined },
    ])
  })

  it(`merges locale-specific params when a locale is defined as an object`, async () => {
    const context = buildContext()
    context.axiosInstance.mockResolvedValueOnce({ data: { id: `1` } })

    await fetchEntity(
      {
        endpoint: `http://localhost/api/home`,
        type: `Home`,
        locales: [{ locale: `en`, params: { depth: 5 } }],
      },
      context
    )

    expect(context.axiosInstance.mock.calls[0][0].params).toEqual(
      expect.objectContaining({ locale: `en`, depth: 5 })
    )
  })

  it(`swallows 404 errors and returns an empty array without panicking`, async () => {
    const context = buildContext()
    context.axiosInstance.mockRejectedValueOnce({ response: { status: 404 } })

    const result = await fetchEntity({ endpoint: `http://localhost/api/home`, type: `Home` }, context)

    expect(result).toEqual([])
    expect(context.reporter.panic).not.toHaveBeenCalled()
  })

  it(`panics on non-404 errors`, async () => {
    const context = buildContext()
    context.axiosInstance.mockRejectedValueOnce({ response: { status: 500 } })

    await fetchEntity({ endpoint: `http://localhost/api/home`, type: `Home` }, context)

    expect(context.reporter.panic).toHaveBeenCalledTimes(1)
  })

  it(`panics gracefully on network-level errors that have no "response" at all`, async () => {
    const context = buildContext()
    // A real axios network error (DNS failure, connection refused, timeout) has
    // no `.response` - only HTTP error responses do.
    context.axiosInstance.mockRejectedValueOnce(new Error(`Network Error`))

    const result = await fetchEntity({ endpoint: `http://localhost/api/home`, type: `Home` }, context)

    expect(context.reporter.panic).toHaveBeenCalledTimes(1)
    expect(result).toEqual([])
  })
})

describe(`fetchEntities`, () => {
  it(`paginates through all remaining pages when no limit is set`, async () => {
    const context = buildContext()
    const pages = {
      1: { docs: [{ id: 1 }], page: 1, totalPages: 3 },
      2: { docs: [{ id: 2 }] },
      3: { docs: [{ id: 3 }] },
    }
    context.axiosInstance.mockImplementation(async ({ params }) => ({ data: pages[params?.page ?? 1] }))

    const result = await fetchEntities({ endpoint: `http://localhost/api/posts`, type: `Post` }, context)

    expect(context.axiosInstance).toHaveBeenCalledTimes(3)
    expect(result.map((entity) => entity.id)).toEqual([1, 2, 3])
  })

  it(`drops null/falsy entries in the first page's own docs, not just later pages`, async () => {
    const context = buildContext()
    // A malformed or partially-corrupted API response could contain a null
    // entry in `docs` (e.g. a dangling/broken relationship expansion). Only
    // pages fetched *beyond* the first were being defended against this -
    // the first page's own docs were passed straight through to formatEntity.
    context.axiosInstance.mockResolvedValueOnce({
      data: { docs: [{ id: 1 }, null, { id: 2 }], page: 1, totalPages: 1 },
    })

    const result = await fetchEntities({ endpoint: `http://localhost/api/posts`, type: `Post` }, context)

    expect(result.map((entity: any) => entity.id)).toEqual([1, 2])
  })

  it(`does not paginate when a limit is provided`, async () => {
    const context = buildContext()
    context.axiosInstance.mockResolvedValueOnce({
      data: { docs: [{ id: 1 }, { id: 2 }], page: 1, totalPages: 5 },
    })

    const result = await fetchEntities({ endpoint: `http://localhost/api/posts`, type: `Post`, limit: 2 }, context)

    expect(context.axiosInstance).toHaveBeenCalledTimes(1)
    expect(context.axiosInstance.mock.calls[0][0].params).toEqual(expect.objectContaining({ limit: 2 }))
    expect(result.map((entity) => entity.id)).toEqual([1, 2])
  })

  it(`always fetches page 1 per locale, tagging results with their locale`, async () => {
    const context = buildContext()
    context.axiosInstance.mockImplementation(async ({ params }) => {
      if (!params.locale) {
        return { data: { docs: [], page: 1, totalPages: 1 } }
      }
      return { data: { docs: [{ id: `${params.locale}-doc` }] } }
    })

    const result = await fetchEntities(
      { endpoint: `http://localhost/api/posts`, type: `Post`, locales: [`en`, `fr`] },
      context
    )

    // 1 unlocalized call to determine pagination + 1 page-1 call per locale
    expect(context.axiosInstance).toHaveBeenCalledTimes(3)
    expect(result.map((entity) => ({ id: entity.id, locale: entity.locale }))).toEqual([
      { id: `en-doc`, locale: `en` },
      { id: `fr-doc`, locale: `fr` },
    ])
  })

  it(`repopulates each document individually when repopulate is set`, async () => {
    const context = buildContext()
    context.axiosInstance.mockImplementation(async ({ url, params }) => {
      if (!params.locale) {
        return { data: { docs: [], page: 1, totalPages: 1 } }
      }
      if (url.endsWith(`/a`) || url.endsWith(`/b`)) {
        return { data: { id: url.split(`/`).pop(), title: `Full ${url.split(`/`).pop()}` } }
      }
      return { data: { docs: [{ id: `a` }, { id: `b` }] } }
    })

    const result = await fetchEntities(
      {
        endpoint: `http://localhost/api/posts`,
        type: `Post`,
        locales: [`en`],
        limit: 10,
        repopulate: true,
      },
      context
    )

    const repopulateCalls = context.axiosInstance.mock.calls.filter(([options]) => /\/(a|b)$/.test(options.url))
    expect(repopulateCalls).toHaveLength(2)
    expect(result.map((entity: any) => entity.title)).toEqual([`Full a`, `Full b`])
    expect(result.every((entity) => entity.locale === `en`)).toBe(true)
  })

  it(`panics and returns an empty array when the initial request fails`, async () => {
    const context = buildContext()
    context.axiosInstance.mockRejectedValueOnce(new Error(`network error`))

    const result = await fetchEntities({ endpoint: `http://localhost/api/posts`, type: `Post` }, context)

    expect(context.reporter.panic).toHaveBeenCalledTimes(1)
    expect(result).toEqual([])
  })

  it(`panics when a non-locale page fetch fails mid-pagination`, async () => {
    const context = buildContext()
    context.axiosInstance.mockImplementation(async ({ params }) => {
      const page = params?.page ?? 1
      if (page === 1) return { data: { docs: [{ id: 1 }], page: 1, totalPages: 2 } }
      throw new Error(`page ${page} failed`)
    })

    const result = await fetchEntities({ endpoint: `http://localhost/api/posts`, type: `Post` }, context)

    // The failed page is reported once and dropped; the successfully fetched page still comes through.
    expect(context.reporter.panic).toHaveBeenCalledTimes(1)
    expect(result.map((entity: any) => entity.id)).toEqual([1])
  })

  it(`panics when a locale page fetch fails mid-pagination`, async () => {
    const context = buildContext()
    context.axiosInstance.mockImplementation(async ({ params }) => {
      if (!params.locale) return { data: { docs: [], page: 1, totalPages: 2 } }
      if (params.page === 1) return { data: { docs: [{ id: 1 }] } }
      throw new Error(`page ${params.page} failed`)
    })

    const result = await fetchEntities(
      { endpoint: `http://localhost/api/posts`, type: `Post`, locales: [`en`] },
      context
    )

    expect(context.reporter.panic).toHaveBeenCalledTimes(1)
    expect(result.map((entity: any) => ({ id: entity.id, locale: entity.locale }))).toEqual([
      { id: 1, locale: `en` },
    ])
  })

  it(`panics when a repopulate fetch fails for an individual document`, async () => {
    const context = buildContext()
    context.axiosInstance.mockImplementation(async ({ url, params }) => {
      if (!params.locale) return { data: { docs: [], page: 1, totalPages: 1 } }
      if (url.endsWith(`/a`)) throw new Error(`doc a failed`)
      if (url.endsWith(`/b`)) return { data: { id: `b`, title: `Full b` } }
      return { data: { docs: [{ id: `a` }, { id: `b` }] } }
    })

    const result = await fetchEntities(
      { endpoint: `http://localhost/api/posts`, type: `Post`, locales: [`en`], limit: 10, repopulate: true },
      context
    )

    // Doc "a" fails and is dropped; doc "b" still comes through fully repopulated.
    expect(context.reporter.panic).toHaveBeenCalledTimes(1)
    expect(result.map((entity: any) => entity.title)).toEqual([`Full b`])
  })

  describe(`maxDocs`, () => {
    it(`stops paginating once enough documents have been fetched (no locales)`, async () => {
      const context = buildContext()
      const pages = {
        1: { docs: [{ id: 1 }, { id: 2 }], page: 1, totalPages: 50 },
        2: { docs: [{ id: 3 }, { id: 4 }] },
        3: { docs: [{ id: 5 }, { id: 6 }] },
      }
      context.axiosInstance.mockImplementation(async ({ params }) => ({ data: pages[params?.page ?? 1] }))

      const result = await fetchEntities(
        { endpoint: `http://localhost/api/posts`, type: `Post`, maxDocs: 5 },
        context
      )

      // Page size is 2; reaching 5 docs needs pages 1-3, not all 50.
      expect(context.axiosInstance).toHaveBeenCalledTimes(3)
      expect(result.map((entity: any) => entity.id)).toEqual([1, 2, 3, 4, 5])
    })

    it(`does not fetch any extra pages when the first page already meets maxDocs`, async () => {
      const context = buildContext()
      context.axiosInstance.mockResolvedValueOnce({
        data: { docs: [{ id: 1 }, { id: 2 }, { id: 3 }], page: 1, totalPages: 50 },
      })

      const result = await fetchEntities(
        { endpoint: `http://localhost/api/posts`, type: `Post`, maxDocs: 2 },
        context
      )

      expect(context.axiosInstance).toHaveBeenCalledTimes(1)
      expect(result.map((entity: any) => entity.id)).toEqual([1, 2])
    })

    it(`caps documents per locale, not across all locales combined`, async () => {
      const context = buildContext()
      context.axiosInstance.mockImplementation(async ({ params }) => {
        if (!params.locale) return { data: { docs: [], page: 1, totalPages: 1 } }
        return { data: { docs: [{ id: `${params.locale}-1` }, { id: `${params.locale}-2` }] } }
      })

      const result = await fetchEntities(
        { endpoint: `http://localhost/api/posts`, type: `Post`, locales: [`en`, `fr`], maxDocs: 1 },
        context
      )

      expect(result.map((entity: any) => entity.id)).toEqual([`en-1`, `fr-1`])
    })

    it(`only repopulates the capped subset of documents, saving requests`, async () => {
      const context = buildContext()
      context.axiosInstance.mockImplementation(async ({ url, params }) => {
        if (!params.locale) return { data: { docs: [], page: 1, totalPages: 1 } }
        if (/\/(a|b|c)$/.test(url)) return { data: { id: url.split(`/`).pop() } }
        return { data: { docs: [{ id: `a` }, { id: `b` }, { id: `c` }] } }
      })

      await fetchEntities(
        {
          endpoint: `http://localhost/api/posts`,
          type: `Post`,
          locales: [`en`],
          maxDocs: 1,
          repopulate: true,
        },
        context
      )

      const repopulateCalls = context.axiosInstance.mock.calls.filter(([opts]) => /\/(a|b|c)$/.test(opts.url))
      expect(repopulateCalls).toHaveLength(1)
    })
  })

  describe(`warnings`, () => {
    it(`warns when "limit" is set inside "params" instead of the dedicated option`, async () => {
      const context = buildContext()
      context.axiosInstance.mockResolvedValue({ data: { docs: [{ id: 1 }], page: 1, totalPages: 1 } })

      await fetchEntities(
        { endpoint: `http://localhost/api/posts`, type: `Post`, params: { limit: 1 } },
        context
      )

      expect(context.reporter.warn).toHaveBeenCalledWith(expect.stringContaining(`"limit" was set inside "params"`))
    })

    it(`does not warn about "params.limit" when the dedicated "limit" option is used`, async () => {
      const context = buildContext()
      context.axiosInstance.mockResolvedValue({ data: { docs: [{ id: 1 }], page: 1, totalPages: 1 } })

      await fetchEntities({ endpoint: `http://localhost/api/posts`, type: `Post`, limit: 1 }, context)

      expect(context.reporter.warn).not.toHaveBeenCalled()
    })

    it(`warns before fetching when the number of pages exceeds the safety threshold`, async () => {
      const context = buildContext()
      context.axiosInstance.mockImplementation(async ({ params }) => ({
        data: { docs: [{ id: params?.page ?? 1 }], page: params?.page ?? 1, totalPages: 50 },
      }))

      await fetchEntities({ endpoint: `http://localhost/api/posts`, type: `Post` }, context)

      expect(context.reporter.warn).toHaveBeenCalledWith(expect.stringContaining(`About to fetch 49 page(s)`))
      // The warning must fire before requests go out, not just be true in hindsight.
      const warnCallOrder = context.reporter.warn.mock.invocationCallOrder[0]
      const firstPageTwoCallOrder = context.axiosInstance.mock.invocationCallOrder[1]
      expect(warnCallOrder).toBeLessThan(firstPageTwoCallOrder)
    })

    it(`does not warn when the number of pages is under the safety threshold`, async () => {
      const context = buildContext()
      context.axiosInstance.mockImplementation(async ({ params }) => ({
        data: { docs: [{ id: params?.page ?? 1 }], page: params?.page ?? 1, totalPages: 5 },
      }))

      await fetchEntities({ endpoint: `http://localhost/api/posts`, type: `Post` }, context)

      expect(context.reporter.warn).not.toHaveBeenCalled()
    })
  })

  describe(`progress logging`, () => {
    it(`logs a progress summary every 10 pages, distinct from the per-request debug line`, async () => {
      const context = buildContext()
      context.axiosInstance.mockImplementation(async ({ params }) => ({
        data: { docs: [{ id: params?.page ?? 1 }], page: params?.page ?? 1, totalPages: 25 },
      }))

      await fetchEntities({ endpoint: `http://localhost/api/posts`, type: `Post` }, context)

      const progressLogs = context.reporter.info.mock.calls.filter(([message]) => message.includes(`fetched`))
      expect(progressLogs).toEqual([
        [expect.stringContaining(`fetched 10/24 page(s)`)],
        [expect.stringContaining(`fetched 20/24 page(s)`)],
      ])
    })
  })
})
