# gatsby-source-payload-cms

Gatsby source plugin for Payload CMS.

## Usage

In your Gatsby install:

```
# npm
npm install gatsby-source-payload-cms
# yarn
yarn add gatsby-source-payload-cms
```

Add the plugin and define your endpoint and collection/global slugs in `gatsby-config`.

Collections/Globals may also be defined as an object for additional control such as defining which locales to retrieve and any REST API query parameters to include.

If locales is defined, your Gatbsy nodes will include a `locale` key.

Simple config:

```ts
{
  resolve: `gatsby-source-payload-cms`,
  options: {
    endpoint: `https://yourapp.payload.app/api/`,
    collectionTypes: [
      `events`,
      `landing-pages`,
    ],
    globalTypes: [{ slug: `customers`, locales: [`en`, `fr_FR`] }, `statistics`],
    fallbackLocale: `en`,
  },
},
```

More options:

```ts
const schemaCustomizations = `
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

{
  resolve: `gatsby-source-payload-cms`,
  options: {
    endpoint: `https://yourapp.payload.app/api/`,
    collectionTypes: [
      `events`,
      `landing-pages`,
      { slug: `policies`, locales: [`en`, `fr_FR`], params: { [`where[_status][equals]`]: `published` } },
    ],
    globalTypes: [{ slug: `customers`, locales: [`en`, `fr_FR`] }, `statistics`],
    fallbackLocale: `en`,
  },
  /**
   * Create schema customizations
   *
   * Optional. Passed to the `createTypes` action in createSchemaCustomization.
   *
   * @see https://www.gatsbyjs.com/docs/reference/graphql-data-layer/schema-customization
   */
  schemaCustomizations,
},
```

## Development

Use two terminals.

- `yarn develop:site` runs a local test Gatsby installation to test and verify sourced data.
- `yarn develop:plugin` compiles the plugin from TypeScript as you work.

## Engineering

Developed based on:

- https://www.gatsbyjs.com/docs/tutorial/creating-a-source-plugin/
- https://github.com/gatsbyjs/creating-source-plugin-tutorial.git
- https://github.com/gatsby-uc/plugins/tree/main/packages/gatsby-source-strapi

## Points to note

- `gatsbyNodeType` is a reserved key for API responses. If you have a Payload field with this name, it will be overwritten.

# creating-source-plugin-tutorial

## Prerequisites

You'll need to have these tools installed:

- Node.js (v18 or newer)
- Git
- Yarn

You can also follow [Part 0: Set Up Your Development Environment](https://www.gatsbyjs.com/docs/tutorial/part-0/) for more detailed instructions.

## Usage

1. Clone this project
1. `yarn` to install dependencies
1. `yarn test` to run unit tests
1. `yarn lint:fix` to run linting

### Development

1. `yarn develop:deps` to build & serve the API at http://localhost:4000, and to also watch the source plugin for changes
1. `yarn develop:site` in another terminal window to run `gatsby develop` for the test site

If you make changes to the source plugin you will need to restart the `site` server to see the changes reflected in the site.

### Build

1. `yarn start:api` to build and serve the API at http://localhost:4000
1. `yarn build` in another terminal window to build the production plugin and site
1. `yarn serve:site` to serve the Gatsby site at http://localhost:9000. You should see an overview of all posts

## Project structure

This project includes three directories:

- `api` is the example mock backend API you will source from
- `plugin` is the example source plugin
- `site` is the example site

The source plugin consumes the API, and the site uses the source plugin.
