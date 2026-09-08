import {
  type GraphQLSchema,
  isObjectType,
  isUnionType,
} from 'graphql'
import type { UnionResolveSpec } from './types.js'

export type BuildUnionResolveSpecsOptions = {
  /**
   * blockSlug → GraphQL type name (from Payload block type extensions).
   */
  blockTypeMap: Record<string, string>
  /**
   * collection/global slug → GraphQL type name (after nodePrefix).
   */
  collectionTypeMap: Record<string, string>
  /**
   * Rename GraphQL type names the same way `toGatsbySdl` does for node types.
   */
  renameTypeName?: (name: string) => string
}

/**
 * Collect Payload blockSlug → GraphQL type name from schema type extensions
 * written by @payloadcms/graphql when building block object types.
 */
export const getBlockTypeMap = (schema: GraphQLSchema): Record<string, string> => {
  const map: Record<string, string> = {}

  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type)) continue
    const blockSlug = type.extensions?.blockSlug
    if (typeof blockSlug === `string` && blockSlug.length > 0) {
      map[blockSlug] = type.name
    }
  }

  return map
}

/**
 * Build union resolve specs for every GraphQL union in the schema.
 *
 * Each spec carries a combined typeMap (blocks + collections) so Gatsby can
 * resolve via `blockType`, `collection`, or `relationTo` without site code.
 */
export const buildUnionResolveSpecs = (
  schema: GraphQLSchema,
  options: BuildUnionResolveSpecsOptions
): UnionResolveSpec[] => {
  const { blockTypeMap, collectionTypeMap, renameTypeName = (name) => name } = options
  const combinedTypeMap = {
    ...blockTypeMap,
    ...collectionTypeMap,
  }

  const renamedTypeMap: Record<string, string> = {}
  for (const [discriminant, typeName] of Object.entries(combinedTypeMap)) {
    renamedTypeMap[discriminant] = renameTypeName(typeName)
  }

  const specs: UnionResolveSpec[] = []

  for (const type of Object.values(schema.getTypeMap())) {
    if (!isUnionType(type) || type.name.startsWith(`__`)) continue

    const memberNames = type
      .getTypes()
      .map((member) => renameTypeName(member.name))
      .filter(Boolean)

    if (memberNames.length === 0) continue

    // Only keep typeMap entries that point at this union's members (keeps the
    // payload small and avoids accidental cross-union matches).
    const memberSet = new Set(memberNames)
    const typeMap: Record<string, string> = {}
    for (const [discriminant, typeName] of Object.entries(renamedTypeMap)) {
      if (memberSet.has(typeName)) {
        typeMap[discriminant] = typeName
      }
    }

    specs.push({
      name: renameTypeName(type.name),
      types: memberNames,
      typeMap,
    })
  }

  return specs.sort((a, b) => a.name.localeCompare(b.name))
}
