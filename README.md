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
| `imageCdn` | `false` | Adds a `gatsbyImageCdn` field to upload type nodes. [More](/docs/image-cdn.md). |
| `localFiles` | `false` | Download files in upload type nodes and create file nodes. Uses [createRemoteFileNode - gatsby-source-filesystem](https://www.gatsbyjs.com/plugins/gatsby-source-filesystem/#createremotefilenode). |
| `collectionTypes` | `['posts']` | Specifiy collections to retrive along with any collection-specific options. [More](#collection-types). |
| `globalTypes` | `['nav']` | Specifiy globals to retrive along with any global-specific options. [More](#global-types). |
| `nodeTransform` | `{ ['myField'] => (myField) => transformMyField(myField) }` | Incorporate functions to transform the value returned for a given Payload field. [More](#node-transform) |

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

### Node transform

A function can be defined in the plugin options to transform field values in a Payload API response before creating a Gatsby node.

```ts
{
  // ...
  nodeTransform: (data) => {
    if ('locale' in data) {
      return {
        ...data,
        gatsbyNodeLocale: data.locale,
      }
    }
    return data
  },
  // ...
}
```

Node transform functions run before [reserved properties](#reserved-properties) are set. This allows you to access any information that may be overwritten by reserved properties: e.g. a `locale` field.

## Reserved properties

- `gatsbyNodeType` is a reserved key for API responses. If you have a Payload field with this name, it will be overwritten.
- `locale` is set if the `locales` option is defined for a given collection/global.

For upload collections:

- `gatsbyImageCdn` contains the query for image CDN support if the `imageCdn` option is set on plugin options.
- `payloadImageSize` reports the image size (`string`) that has been set in the config for an upload collection.

