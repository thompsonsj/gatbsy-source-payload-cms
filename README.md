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
| `maxParallelRequests` | `10` | Cap requests in flight at once. Unbounded by default. [More](#performance-maxparallelrequests-and-limit). |
| `retries` | `3` | Retry failed requests using [axios-retry](https://www.npmjs.com/package/axios-retry). |

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

### Performance: `maxParallelRequests` and `limit`

`maxParallelRequests` caps how many requests are in flight at once. **It is
unbounded by default** - existing configs that never set it keep exactly the
concurrency they always had. This is an opt-in knob, not something you need
to set to avoid a regression:

- Setting `maxParallelRequests` reduces load on the Payload API and memory
  use during the build, at the cost of a longer sourcing step - useful if
  you're seeing origin API errors or high memory usage during sourcing on a
  wide/large fetch.
- A collection's page size (`limit`) interacts with this: a smaller page size
  means more total pages/requests for the same collection, so combining a
  small `limit` with a low `maxParallelRequests` compounds into a much
  longer build. The plugin logs a warning if a collection's page count looks
  unexpectedly large, and periodic progress (every 10 pages) while fetching,
  so a slow sourcing step is diagnosable without reading the plugin's source.

> **Note on 1.1.2**: that release briefly defaulted `maxParallelRequests` to
> `10` instead of unbounded, which could turn a wide sourcing job (many
> collections x locales) that previously finished comfortably into one that
> times out, with no config change on the consumer's end. This was a
> behavioral change that should never have shipped in a patch release, and
> was reverted in 1.1.3. If you're on 1.1.2, upgrade to 1.1.3 or later, or set
> `maxParallelRequests` explicitly to restore your desired concurrency in the
> meantime.

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

#### `slug` (required)

Define the collection slug as an object key/value in order to pass additional options.

```ts
{
  // ...
  collectionTypes: [
    {
      slug: 'posts',
    },
    {
      slug: 'tags',
    }
  ]
  // ...
}
```

### `locales`

Specify/Restrict locales for collection documents.

```ts
{
  // ...
  collectionTypes: [
    {
      slug: 'posts',
      locales: ['en', 'fr_FR'],
    },
  ]
  // ...
}
```

Define locales as a function in order to pass customised query parameters to the REST API call for each locale.

```ts
{
  // ...
  collectionTypes: [
    {
      slug: 'posts',
      locales: payloadLocales.map((locale) => {
        return {
          locale,
          params: {
            [`where[locales][contains]`]: locale,
          },
        };
      }),
    },
  ]
  // ...
}
```

### `params`

Pass query parameters to REST API call.

```ts
{
  // ...
  collectionTypes: [
    {
      slug: 'posts',
      params: {
        depth: 4,
      },
    },
  ]
  // ...
}
```

See [REST API | Payload CMS](https://payloadcms.com/docs/rest-api/overview) for a list of query parameters.

### `limit`

> **`limit` sets the Payload REST API's page size — it is NOT a cap on the total
> number of documents retrieved.** It maps directly onto Payload's own `limit`
> query parameter (documents per page), and setting it also disables this
> plugin's automatic pagination, so only a single page of that size is fetched.
>
> If you want to cap the *total* number of documents fetched for a collection
> (e.g. for a fast local/dev build, or a quick smoke test), use
> [`maxDocs`](#maxdocs) instead — setting `limit` to a small value fetches
> exactly that many documents and no more (pagination is disabled), which
> silently truncates a large collection rather than sourcing everything.
>
> **Do not set `limit` inside `params`** — that's Payload's own REST API query
> parameter of the same name, and it bypasses this plugin's pagination
> controls entirely. A small page size set that way, on a large collection,
> multiplies the number of requests needed to fetch it (the plugin warns via
> the Gatsby `reporter` if this happens). The same applies to `uploadTypes`.

```ts
{
  // ...
  collectionTypes: [
    {
      slug: 'posts',
      // Fetches (and paginates through) the collection 100 documents at a time.
      limit: 100,
    },
  ]
  // ...
}
```

### `maxDocs`

Stop paginating once at least this many documents have been fetched for the
collection (per locale, if `locales` is set). Unlike `limit`, this does not
change the API page size — it just stops requesting further pages once
enough documents have come back. This is the option to reach for when you
actually want to cap the total number of documents fetched, e.g. for a
faster local/dev build.

```ts
{
  // ...
  collectionTypes: [
    {
      slug: 'posts',
      // Fetch only the first ~50 documents, instead of the whole collection.
      maxDocs: 50,
    },
  ]
  // ...
}
```

If the number of requests needed for a collection/locale combination looks
unexpectedly large (more than 20 pages), the plugin logs a warning via the
Gatsby `reporter` before firing any of those requests, rather than only being
discoverable after the fact.

### `repopulate`

Run a single document query for every document retrieved.

```ts
{
  // ...
  collectionTypes: [
    {
      slug: 'posts',
      repopulate: false,
    },
  ]
  // ...
}
```

### `apiPath`

Custom API path. Useful when using [custom endpoints](https://payloadcms.com/docs/rest-api/overview#custom-endpoints).

```ts
{
  // ...
  collectionTypes: [
    {
      slug: 'posts',
      apiPath: `posts/icu`,
    },
  ]
  // ...
}
```

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

### `slug` (required)

Define the global slug as an object key value in order to pass additional options.

```ts
{
  // ...
  globalTypes: [
    {
      slug: 'nav',
    },
    {
      slug: 'footer',
    }
  ]
  // ...
}
```

### `locales`

Specify/Restrict locales for the global.

```ts
{
  // ...
  globalTypes: [
    {
      slug: 'nav',
      locales: ['en', 'fr_FR'],
    },
  ]
  // ...
}
```

Define locales as a function in order to pass customised query parameters to the REST API call for each locale.

```ts
{
  // ...
  globalTypes: [
    {
      slug: 'nav',
      locales: locales.map((locale) => ({
        locale,
        ...(locale !== `en` && {
          params: {
            draft: `true`,
          }
        }),
      }))
    },
  ]
  // ...
}
```

### `params`

Pass query parameters to REST API call.

```ts
{
  // ...
  globalTypes: [
    {
      slug: 'nav',
      depth: 4,
    },
  ]
  // ...
}
```

### `apiPath`

Custom API path. Useful when using [custom endpoints](https://payloadcms.com/docs/rest-api/overview#custom-endpoints).

```ts
{
  // ...
  globalTypes: [
    {
      slug: 'nav',
      apiPath: 'header/icu',
    },
  ]
  // ...
}
```

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

