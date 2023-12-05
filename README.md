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
    accessUserSlug: `<your-payload-cms-api-user-slug>`,
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

Authorization is based on API keys. See [Authenticating via API Key | Authentication Config | Payload CMS](https://payloadcms.com/docs/authentication/config#api-keys).

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
  allPayloadHeadshots {
    nodes {
      url
      gatsbyImageCdn {
        publicUrl
        gatsbyImage(height: 600)
      }
    }
  }
}
```

### Relationships

In the previous example, `PayloadHeadshots` (sourced from a `headshots` upload collection in Payload CMS) is a made available to Gatsby with a `gatsbyImageCdn` field that contains the corresponding Gatsby Image CDN asset.

However, the `gatsbyImageCdn` field will not be available when `PayloadHeadshots` is made available through a relationship. For example, a `PayloadTestimonials` type might include a `PayloadHeadshots` type as a relationship.

There are two ways to make the `gatsbyImageCdn` field available in this scenario.

#### Resolvers

Add a custom resolver that creates a new field linking to the upload collection Gatsby GraphQL type.

```ts
export const createResolvers: GatsbyNode['createResolvers'] = async ({
  createResolvers,
}) => {
  createResolvers({
    PayloadTestimonials: {
      headshotCdn: {
        type: 'PayloadHeadshots',
        resolve: (source: any, args: any, context: any, info: any) =>
          source.headshot
            ? context.nodeModel.findOne({
                type: 'PayloadHeadshots',
                query: {
                  filter: { _id: { eq: source.headshot.id } },
                },
              }) || null
            : null,
      },
    },
  });
};
```

This additional field can now be queried.

```graphql
testimonial: payloadTestimonials() {
  companyName
  jobTitle
  name
  quote
  headshot: headshotCdn {
    gatsbyImageCdn {
      ...HeadshotQuery
    }
  }
}
```

#### Relationships field

For situations where adding custom resolvers can be complicated, a `relationships` field is made available on `Asset` nodes.

This can be used to query assets or determine where an asset is used.

This is particularly useful for [block fields](https://payloadcms.com/docs/fields/blocks) or deeply nested upload relationships. In this situation, custom resolvers are complicated to create and maintain.

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

Example query:

```graphql
image_textWithImage: asset(
  relationships: { eq: "global.textWithImage.image.id" }
) {
  alt
  gatsbyImage(width: 2048, quality: 85)
}
```
