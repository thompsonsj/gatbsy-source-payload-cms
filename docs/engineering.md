## Development

Use two terminals.

- `yarn develop:site` runs a local test Gatsby installation to test and verify sourced data.
- `yarn develop:plugin` compiles the plugin from TypeScript as you work.

For the Payload schema plugin:

```bash
yarn workspace payload-plugin-gatsby-source develop
yarn workspace payload-plugin-gatsby-source test
```

## Engineering

Developed based on:

- https://www.gatsbyjs.com/docs/tutorial/creating-a-source-plugin/
- https://github.com/gatsbyjs/creating-source-plugin-tutorial.git
- https://github.com/gatsby-uc/plugins/tree/main/packages/gatsby-source-strapi

Schema customization:

- [issue #12](https://github.com/thompsonsj/gatbsy-source-payload-cms/issues/12)
- Payload plugin endpoint returns SDL + union resolve metadata (`?format=json`)
- Gatsby `fetchSchema` registers SDL and auto-builds union `resolveType` from
  Payload discriminants (`blockType` / `collection` / `relationTo`)
