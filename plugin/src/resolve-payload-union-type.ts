/**
 * Union resolve metadata from payload-plugin-gatsby-source (GatsbySchemaPayload.unions).
 */
export type UnionResolveSpec = {
  name: string
  types: string[]
  /**
   * Maps a discriminant value (block slug, collection slug, relationTo) to the
   * GraphQL object type name Gatsby should select.
   */
  typeMap: Record<string, string>
}

export type GatsbySchemaPayload = {
  version: 1
  sdl: string
  unions: UnionResolveSpec[]
}

/**
 * Resolve a Payload GraphQL union member for Gatsby, using discriminants that
 * Payload (and REST depth responses) commonly attach to values.
 *
 * Order: blockType → collection → relationTo → single-member fallback.
 */
export const resolvePayloadUnionType = (
  value: unknown,
  spec: Pick<UnionResolveSpec, "types" | "typeMap">
): string | undefined => {
  if (value && typeof value === `object`) {
    const record = value as Record<string, unknown>

    if (typeof record.blockType === `string` && spec.typeMap[record.blockType]) {
      return spec.typeMap[record.blockType]
    }
    if (typeof record.collection === `string` && spec.typeMap[record.collection]) {
      return spec.typeMap[record.collection]
    }
    if (typeof record.relationTo === `string` && spec.typeMap[record.relationTo]) {
      return spec.typeMap[record.relationTo]
    }
  }

  if (spec.types.length === 1) {
    return spec.types[0]
  }

  return undefined
}
