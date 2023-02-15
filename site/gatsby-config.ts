import type { GatsbyConfig } from "gatsby"
import type { IPluginOptions } from "plugin"

/**
 * In a real-world scenario, you would probably place this in a .env file
 * @see https://www.gatsbyjs.com/docs/how-to/local-development/environment-variables/
 */
const GRAPHQL_ENDPOINT = `http://localhost:4000/graphql`

const config: GatsbyConfig = {
  graphqlTypegen: true,
  plugins: [
    // Load the plugin with its options
    {
      resolve: `plugin`,
      // You can pass any serializable options to the plugin
      options: {
        endpoint: GRAPHQL_ENDPOINT,
      } satisfies IPluginOptions,
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
  ],
}

export default config
