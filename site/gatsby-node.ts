import type { GatsbyNode } from "gatsby"
import { schemaCustomizations } from "./sdl/schema-customizations"

export const createSchemaCustomization: GatsbyNode[`createSchemaCustomization`] = ({ actions }) => {
  const { createTypes } = actions

  const originalSchemaCustomizations = `
    type Post implements Node {
      id: ID!
      _id: Int!
      slug: String!
      title: String!
      author: Author @link(by: "name")
      image: Asset @link
    }

    type Author implements Node {
      id: ID!
      _id: Int!
      name: String!
    }
    `

  const allSchemaCustomizations = `
    ${originalSchemaCustomizations}
    ${schemaCustomizations}
    `
  createTypes(allSchemaCustomizations)
}
