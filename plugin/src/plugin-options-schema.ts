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
          /** Override limit in query params and disable paginated query */
          limit: Joi.number(),
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
          /** Override limit in query params and disable paginated query */
          limit: Joi.number(),
        })
      )
    ),
    // Define the upload collections to fetch. e.g. [`images`]
    // Use an object instead of a string to define locales. e.g. [{slug: `images`, locales: [`en`, `fr_FR`]}]
    // if `localFiles` is true, local file nods will be created
    uploadTypes: Joi.array().items(
      Joi.alternatives(
        Joi.string(),
        Joi.object({
          slug: Joi.string(),
          locales: Joi.array().items(Joi.string()),
          params: Joi.object(),
          /** Override limit in query params and disable paginated query */
          limit: Joi.number(),
          /** Optional. Retrieve an image size. If blank, the original URL will be returned. */
          imageSize: Joi.string(),
        })
      )
    ),
    // Optional. Access token. Use if your API is protected.
    accessToken: Joi.string(),
    // Optional. Throttle parallel requests.
    maxParallelRequests: Joi.number(),
    // Optional. Retry requests using https://www.npmjs.com/package/axios-retry.
    retries: Joi.number(),
    fallbackLocale: Joi.string(),
    // Optional. Add a prefix to Gatsby nodes. Default: Payload.
    nodePrefix: Joi.string(),
    // Optional. Map Payload locales to different strings in the resulting nodes.
    nodeTransform: Joi.object(),
    // Optional. Create local file nodes for upload collections.
    localFiles: Joi.boolean(),
    // Optional. Create Gatsby Image CDN asset nodes for upload collections.
    imageCdn: Joi.boolean(),
    /** A base URL for constructing imageUrls. Required for `localFiles`. */
    baseUrl: Joi.string().when(`localFiles`, { is: true, then: Joi.string().required() }),
  })
}
