# payload-plugin-gatsby-source

Payload CMS **v3** plugin that exposes Gatsby-ready GraphQL SDL (and union resolve metadata) at a custom REST endpoint.

Default: `GET /api/gatsby-schema-types`

## Install

```bash
npm install payload-plugin-gatsby-source @payloadcms/graphql
# yarn
yarn add payload-plugin-gatsby-source @payloadcms/graphql
```

## Usage

```ts
import { buildConfig } from 'payload'
import { gatsbySourcePayloadCms } from 'payload-plugin-gatsby-source'

export default buildConfig({
  // ...
  plugins: [
    gatsbySourcePayloadCms({
      // optional — must match gatsby-source-payload-cms `nodePrefix`
      // nodePrefix: '',
      // endpointPath: '/gatsby-schema-types',
    }),
  ],
})
```

Then in Gatsby:

```ts
{
  resolve: `gatsby-source-payload-cms`,
  options: {
    endpoint: `https://your-cms.example/api/`,
    fetchSchema: true,
    // nodePrefix must match the Payload plugin (default '' on Payload, 'Payload' on Gatsby —
    // set one side so they agree, e.g. nodePrefix: '' on both)
    nodePrefix: ``,
    collectionTypes: [`landing-pages`],
  },
}
```

### Options

| Option | Default | Description |
| - | - | - |
| `endpointPath` | `/gatsby-schema-types` | Root API path (served under `/api`) |
| `nodePrefix` | `''` | Prefix for collection/global GraphQL type names; must match Gatsby’s `nodePrefix` |
| `disabled` | `false` | Skip registering the endpoint |

### What the endpoint returns

**Plain text** (default, for curl / manual paste):

GraphQL SDL derived from Payload’s schema via `configToSchema`, with:

- `JSON` renamed to `PayloadJSON` (Gatsby reserves `JSON`)
- backticks replaced with `"`
- `implements Node` on each collection/global singular type

**JSON** (`Accept: application/json` or `?format=json`) — used by `gatsby-source-payload-cms` when `fetchSchema: true`:

```ts
{
  version: 1,
  sdl: string,
  unions: Array<{
    name: string
    types: string[]
    /** block slug / collection slug / relationTo → GraphQL type name */
    typeMap: Record<string, string>
  }>
}
```

The Gatsby plugin turns each `unions` entry into `schema.buildUnionType` with a `resolveType` that checks `blockType`, then `collection`, then `relationTo`, then falls back to a single member type.

That covers Payload **block unions** and most **relationship unions** without site-level Type Builders.

### Still site-specific

These are **not** generated (keep them in the site’s `gatsby-node` / `createResolvers` when needed):

- Custom `nodeModel.findOne` relationship / CDN field resolvers
- Heuristic `resolveType` (e.g. pick type from a URL string)
- Locale-aware lookups
- Extra CDN fields beyond plugin `imageCdn`

See [issue #12](https://github.com/thompsonsj/gatbsy-source-payload-cms/issues/12).
