export interface PluginOptions {
  /**
   * When true, the plugin does not register the schema endpoint.
   * @default false
   */
  disabled?: boolean
  /**
   * Root API path for the Gatsby schema endpoint (under `/api`).
   * @default '/gatsby-schema-types'
   */
  endpointPath?: string
  /**
   * Prefix applied to collection/global GraphQL type names so they match
   * `gatsby-source-payload-cms`'s `nodePrefix`. Must match on both sides.
   * Use `''` (default) when Gatsby also uses an empty `nodePrefix`.
   * @default ''
   */
  nodePrefix?: string
}
