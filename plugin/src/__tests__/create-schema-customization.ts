import { createSchemaCustomization } from "../create-schema-customization"

const call = (createTypes: jest.Mock, pluginOptions: { [key: string]: unknown }) =>
  (createSchemaCustomization as any)({ actions: { createTypes } }, pluginOptions, jest.fn())

describe(`createSchemaCustomization`, () => {
  let createTypes: jest.Mock

  beforeEach(() => {
    createTypes = jest.fn()
  })

  it(`does not create any types when imageCdn is not set`, () => {
    call(createTypes, {})
    expect(createTypes).not.toHaveBeenCalled()
  })

  it(`creates the Asset type when imageCdn is set, even with no uploadTypes`, () => {
    call(createTypes, { imageCdn: true })

    expect(createTypes).toHaveBeenCalledTimes(1)
    const [schemaCustomizations] = createTypes.mock.calls[0]
    expect(schemaCustomizations).toHaveLength(1)
    expect(schemaCustomizations[0]).toContain(`type Asset implements Node & RemoteFile`)
  })

  it(`adds a gatsbyImageCdn field per upload type, using the default Payload prefix`, () => {
    call(createTypes, { imageCdn: true, uploadTypes: [`headshots`], endpoint: `http://localhost:8000/api/` })

    const [schemaCustomizations] = createTypes.mock.calls[0]
    expect(schemaCustomizations).toHaveLength(2)
    expect(schemaCustomizations[1]).toContain(`type PayloadHeadshot implements Node`)
    expect(schemaCustomizations[1]).toContain(`gatsbyImageCdn: Asset @link`)
  })

  it(`uses a custom nodePrefix when given`, () => {
    call(createTypes, {
      imageCdn: true,
      uploadTypes: [`headshots`],
      endpoint: `http://localhost:8000/api/`,
      nodePrefix: `CMS`,
    })

    const [schemaCustomizations] = createTypes.mock.calls[0]
    expect(schemaCustomizations[1]).toContain(`type CMSHeadshot implements Node`)
  })
})
