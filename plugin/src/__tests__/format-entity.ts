import { formatEntity } from "../format-entity"

describe(`formatEntity`, () => {
  it(`adds reserved properties without transforming when no nodeTransform is set`, () => {
    const context = { pluginOptions: {} }

    expect(formatEntity({ data: { id: `1`, title: `Hello` }, gatsbyNodeType: `Post` }, context)).toEqual({
      id: `1`,
      title: `Hello`,
      gatsbyNodeType: `Post`,
      payloadImageSize: undefined,
    })
  })

  it(`adds a locale key when locale is given`, () => {
    const context = { pluginOptions: {} }

    expect(
      formatEntity({ data: { id: `1` }, gatsbyNodeType: `Post`, locale: `en` }, context)
    ).toEqual({
      id: `1`,
      gatsbyNodeType: `Post`,
      locale: `en`,
      payloadImageSize: undefined,
    })
  })

  it(`runs data through nodeTransform when it is a function`, () => {
    const context = {
      pluginOptions: {
        nodeTransform: (data: { [key: string]: unknown }) => ({ ...data, transformed: true }),
      },
    }

    expect(formatEntity({ data: { id: `1` }, gatsbyNodeType: `Post` }, context)).toEqual({
      id: `1`,
      transformed: true,
      gatsbyNodeType: `Post`,
      payloadImageSize: undefined,
    })
  })

  it(`uses data as-is when nodeTransform is set but is not a function`, () => {
    const context = { pluginOptions: { nodeTransform: `not-a-function` } }

    expect(formatEntity({ data: { id: `1` }, gatsbyNodeType: `Post` }, context)).toEqual({
      id: `1`,
      gatsbyNodeType: `Post`,
      payloadImageSize: undefined,
    })
  })
})
