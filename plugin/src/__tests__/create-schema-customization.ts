import { createSchemaCustomization } from "../create-schema-customization"
import { createAxiosInstance } from "../axios-instance"
import { ERROR_CODES } from "../constants"

jest.mock(`../axios-instance`, () => ({
  createAxiosInstance: jest.fn(),
}))

const mockedCreateAxiosInstance = createAxiosInstance as jest.MockedFunction<typeof createAxiosInstance>

const call = async (
  createTypes: jest.Mock,
  pluginOptions: { [key: string]: unknown },
  extras: {
    reporter?: { [key: string]: jest.Mock }
    schema?: { buildUnionType: jest.Mock }
  } = {}
) => {
  const reporter = extras.reporter || { panic: jest.fn(), verbose: jest.fn() }
  const schema = extras.schema || {
    buildUnionType: jest.fn((config) => ({ kind: `UNION`, ...config })),
  }
  await (createSchemaCustomization as any)(
    { actions: { createTypes }, reporter, schema },
    pluginOptions,
    jest.fn()
  )
  return { reporter, schema }
}

describe(`createSchemaCustomization`, () => {
  let createTypes: jest.Mock

  beforeEach(() => {
    createTypes = jest.fn()
    mockedCreateAxiosInstance.mockReset()
  })

  it(`does not create any types when imageCdn and schema options are unset`, async () => {
    await call(createTypes, {})
    expect(createTypes).not.toHaveBeenCalled()
  })

  it(`creates the Asset type when imageCdn is set, even with no uploadTypes`, async () => {
    await call(createTypes, { imageCdn: true })

    expect(createTypes).toHaveBeenCalledTimes(1)
    const [schemaCustomizations] = createTypes.mock.calls[0]
    expect(schemaCustomizations).toHaveLength(1)
    expect(schemaCustomizations[0]).toContain(`type Asset implements Node & RemoteFile`)
  })

  it(`adds a gatsbyImageCdn field per upload type, using the default Payload prefix`, async () => {
    await call(createTypes, {
      imageCdn: true,
      uploadTypes: [`headshots`],
      endpoint: `http://localhost:8000/api/`,
    })

    const [schemaCustomizations] = createTypes.mock.calls[0]
    expect(schemaCustomizations).toHaveLength(2)
    expect(schemaCustomizations[1]).toContain(`type PayloadHeadshot implements Node`)
    expect(schemaCustomizations[1]).toContain(`gatsbyImageCdn: Asset @link`)
  })

  it(`uses a custom nodePrefix when given`, async () => {
    await call(createTypes, {
      imageCdn: true,
      uploadTypes: [`headshots`],
      endpoint: `http://localhost:8000/api/`,
      nodePrefix: `CMS`,
    })

    const [schemaCustomizations] = createTypes.mock.calls[0]
    expect(schemaCustomizations[1]).toContain(`type CMSHeadshot implements Node`)
  })

  it(`registers static schemaCustomizations SDL`, async () => {
    const sdl = `type LandingPage implements Node { title: String }`
    await call(createTypes, { schemaCustomizations: sdl })

    expect(mockedCreateAxiosInstance).not.toHaveBeenCalled()
    expect(createTypes).toHaveBeenCalledTimes(1)
    expect(createTypes.mock.calls[0][0]).toContain(sdl)
  })

  it(`registers static schemaUnions as Type Builders`, async () => {
    const sdl = `union LandingPage_Layout = ContentLayout | Cards`
    const { schema } = await call(createTypes, {
      schemaCustomizations: sdl,
      schemaUnions: [
        {
          name: `LandingPage_Layout`,
          types: [`ContentLayout`, `Cards`],
          typeMap: { contentLayout: `ContentLayout`, cards: `Cards` },
        },
      ],
    })

    expect(schema.buildUnionType).toHaveBeenCalledWith(
      expect.objectContaining({
        name: `LandingPage_Layout`,
        types: [`ContentLayout`, `Cards`],
        resolveType: expect.any(Function),
      })
    )
    const resolveType = schema.buildUnionType.mock.calls[0][0].resolveType
    expect(resolveType({ blockType: `cards` })).toEqual(`Cards`)
  })

  it(`prefers schemaCustomizations over fetchSchema`, async () => {
    const sdl = `type LandingPage implements Node { title: String }`
    await call(createTypes, {
      endpoint: `http://localhost:8000/api/`,
      schemaCustomizations: sdl,
      fetchSchema: true,
    })

    expect(mockedCreateAxiosInstance).not.toHaveBeenCalled()
    expect(createTypes.mock.calls[0][0]).toContain(sdl)
  })

  it(`fetches a JSON schema bundle when fetchSchema is true`, async () => {
    const sdl = `type LandingPage implements Node { title: String }`
    const get = jest.fn().mockResolvedValue({
      data: {
        version: 1,
        sdl,
        unions: [
          {
            name: `LandingPage_Layout`,
            types: [`ContentLayout`, `Cards`],
            typeMap: { contentLayout: `ContentLayout`, cards: `Cards` },
          },
        ],
      },
    })
    mockedCreateAxiosInstance.mockReturnValue({ get } as any)

    const { schema } = await call(createTypes, {
      endpoint: `http://localhost:8000/api/`,
      fetchSchema: true,
    })

    expect(get).toHaveBeenCalledWith(
      `http://localhost:8000/api/gatsby-schema-types`,
      expect.objectContaining({
        headers: { Accept: `application/json` },
        params: { format: `json` },
      })
    )
    expect(createTypes.mock.calls[0][0]).toContain(sdl)
    expect(schema.buildUnionType).toHaveBeenCalledWith(
      expect.objectContaining({ name: `LandingPage_Layout` })
    )
  })

  it(`accepts a plain-text SDL response for backward compatibility`, async () => {
    const sdl = `type LandingPage implements Node { title: String }`
    const get = jest.fn().mockResolvedValue({ data: sdl })
    mockedCreateAxiosInstance.mockReturnValue({ get } as any)

    const { schema } = await call(createTypes, {
      endpoint: `http://localhost:8000/api/`,
      fetchSchema: true,
    })

    expect(createTypes.mock.calls[0][0]).toContain(sdl)
    expect(schema.buildUnionType).not.toHaveBeenCalled()
  })

  it(`uses a custom schemaPath when fetching`, async () => {
    const get = jest.fn().mockResolvedValue({
      data: { version: 1, sdl: `type X implements Node { id: ID }`, unions: [] },
    })
    mockedCreateAxiosInstance.mockReturnValue({ get } as any)

    await call(createTypes, {
      endpoint: `http://localhost:8000/api`,
      fetchSchema: true,
      schemaPath: `/custom-schema`,
    })

    expect(get).toHaveBeenCalledWith(`http://localhost:8000/api/custom-schema`, expect.any(Object))
  })

  it(`panics when the schema fetch fails`, async () => {
    const get = jest.fn().mockRejectedValue(new Error(`connect ECONNREFUSED`))
    mockedCreateAxiosInstance.mockReturnValue({ get } as any)

    const { reporter } = await call(createTypes, {
      endpoint: `http://localhost:8000/api/`,
      fetchSchema: true,
    })

    expect(reporter.panic).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ERROR_CODES.SchemaCustomization,
        context: expect.objectContaining({
          sourceMessage: expect.stringContaining(`Failed to fetch schema SDL`),
        }),
      })
    )
  })

  it(`still emits image CDN types alongside fetched SDL`, async () => {
    const sdl = `type LandingPage implements Node { title: String }`
    const get = jest.fn().mockResolvedValue({
      data: { version: 1, sdl, unions: [] },
    })
    mockedCreateAxiosInstance.mockReturnValue({ get } as any)

    await call(createTypes, {
      endpoint: `http://localhost:8000/api/`,
      fetchSchema: true,
      imageCdn: true,
      uploadTypes: [`headshots`],
    })

    const [types] = createTypes.mock.calls[0]
    expect(types.some((t: unknown) => typeof t === `string` && t.includes(`type Asset implements Node`))).toBe(
      true
    )
    expect(types).toContain(sdl)
  })
})
