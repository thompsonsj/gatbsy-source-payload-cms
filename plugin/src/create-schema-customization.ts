import type { GatsbyNode } from "gatsby"
import type { IPluginOptionsInternal } from "./types"

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
export const createSchemaCustomization: GatsbyNode[`createSchemaCustomization`] = (
  { actions, schema },
  pluginOptions: IPluginOptionsInternal
) => {
  const { createTypes } = actions

  const schemaCustomizations = pluginOptions.schemaCustomizations || ``

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const PayloadEvents_Layout = schema.buildUnionType({
    name: `PayloadEvents_Layout`,
    types: [
      `Anchor`,
      `Hero`,
      `HeroVideo`,
      `ContentMultiCol`,
      `HubspotFormEmbed`,
      `ImageText`,
      `LogoList`,
      `TextItems`,
      `Text`,
      `List`,
      `Video`,
      `Container`,
    ],
    resolveType: (value) => {
      // return correct type depending on incoming value, e.g.
      if (value.blockType === `anchor`) {
        return `Anchor`
      }
      if (value.blockType === `hero`) {
        return `Hero`
      }
      if (value.blockType === `heroVideo`) {
        return `HeroVideo`
      }
      if (value.blockType === `contentMultiCol`) {
        return `ContentMultiCol`
      }
      if (value.blockType === `hubspotFormEmbed`) {
        return `HubspotFormEmbed`
      }
      if (value.blockType === `imageText`) {
        return `ImageText`
      }
      if (value.blockType === `logoList`) {
        return `LogoList`
      }
      if (value.blockType === `textItems`) {
        return `TextItems`
      }
      if (value.blockType === `text`) {
        return `Text`
      }
      if (value.blockType === `list`) {
        return `List`
      }
      if (value.blockType === `video`) {
        return `Video`
      }
      if (value.blockType === `container`) {
        return `Container`
      }
      throw `No Payload CMS block type defined`
    },
  })

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const LogoList_Logos = schema.buildUnionType({
    name: `LogoList_Logos`,
    types: [`Logo`],
    resolveType: () => {
      return `Logo`
    },
  })

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const TextItems_Items = schema.buildUnionType({
    name: `TextItems_Items`,
    types: [`TextItem`],
    resolveType: () => {
      return `TextItem`
    },
  })

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const TextItem_Image = schema.buildUnionType({
    name: `TextItem_Image`,
    types: [`Headshot`, `MarketingSiteImage`],
    resolveType: (value) => {
      if (value.url.includes(`headshot`)) {
        return `Headshot`
      }
      return `MarketingSiteImage`
    },
  })

  /**
   * You most often will use SDL syntax to define your data types. However, you can also use type builders for more advanced use cases
   * @see https://www.gatsbyjs.com/docs/reference/graphql-data-layer/schema-customization/#gatsby-type-builders
   */
  if (schemaCustomizations) {
    createTypes(schemaCustomizations)
  }
  createTypes([PayloadEvents_Layout])
  createTypes([LogoList_Logos])
  createTypes([TextItems_Items])
  createTypes([TextItem_Image])
}
