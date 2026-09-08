/**
 * Machine-readable union resolve metadata for Gatsby Type Builders.
 *
 * Payload GraphQL unions need a runtime `resolveType`. Gatsby cannot get that
 * from SDL alone, so the Payload plugin ships this alongside the SDL.
 *
 * Discriminants (tried in order by the Gatsby plugin):
 * - `blockType` — Payload blocks
 * - `collection` — polymorphic relationship values (Payload GraphQL shape)
 * - `relationTo` — polymorphic relationship values (REST / depth shape)
 * - single-member fallback — unions with exactly one possible type
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
  /** Bundle format version — bump when the JSON shape changes incompatibly. */
  version: 1
  sdl: string
  unions: UnionResolveSpec[]
}
