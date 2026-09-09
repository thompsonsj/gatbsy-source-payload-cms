import type { GraphQLSchema } from 'graphql'
import { printSchema } from 'graphql'

export type ToGatsbySdlOptions = {
  /**
   * Prefix applied to each node type name (collection/global singular GraphQL names).
   * @default ''
   */
  nodePrefix?: string
}

/**
 * Rename a GraphQL type name when it exactly matches a collection/global
 * singular node type (same rules as `toGatsbySdl`).
 */
export const renameNodeTypeName = (
  name: string,
  nodeTypeNames: string[],
  nodePrefix: string
): string => {
  if (!nodePrefix) return name
  return nodeTypeNames.includes(name) ? `${nodePrefix}${name}` : name
}

/**
 * Turn a Payload GraphQL schema into SDL that Gatsby `createTypes` can consume.
 *
 * Matches the production transforms used by marketingcms's gatsby-schema-types route:
 * - rename reserved `JSON` scalar to `PayloadJSON`
 * - replace backticks (so SDL can live in a string literal)
 * - optionally prefix collection/global singular type names
 * - add `implements Node` on those types
 */
export const toGatsbySdl = (
  schema: GraphQLSchema,
  nodeTypeNames: string[],
  options: ToGatsbySdlOptions = {}
): string => {
  const { nodePrefix = `` } = options

  let sdl = printSchema(schema)
    // Payload's JSON scalar conflicts with a built-in/Gatsby scalar
    .replaceAll(`JSON`, `PayloadJSON`)
    // replace backticks so we can paste the result into a string literal
    .replaceAll('`', `"`)

  // Longer names first so a type like LandingPageTag is not partially rewritten
  // when renaming LandingPage.
  const uniqueNames = [...new Set(nodeTypeNames.filter(Boolean))].sort((a, b) => b.length - a.length)

  for (const singularName of uniqueNames) {
    const gatsbyName = renameNodeTypeName(singularName, uniqueNames, nodePrefix)

    if (nodePrefix && gatsbyName !== singularName) {
      sdl = sdl.replace(new RegExp(`\\b${escapeRegExp(singularName)}\\b`, `g`), gatsbyName)
    }

    sdl = sdl.replace(`type ${gatsbyName} {`, `type ${gatsbyName} implements Node {`)
  }

  return sdl
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)
