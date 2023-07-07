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

const API_CALL_LIMIT = `true`

const commonParams = {
  params: {
    depth: 10,
  },
  ...(API_CALL_LIMIT === `true` && { limit: 1000 }),
}

const globalParams = {
  params: {
    ...commonParams.params,
    [`where[_status][equals]`]: `published`,
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
        retries: 3,
        localFiles: false,
        imageCdn: true,
        baseUrl: process.env.PAYLOAD_CDN_URL,
        collectionTypes: [
          {
            slug: `events`,
            ...commonParams,
          },
          {
            slug: `landing-pages`,
            ...commonParams,
          },
          {
            slug: `policies`,
            locales: payloadLocales,
            ...globalParams,
          },
          {
            slug: `testimonials`,
            ...commonParams,
          },
          { slug: `localized-testimonials`, locales: payloadLocales, ...commonParams },
          {
            slug: `logos`,
            ...commonParams,
          },
        ],
        globalTypes: [
          { slug: `customers`, locales: payloadLocales, ...globalParams, apiPath: `globals/customers/icu` },
          { slug: `enterprise`, locales: payloadLocales, ...globalParams },
          { slug: `careers`, locales: payloadLocales, ...globalParams },
          { slug: `statistics`, locales: payloadLocales, ...globalParams },
          { slug: `small-midsize`, locales: payloadLocales, ...globalParams },
          { slug: `pricing`, locales: payloadLocales, ...globalParams },
          { slug: `ats`, locales: payloadLocales, ...globalParams },
        ],
        uploadTypes: [
          { slug: `marketing-site-images`, ...commonParams, imageSize: `desktop` },
          { slug: `media`, ...commonParams },
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
        // schemaCustomizations: allSchemaCustomizations,
      } satisfies IPluginOptions,
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
  ],
}

export default config
