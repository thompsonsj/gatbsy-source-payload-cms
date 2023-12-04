import payload from "payload";
import type { Config } from "payload/config";
import { buildSchema, printSchema, GraphQLSchema, GraphQLInterfaceType, GraphQLObjectType } from 'graphql'
import { mergeSchemas } from '@graphql-tools/schema'
import buildObjectType from 'payload/dist/graphql/schema/buildObjectType'
import type { PluginOptions } from "./types";
import { gatsbyNodeTypeName } from "gatsby-source-payload-cms/src/utils";

export const gatsbySourcePayloadCms =
  (pluginOptions: PluginOptions) =>
  (config: Config): Config => {
    const initFunctions: (() => void)[] = [];

    return {
      ...config,
      admin: {
        ...(config.admin || {}),
      },
      endpoints: [
        ...config.endpoints,
        {
          path: '/gatsby-schema-customizations',
          method: 'get',
          handler: async (req, res, next) => {
            /**
             * Create Node interface to add to Payload collection/global types
             * 
             * Implement by name only. Gatsby works with this via SDL.
             * 
             * @see https://www.gatsbyjs.com/docs/reference/graphql-data-layer/node-interface/
             */
            const NodeInterface = new GraphQLInterfaceType({
              name: "Node",
              fields: {}
            })
            const schemas = [
              ...payload.config.collections,
              ...payload.config.globals
            ].map((config) => {
              const gatsbyNodeType = gatsbyNodeTypeName({payloadSlug: config.slug})
              const query = buildObjectType({
                payload,
                name: gatsbyNodeType,
                parentName: gatsbyNodeType,
                fields: config.fields
              })
              const revisedQuery = new GraphQLObjectType(
                {
                  ...query.toConfig(),
                  interfaces: [ NodeInterface ]
                }
              )
              const schema = new GraphQLSchema({query: revisedQuery})
              const sdl = printSchema(schema)
                // Gatsby won't load in the schema/query definition
                .replace('schema {', '')
                .replace(`  query: ${gatsbyNodeType}`, '')
                .replace('}', '')
              return buildSchema(sdl)
            })

            const merged = mergeSchemas({
              schemas,
              resolvers: {
                Node: {}
              }
            })

            let report = printSchema(merged)
              // Payload's JSON scalar conflicts with a built-in/Gatsby scalar
              .replaceAll('JSON', 'PayloadJSON')
              // remove the Node interface definition
              .replace('interface Node', '')
              // replace backticks so we can paste the result into a string literal
              .replaceAll('`', "\\`")

            res.setHeader('content-type', 'application/json')
            res.send(report)
          },
        },
      ],
      onInit: async (payload) => {
        initFunctions.forEach((fn) => fn());
        if (config.onInit) await config.onInit(payload);
      },
    };
  };
