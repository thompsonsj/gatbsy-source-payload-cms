import type { GatsbyConfig } from "gatsby"
import type { IPluginOptions } from "plugin"
import * as dotenv from "dotenv" // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

const config: GatsbyConfig = {
  graphqlTypegen: true,
  plugins: [
    // Load the plugin with its options
    {
      resolve: `plugin`,
      // You can pass any serializable options to the plugin
      options: {
        endpoint: process.env.PAYLOAD_BASE_URL,
        collectionTypes: [`events`, `landing-pages`, `policies`],
        globalTypes: [{ slug: `customers`, locales: [`en`, `fr_FR`] }, `statistics`],
        fallbackLocale: `en`,
      } satisfies IPluginOptions,
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
  ],
}

export default config
