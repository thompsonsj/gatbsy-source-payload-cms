import type { GatsbyConfig } from "gatsby"
import type { IPluginOptions } from "plugin"
import * as dotenv from "dotenv" // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import { isArray, isEmpty, isPlainObject } from "lodash"

import { testimonials } from "./sdl/testimonials"

const localeMap = {
  en: `en`,
  fr_FR: `fr`,
}

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

type Asset implements Node & RemoteFile {
  url: String!
  alt: String!
  width: Int!
  height: Int!
}
`

const schemaCustomizations = `
${originalSchemaCustomizations}
${testimonials}
`

const config: GatsbyConfig = {
  graphqlTypegen: true,
  plugins: [
    // Load the plugin with its options
    {
      resolve: `gatsby-source-payload-cms`,
      // You can pass any serializable options to the plugin
      options: {
        endpoint: process.env.PAYLOAD_BASE_URL,
        collectionTypes: [
          `events`,
          `landing-pages`,
          { slug: `policies`, locales: [`en`, `fr_FR`], params: { [`where[_status][equals]`]: `published` } },
          `testimonials`,
        ],
        globalTypes: [{ slug: `customers`, locales: [`en`, `fr_FR`] }, `statistics`],
        fallbackLocale: `en`,
        nodeTransform: {
          locale: (locale) => (isPlainObject(localeMap) && !isEmpty(localeMap[locale]) ? localeMap[locale] : locale),
          locales: (locales) =>
            isArray(locales) &&
            locales.map((locale) =>
              isPlainObject(localeMap) && !isEmpty(localeMap[locale]) ? localeMap[locale] : locale
            ),
        },
        schemaCustomizations,
      } satisfies IPluginOptions,
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
  ],
}

export default config
