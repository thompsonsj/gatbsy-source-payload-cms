import type { SanitizedConfig } from 'payload'
import { formatNames } from 'payload'
import { configToSchema } from '@payloadcms/graphql'
import type { PluginOptions } from '../types.js'
import { buildUnionResolveSpecs, getBlockTypeMap } from './buildUnionResolveSpecs.js'
import { renameNodeTypeName, toGatsbySdl } from './toGatsbySdl.js'
import type { GatsbySchemaPayload } from './types.js'

export const getNodeTypeNames = (
  config: Pick<SanitizedConfig, 'collections' | 'globals'>
): string[] => {
  return [...config.collections, ...config.globals].map((collectionOrGlobal) => {
    const fromSlug = formatNames(collectionOrGlobal.slug)
    return fromSlug.singular
  })
}

/**
 * collection/global slug → GraphQL singular type name (with optional nodePrefix).
 */
export const getCollectionTypeMap = (
  config: Pick<SanitizedConfig, 'collections' | 'globals'>,
  nodePrefix = ``
): Record<string, string> => {
  const map: Record<string, string> = {}
  for (const collectionOrGlobal of [...config.collections, ...config.globals]) {
    const singular = formatNames(collectionOrGlobal.slug).singular
    map[collectionOrGlobal.slug] = `${nodePrefix}${singular}`
  }
  return map
}

/**
 * Build the full Gatsby schema bundle (SDL + union resolve metadata).
 */
export const buildGatsbySchemaPayload = (
  config: SanitizedConfig,
  options: Pick<PluginOptions, 'nodePrefix'> = {}
): GatsbySchemaPayload => {
  const { nodePrefix = `` } = options
  const { schema } = configToSchema(config)
  const nodeTypeNames = getNodeTypeNames(config)
  const rename = (name: string) => renameNodeTypeName(name, nodeTypeNames, nodePrefix)

  const sdl = toGatsbySdl(schema, nodeTypeNames, { nodePrefix })
  const unions = buildUnionResolveSpecs(schema, {
    blockTypeMap: getBlockTypeMap(schema),
    collectionTypeMap: getCollectionTypeMap(config, nodePrefix),
    renameTypeName: rename,
  })

  return {
    version: 1,
    sdl,
    unions,
  }
}
