import type { GatsbyConfig } from "gatsby"
import type { IPluginOptions } from "../plugin/src/types"
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
    depth: `10`,
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
        nodePrefix: ``,
        endpoint: process.env.PAYLOAD_BASE_URL,
        accessToken: process.env.PAYLOAD_CMS_ACCESS_TOKEN,
        retries: 3,
        localFiles: false,
        imageCdn: true,
        baseUrl: process.env.PAYLOAD_CDN_URL,
        collectionTypes: [
          {
            slug: `events`,
            locales: payloadLocales,
            ...commonParams,
          },
          {
            slug: `testimonials`,
            ...commonParams,
          },
          {
            slug: `logos`,
            ...commonParams,
          },
          {
            slug: `landing-pages`,
            ...commonParams,
            apiPath: `landing-pages/icu`,
          },
          {
            slug: `content-hub-articles`,
            locales: payloadLocales.map(locale => {
              return {
                locale,
                params: {
                  [`where[locales][equals]`]: locale,
                },
              }
            }),
            ...commonParams,
            repopulate: true,
          },
        ],
        globalTypes: [
          { slug: `customers`, locales: payloadLocales, ...globalParams, apiPath: `globals/customers/icu` },
          { slug: `pricing`, locales: payloadLocales, ...globalParams },
        ],
        uploadTypes: [
          { slug: `logo-images`, ...commonParams, imageSize: `logo` },
          { slug: `marketing-site-images`, ...commonParams, imageSize: `desktop` },
          { slug: `media`, ...commonParams },
        ],
        fallbackLocale: `en`,
        nodeTransform: (data) => {
          if ('locale' in data) {
            return {
              ...data,
              gatsbyNodeLocale: data.locale,
            }
          }
          return data
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
