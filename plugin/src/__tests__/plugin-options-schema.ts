import { testPluginOptionsSchema } from "gatsby-plugin-utils"
import { pluginOptionsSchema } from "../plugin-options-schema"

describe(`pluginOptionsSchema`, () => {
  it(`should invalidate incorrect options`, async () => {
    const options = {
      endpoint: undefined,
    }

    const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(false)
    expect(errors).toEqual([`"endpoint" is required`])
  })
  it(`should invalidate incorrect endpoint string`, async () => {
    const options = {
      endpoint: `foo`,
    }

    const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(false)
    expect(errors).toEqual([`"endpoint" must be a valid uri`])
  })
  it(`should validate correct options`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
    }

    const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(true)
    expect(errors).toEqual([])
  })
  it(`should validate correct options`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
    }

    const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(true)
    expect(errors).toEqual([])
  })
  it(`accepts collectionTypes as strings`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
      collectionTypes: [`collection-one`, `collection-two`],
    }

    const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(true)
    expect(errors).toEqual([])
  })
  it(`accepts collectionTypes as objects`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
      collectionTypes: [
        {
          slug: `collection-one`,
        },
        {
          slug: `collection-two`,
        },
      ],
    }

    const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(true)
    expect(errors).toEqual([])
  })
  it(`rejects a maxParallelRequests of 0, which would deadlock every request`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
      maxParallelRequests: 0,
    }

    const { isValid } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(false)
  })
  it(`rejects a negative maxParallelRequests`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
      maxParallelRequests: -1,
    }

    const { isValid } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(false)
  })
  it(`accepts a positive integer maxParallelRequests`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
      maxParallelRequests: 5,
    }

    const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(true)
    expect(errors).toEqual([])
  })
  it(`rejects a requestTimeout of 0, which would disable the request timeout entirely`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
      requestTimeout: 0,
    }

    const { isValid } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(false)
  })
  it(`rejects a negative requestTimeout`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
      requestTimeout: -1,
    }

    const { isValid } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(false)
  })
  it(`accepts a positive integer requestTimeout`, async () => {
    const options = {
      endpoint: `http://localhost:4000/graphql`,
      requestTimeout: 5000,
    }

    const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options)

    expect(isValid).toBe(true)
    expect(errors).toEqual([])
  })
})
