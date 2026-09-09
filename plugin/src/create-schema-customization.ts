import type { GatsbyNode, CreateSchemaCustomizationArgs } from "gatsby"
import type { IPluginOptionsInternal } from "./types"
import type { GatsbySchemaPayload, UnionResolveSpec } from "./resolve-payload-union-type"
import { createAxiosInstance } from "./axios-instance"
import { DEFAULT_SCHEMA_PATH, ERROR_CODES } from "./constants"
import { resolvePayloadUnionType } from "./resolve-payload-union-type"
import { gatsbyNodeTypeName, normalizeCollections } from "./utils"
import { isString } from "lodash"

/**
 * By default Gatsby, infers the data types for each node. This can be sometimes brittle or lead to hard-to-debug errors.
 * However, you as the source plugin author should explicitly define the data types. This way you override the inference.
 * This has multiple benefits:
 * - All data types are correct and consistent across all nodes
 * - Users can have optional data/missing data. With inference this would break builds, with explicit data types it will work
 * - You can set up relationships between nodes
 *
 * Important: For Valhalla, you need to explicitly define the data types for all nodes.
 * @see https://www.gatsbyjs.com/docs/reference/graphql-data-layer/schema-customization/#explicitly-defining-data-types
 * @see https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/#createSchemaCustomization
 */
export const createSchemaCustomization: GatsbyNode[`createSchemaCustomization`] = async (
  { actions, reporter, schema },
  pluginOptions: IPluginOptionsInternal
) => {
  const { createTypes } = actions

  const types: Parameters<typeof createTypes>[0] = []

  if (pluginOptions.imageCdn) {
    types.push(`
      type Asset implements Node & RemoteFile {
        url: String!
        alt: String!
        width: Int!
        height: Int!
      }
    `)
    const normalizedUploadTypes = normalizeCollections(pluginOptions.uploadTypes, pluginOptions.endpoint)
    normalizedUploadTypes.forEach((uploadType) => {
      const type = gatsbyNodeTypeName({
        payloadSlug: uploadType.type,
        ...(isString(pluginOptions.nodePrefix) && { prefix: pluginOptions.nodePrefix as string }),
      })
      types.push(`
        type ${type} implements Node {
          gatsbyImageCdn: Asset @link
        }
      `)
    })
  }

  const payloadSchema = await resolvePayloadSchema(pluginOptions, reporter)
  if (payloadSchema) {
    types.push(payloadSchema.sdl)
    for (const unionSpec of payloadSchema.unions) {
      types.push(buildUnionTypeFromSpec(schema, unionSpec))
    }
  }

  /**
   * You most often will use SDL syntax to define your data types. However, you can also use type builders for more advanced use cases
   * @see https://www.gatsbyjs.com/docs/reference/graphql-data-layer/schema-customization/#gatsby-type-builders
   */
  if (types.length > 0) {
    createTypes(types)
  }
}

const buildUnionTypeFromSpec = (
  schema: CreateSchemaCustomizationArgs[`schema`],
  unionSpec: UnionResolveSpec
) =>
  schema.buildUnionType({
    name: unionSpec.name,
    types: unionSpec.types,
    resolveType: (value) => resolvePayloadUnionType(value, unionSpec),
  })

const ensureTrailingSlash = (url: string): string => (url.endsWith(`/`) ? url : `${url}/`)

const isGatsbySchemaPayload = (data: unknown): data is GatsbySchemaPayload => {
  if (!data || typeof data !== `object`) return false
  const record = data as Record<string, unknown>
  return (
    record.version === 1 &&
    typeof record.sdl === `string` &&
    Array.isArray(record.unions)
  )
}

const resolvePayloadSchema = async (
  pluginOptions: IPluginOptionsInternal,
  reporter: {
    panic: (error: { id: string; context: { sourceMessage: string } }) => void
    verbose: (message: string) => void
  }
): Promise<GatsbySchemaPayload | undefined> => {
  if (isString(pluginOptions.schemaCustomizations) && pluginOptions.schemaCustomizations.length > 0) {
    return {
      version: 1,
      sdl: pluginOptions.schemaCustomizations,
      // Static SDL path has no union metadata — sites that need resolveType
      // should use fetchSchema or keep local buildUnionType calls.
      unions: Array.isArray(pluginOptions.schemaUnions) ? pluginOptions.schemaUnions : [],
    }
  }

  if (!pluginOptions.fetchSchema) {
    return undefined
  }

  const schemaPath = (pluginOptions.schemaPath || DEFAULT_SCHEMA_PATH).replace(/^\//, ``)
  const schemaUrl = new URL(schemaPath, ensureTrailingSlash(pluginOptions.endpoint)).href

  reporter.verbose(`[gatsby-source-payload-cms] Fetching schema bundle from ${schemaUrl}`)

  try {
    const axiosInstance = createAxiosInstance({
      ...pluginOptions,
      apiURL: pluginOptions.endpoint,
    })
    const response = await axiosInstance.get(schemaUrl, {
      headers: { Accept: `application/json` },
      params: { format: `json` },
    })

    const data = response.data

    // Backward compatible: plain-text SDL from older plugin versions / curl paste.
    if (typeof data === `string`) {
      if (data.trim().length === 0) {
        reporter.panic({
          id: ERROR_CODES.SchemaCustomization,
          context: {
            sourceMessage: `[gatsby-source-payload-cms] Schema endpoint ${schemaUrl} returned an empty response. Is payload-plugin-gatsby-source installed and enabled?`,
          },
        })
        return undefined
      }
      return { version: 1, sdl: data, unions: [] }
    }

    if (!isGatsbySchemaPayload(data) || data.sdl.trim().length === 0) {
      reporter.panic({
        id: ERROR_CODES.SchemaCustomization,
        context: {
          sourceMessage: `[gatsby-source-payload-cms] Schema endpoint ${schemaUrl} returned an invalid JSON bundle (expected { version: 1, sdl, unions }). Upgrade payload-plugin-gatsby-source or pass schemaCustomizations instead.`,
        },
      })
      return undefined
    }

    return data
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    reporter.panic({
      id: ERROR_CODES.SchemaCustomization,
      context: {
        sourceMessage: `[gatsby-source-payload-cms] Failed to fetch schema SDL from ${schemaUrl}: ${detail}. Install and enable payload-plugin-gatsby-source on your Payload CMS, or pass schemaCustomizations instead.`,
      },
    })
    return undefined
  }
}
