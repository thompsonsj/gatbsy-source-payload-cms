import type { Config, Plugin } from 'payload'
import type { PluginOptions } from './types.js'
import { createGatsbySchemaTypesEndpoint } from './endpoints/gatsbySchemaTypes.js'

/**
 * Payload plugin that exposes Gatsby-ready GraphQL SDL at a custom REST endpoint.
 *
 * Default: `GET /api/gatsby-schema-types`
 *
 * Pair with `gatsby-source-payload-cms` using `fetchSchema: true` (and matching
 * `nodePrefix` on both sides).
 */
export const gatsbySourcePayloadCms =
  (pluginOptions: PluginOptions = {}): Plugin =>
  (config: Config): Config => {
    if (pluginOptions.disabled) {
      return config
    }

    return {
      ...config,
      endpoints: [...(config.endpoints ?? []), createGatsbySchemaTypesEndpoint(pluginOptions)],
    }
  }
