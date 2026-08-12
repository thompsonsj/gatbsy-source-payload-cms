import { fetchEntity, fetchEntities } from "../fetch"

const buildContext = (pluginOptions: { [key: string]: unknown } = {}) => ({
  axiosInstance: jest.fn(),
  reporter: {
    info: jest.fn(),
    panic: jest.fn(),
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
})
