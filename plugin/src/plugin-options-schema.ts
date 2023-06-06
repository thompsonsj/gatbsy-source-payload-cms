import type { GatsbyNode } from "gatsby"
import type { ObjectSchema } from "gatsby-plugin-utils"

/**
 * When you expose options for your plugin, it's best practice to validate the user input.
 * You can use the pluginOptionsSchema API to do this, which is powered by Joi: https://joi.dev/
 * If for example a user would forget to add the endpoint option, Gatsby will show a validation error.
 * @see https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/#pluginOptionsSchema
 * @see https://www.gatsbyjs.com/docs/how-to/plugins-and-themes/configuring-usage-with-plugin-options/
 */
export const pluginOptionsSchema: GatsbyNode["pluginOptionsSchema"] = ({ Joi }): ObjectSchema => {
  return Joi.object({
    // Required: Endpoint. e.g. https://mycompany.payload.app/api
    endpoint: Joi.string().uri().required().description(`The endpoint of your Payload CMS API`),
    // Define the collection slugs to fetch. e.g. [`posts`, `authors`, `tags`]
    // Use an object instead of a string to define locales. e.g. [{slug: `posts`, locales: [`en`, `fr_FR`]}]
    collectionTypes: Joi.array().items(
      Joi.alternatives(
        Joi.string(),
        Joi.object({
          slug: Joi.string(),
          locales: Joi.array().items(Joi.string()),
          params: Joi.object(),
        })
      )
    ),
    // Define the global slugs to fetch. e.g. [`menu`]
    // Use an object instead of a string to define locales. e.g. [{slug: `menu`, locales: [`en`, `fr_FR`]}]
    globalTypes: Joi.array().items(
      Joi.alternatives(
        Joi.string(),
        Joi.object({
          slug: Joi.string(),
          locales: Joi.array().items(Joi.string()),
          params: Joi.object(),
        })
      )
    ),
    // Optional. Access token. Use if your API is protected.
    accessToken: Joi.string(),
    // Optional. Throttle parallel requests.
    maxParallelRequests: Joi.number(),
    fallbackLocale: Joi.string(),
    // Optional. Add a prefix to Gatsby nodes. Default: Payload.
    nodePrefix: Joi.string(),
    // Optional. Map Payload locales to different strings in the resulting nodes.
    nodeTransform: Joi.object(),
    /**
     * Create schema customizations
     *
     * Optional. Passed to the `createTypes` action in createSchemaCustomization.
     *
     * @see https://www.gatsbyjs.com/docs/reference/graphql-data-layer/schema-customization
     */
    schemaCustomizations: Joi.string(),
  })
}
