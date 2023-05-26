import type { GatsbyConfig } from "gatsby"
import type { IPluginOptions } from "plugin"
import * as dotenv from "dotenv" // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import Joi from "joi"
import { isArray, isEmpty, isPlainObject } from "lodash"

const localeMap = {
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
          {
            slug: `testimonials`,
            schema: Joi.object({
              id: Joi.string(),
              name: Joi.string(),
              locales: Joi.array(),
              jobTitle: Joi.string(),
              quote: Joi.any(),
              createdAt: Joi.string(),
              updatedAt: Joi.string(),
              companyName: Joi.string(),
              logo: Joi.object(),
            }),
          },
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
      } satisfies IPluginOptions,
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
  ],
}

export default config
