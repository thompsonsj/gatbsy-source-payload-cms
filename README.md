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

## Options

**Required**

| Option | Example value | Description |
| - | - | - |
| `endpoint` | `https://yourapp.payload.app/api/` | Endpoint to the API for your Payload CMS installation. |

**Optional**

| Option | Example value | Description |
| - | - | - |
| `accessToken` | `44289e4c-55a7-4f67-de6a-e5d9423e595e` | API key. See [Authenticating via API Key - Payload CMS](https://payloadcms.com/docs/authentication/config#api-keys). |
| `accessCollectionSlug` | `users` | Collection slug for API key enabled collection. See [Authenticating via API Key - Payload CMS](https://payloadcms.com/docs/authentication/config#api-keys). If blank, will default to `users` |
| `imageCdn` | `false` | Adds a `gatsbyImageCdn` field to upload type nodes. See Netlify docs at [Gatsby Image CDN on Netlify](https://github.com/netlify/netlify-plugin-gatsby/blob/main/docs/image-cdn.md) |
| `localFiles` | `false` | Download files in upload type nodes and create file nodes. Uses [createRemoteFileNode - gatsby-source-filesystem](https://www.gatsbyjs.com/plugins/gatsby-source-filesystem/#createremotefilenode). |
| `collectionTypes` | `['posts']` | Specifiy collections to retrive along with any collection-specific options. [More](#collection-types). |
| `globalTypes` | `['nav']` | Specifiy globals to retrive along with any global-specific options. [More](#global-types). |

### Example

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

### Collection Types

Specify collections to retrieve in the `collectionTypes` option.

Use `string` values to use default API query parameters: `depth=10&limit=1000`.

```ts
{
  // ...
  collectionTypes: [
    'posts',
    'tags'
  ]
  // ...
}
```

Use `object` values for further control over how the collection is retrieved.

| Option | Example value | Description |
| - | - | - |
| `slug` | `posts` | Collection slug. |
| `locales` | `['en', 'fr_FR']` | Specify/Restrict locales for collection documents. |
| `params` | `{ depth: 4 }` | Pass query parameters to REST API call. |
| `limit` | `100` | Limit number of documents retrieved. |
| `repopulate` | `false` | Run a single document query for every document retrieved. |
| `apiPath` | `posts/icu` | Custom API path. Useful when using [custom endpoints](https://payloadcms.com/docs/rest-api/overview#custom-endpoints). |

### Global Types

Specify collections to retrieve in the `globalTypes` option.

Use `string` values to use default API query parameters: `depth=10&limit=1000`.

```ts
{
  // ...
  globalTypes: [
    'nav',
    'footer'
  ]
  // ...
}
```

Use `object` values for further control over how the global is retrieved.

| Option | Example value | Description |
| - | - | - |
| `slug` | `posts` | Global slug. |
| `locales` | `['en', 'fr_FR']` | Specify/Restrict locales for the global. |
| `params` | `{ depth: 4 }` | Pass query parameters to REST API call. |
| `apiPath` | `header/icu` | Custom API path. Useful when using [custom endpoints](https://payloadcms.com/docs/rest-api/overview#custom-endpoints). |


## Points to note

- `gatsbyNodeType` is a reserved key for API responses. If you have a Payload field with this name, it will be overwritten.

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
