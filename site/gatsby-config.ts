import type { GatsbyConfig } from "gatsby"
import type { IPluginOptions } from "plugin"
import * as dotenv from "dotenv" // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import { isArray, isEmpty, isPlainObject } from "lodash"

import { schemaCustomizations } from "./sdl/schema-customizations"

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

const allSchemaCustomizations = `
${originalSchemaCustomizations}
${schemaCustomizations}
`

const payloadLocaleMap = {
  en: `en`,
  da_DK: `da`,
  de_DE: `de`,
  en_GB: `gb`,
  en_US: `us`,
  es_ES: `es`,
  et_EE: `ee`,
  fi_FI: `fi`,
  fr_FR: `fr`,
  it_IT: `it`,
  le_LT: `lt`,
  lv_LV: `lv`,
  nl_NL: `nl`,
  no_NO: `no`,
  pl_PL: `pl`,
  pt_PT: `pt`,
  sv_SE: `sv`,
}

const globalParams = {
  params: {
    [`where[_status][equals]`]: `published`,
    depth: 10,
  },
}

const payloadLocales = Object.keys(payloadLocaleMap)

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
          {
            slug: `policies`,
            locales: payloadLocales,
            params: { [`where[_status][equals]`]: `published` },
          },
          `testimonials`,
          { slug: `localized-testimonials`, locales: payloadLocales },
          `logos`,
        ],
        globalTypes: [
          { slug: `customers`, locales: payloadLocales, ...globalParams },
          { slug: `enterprise`, locales: payloadLocales, ...globalParams },
          { slug: `careers`, locales: payloadLocales, ...globalParams },
          { slug: `statistics`, locales: payloadLocales, ...globalParams },
          { slug: `small-midsize`, locales: payloadLocales, ...globalParams },
          { slug: `pricing`, locales: payloadLocales, ...globalParams },
          { slug: `ats`, locales: payloadLocales, ...globalParams },
        ],
        fallbackLocale: `en`,
        nodeTransform: {
          locale: (locale) => (isPlainObject(localeMap) && !isEmpty(localeMap[locale]) ? localeMap[locale] : locale),
          locales: (locales) =>
            isArray(locales) &&
            locales.map((locale) =>
              isPlainObject(localeMap) && !isEmpty(localeMap[locale]) ? localeMap[locale] : locale
            ),
        },
        schemaCustomizations: allSchemaCustomizations,
      } satisfies IPluginOptions,
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
  ],
}

export default config
