import type { GatsbyNode } from "gatsby"
import { NODE_TYPES } from "./constants"

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
export const createSchemaCustomization: GatsbyNode[`createSchemaCustomization`] = ({ actions }) => {
  const { createTypes } = actions

  /**
   * Two things are happening here:
   * - The `Post` and `Author` types are being explicitly defined with all their fields
   * - The `author` field on the `Post` type is being linked to the `Author` type via a foreign-key relationship
   * @see https://www.gatsbyjs.com/docs/reference/graphql-data-layer/schema-customization/#foreign-key-fields
   */
  createTypes(`
    type ${NODE_TYPES.Post} implements Node {
      id: ID!
      _id: Int!
      slug: String!
      title: String!
      author: ${NODE_TYPES.Author} @link(by: "name")
      image: ${NODE_TYPES.Asset} @link
    }

    type ${NODE_TYPES.Author} implements Node {
      id: ID!
      _id: Int!
      name: String!
    }

    type ${NODE_TYPES.Asset} implements Node & RemoteFile {
      url: String!
      alt: String!
      width: Int!
      height: Int!
    }
  `)

  /**
   * You most often will use SDL syntax to define your data types. However, you can also use type builders for more advanced use cases
   * @see https://www.gatsbyjs.com/docs/reference/graphql-data-layer/schema-customization/#gatsby-type-builders
   */
}
