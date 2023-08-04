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
{
  resolve: `gatsby-source-payload-cms`,
  options: {
    endpoint: `https://yourapp.payload.app/api/`,
    accessToken: `<your-payload-cms-api-key>`,
    imageCdn: true,
    localFiles: false,
    collectionTypes: [
      `events`,
      `landing-pages`,
      { slug: `policies`, locales: [`en`, `fr_FR`], params: { [`where[_status][equals]`]: `published` } },
    ],
    globalTypes: [{ slug: `customers`, locales: [`en`, `fr_FR`] }, `statistics`],
    uploadTypes: [
      `headshots`,
      `logo-images`,
    ],
    fallbackLocale: `en`,
  },
},
```

## Points to note

- `gatsbyNodeType` is a reserved key for API responses. If you have a Payload field with this name, it will be overwritten.
- If using Gatsby Image CDN, a `gatsbyImageCdn` field will be added to upload type nodes.

## Gatsby Image CDN support

Gatsby Image CDN support is available for [Payload Upload collections](https://payloadcms.com/docs/upload/overview).

Define your Upload collection slugs and enable the feature:

```ts
{
  resolve: `gatsby-source-payload-cms`,
  options: {
    endpoint: `https://yourapp.payload.app/api/`,
    imageCdn: true,
    uploadTypes: [
      `headshots`,
      `logo-images`,
    ],
  },
},
```

`Asset` nodes will be created for each upload. A `gatsbyImageCdn` field is added to each Upload node that links to the appropriate `Asset` node.

An example GraphQL query on all Upload nodes:

```graphql
{
  allPayloadMedia {
    nodes {
      url
      gatsbyImageCdn {
        publicUrl
        gatsbyImage(height: 1000)
      }
    }
  }
}
```

A `relationships` field is made available on `Asset` nodes. This can be used to query assets or determine where an asset is used.

```ts
{
  "relationships": [
    "events.645e126f26a303cb2e24f857.layout[2].image.id",
    "events.646c92fad358f527dfb44142.layout[2].image.id",
    "events.6478badec093e67255801925.layout[2].image.id",
    "events.64aeb9db71885e8c72c02327.layout[2].image.id"
  ]
}
```
