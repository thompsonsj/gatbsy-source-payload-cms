import type { GatsbyNode, SourceNodesArgs, NodeInput } from "gatsby"
import type { IRemoteImageNodeInput } from "gatsby-plugin-utils"
import type { IPluginOptionsInternal } from "./types"
import { CACHE_KEYS, NODE_TYPES } from "./constants"
import { createAxiosInstance } from "./axios-instance"
import { fetchEntity, fetchEntities } from "./fetch"
import { isString } from "./utils"
import type { CollectionOptions } from "./fetch"
import { gatsbyNodeTypeName, documentRelationships } from "./utils"
import { createRemoteFileNode } from "gatsby-source-filesystem"
import { get, pickBy } from "lodash"

let isFirstSource = true
const pluginName = `gatsby-source-payload-cms`

// const LAST_FETCHED_KEY = `updatedAt`

/**
 * The sourceNodes API is the heart of a Gatsby source plugin. This is where data is ingested and transformed into Gatsby's data layer.
 * @see https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/#sourceNodes
 */
export const sourceNodes: GatsbyNode[`sourceNodes`] = async (gatsbyApi, pluginOptions: IPluginOptionsInternal) => {
  const { actions, reporter, cache, getNodes } = gatsbyApi
  const { touchNode } = actions
  const { endpoint } = pluginOptions
  let { collectionTypes, globalTypes, uploadTypes } = pluginOptions

  /**
   * It's good practice to give your users some feedback on progress and status. Instead of printing individual lines, use the activityTimer API.
   * This will give your users a nice progress bar and can you give updates with the .setStatus API.
   * In the end your users will also have the exact time it took to source the data.
   * @see https://www.gatsbyjs.com/docs/reference/config-files/node-api-helpers/#reporter
   */
  const sourcingTimer = reporter.activityTimer(`Sourcing from ${pluginName} API`)
  sourcingTimer.start()

  if (isFirstSource) {
    /**
     * getNodes() returns all nodes in Gatsby's data layer
     */
    getNodes().forEach((node) => {
      /**
       * "owner" is the name of your plugin, the "name" you defined in the package.json
       */
      if (node.internal.owner !== pluginName) {
        return
      }

      /**
       * Gatsby aggressively garbage collects nodes between runs. This means that nodes that were created in the previous run but are not created in the current run will be deleted. You can tell Gatsby to keep old, but still valid nodes around, by "touching" them.
       * For this you need to use the touchNode API.
       *
       * However, Gatsby only checks if a node has been touched on the first sourcing. This is what the "isFirstSource" variable is for.
       * @see https://www.gatsbyjs.com/docs/reference/config-files/actions/#touchNode
       */
      touchNode(node)
    })

    isFirstSource = false
  }

  /**
   * If your API supports delta updates via e.g. a timestamp or token, you can store that information via the cache API.
   *
   * The cache API is a key-value store that persists between runs.
   * You should also use it to persist results of time/memory/cpu intensive tasks.
   * @see https://www.gatsbyjs.com/docs/reference/config-files/node-api-helpers/#cache
   */
  const lastFetchedDate: number = await cache.get(CACHE_KEYS.Timestamp)
  const lastFetchedDateCurrent = Date.now()

  /**
   * The reporter API has a couple of methods:
   * - info: Print a message to the console
   * - warn: Print a warning message to the console
   * - error: Print an error message to the console
   * - panic: Print an error message to the console and exit the process
   * - panicOnBuild: Print an error message to the console and exit the process (only during "gatsby build")
   * - verbose: Print a message to the console that is only visible when the "verbose" flag is enabled (e.g. gatsby build --verbose)
   * @see https://www.gatsbyjs.com/docs/reference/config-files/node-api-helpers/#reporter
   *
   * Try to keep the terminal information concise and informative. You can use the "verbose" method to print more detailed information.
   * You don't need to print out every bit of detail your plugin is doing as otherwise it'll flood the user's terminal.
   */
  reporter.verbose(`[${pluginName}] Last fetched date: ${lastFetchedDate}`)

  const axiosInstance = createAxiosInstance(pluginOptions)

  const context = {
    axiosInstance,
    ...gatsbyApi,
    pluginOptions,
  }

  // collectionTypes and globalTypes always an array
  if (!Array.isArray(globalTypes)) {
    globalTypes = []
  }
  if (!Array.isArray(collectionTypes)) {
    collectionTypes = []
  }
  if (!Array.isArray(uploadTypes)) {
    uploadTypes = []
  }

  // convert string collectionTypes and globalTypes to object
  const normalizedGlobalTypes: Array<CollectionOptions> = (globalTypes as any).map((globalType) => {
    if (isString(globalType)) {
      return {
        endpoint: new URL(`globals/${globalType}`, endpoint).href,
        type: globalType,
        schema: null,
      }
    }
    return {
      endpoint: new URL(`globals/${globalType.slug}`, endpoint).href,
      ...globalType,
      type: globalType.slug,
      schema: globalType.schema,
    }
  })
  const normalizedCollectionTypes: Array<CollectionOptions> = (collectionTypes as any).map((collectionType) => {
    if (isString(collectionType)) {
      return {
        endpoint: new URL(`${collectionType}`, endpoint).href,
        type: collectionType,
        schema: null,
      }
    }
    return {
      endpoint: new URL(`${collectionType.slug}`, endpoint).href,
      ...collectionType,
      type: collectionType.slug,
      schema: collectionType.schema,
    }
  })
  const normalizedUploadTypes: Array<CollectionOptions> = (uploadTypes as any).map((uploadType) => {
    if (isString(uploadType)) {
      return {
        endpoint: new URL(`${uploadType}`, endpoint).href,
        type: uploadType,
        schema: null,
      }
    }
    return {
      endpoint: new URL(`${uploadType.slug}`, endpoint).href,
      ...uploadType,
      type: uploadType.slug,
      schema: uploadType.schema,
    }
  })

  const collectionResults = await Promise.all(normalizedCollectionTypes.map((type) => fetchEntities(type, context)))
  const globalResults = await Promise.all(normalizedGlobalTypes.map((type) => fetchEntity(type, context)))
  const uploadResults = await Promise.all(normalizedUploadTypes.map((type) => fetchEntities(type, context)))

  //console.log(await globalResults)

  /**
   * Gatsby's cache API uses LMDB to store data inside the .cache/caches folder.
   *
   * As mentioned above, cache the timestamp of last sourcing.
   * The cache API accepts "simple" data structures like strings, integers, arrays.
   * For example, passing a Set or Map won't work because the "structuredClone" option is purposefully not enabled:
   * https://github.com/kriszyp/lmdb-js#serialization-options
   */
  await cache.set(CACHE_KEYS.Timestamp, lastFetchedDateCurrent)

  /**
   * Up until now the terminal output only showed "Sourcing from plugin API" and a timer. Via the "setStatus" method you can add more information to the output.
   * It'll then print "Sourcing from plugin API - Processing X posts and X authors"
   */
  //sourcingTimer.setStatus(`Processing ${posts.length} posts and ${authors.length} authors`)

  /**
   * Set a default prefix
   */
  const prefix = pluginOptions.nodePrefix

  /**
   * Collect relationship ids
   */
  let relationshipIds: { [key: string]: string } = {}

  /**
   * Iterate over the data and create nodes
   */
  for (const result of collectionResults) {
    for (const collection of result) {
      nodeBuilder({
        gatsbyApi,
        input: {
          type: gatsbyNodeTypeName({
            payloadSlug: collection.gatsbyNodeType,
            ...(isString(prefix) && { prefix: prefix as string }),
          }),
          data: collection,
        },
      })
      // Populate relationshipIds
      relationshipIds = {
        ...documentRelationships(collection, collection.gatsbyNodeType),
        ...relationshipIds,
      }
    }
  }
  for (const result of globalResults) {
    for (const global of result) {
      nodeBuilder({
        gatsbyApi,
        input: {
          type: gatsbyNodeTypeName({
            payloadSlug: global.gatsbyNodeType,
            ...(isString(prefix) && { prefix: prefix as string }),
          }),
          data: global,
        },
      })
      // Populate relationshipIds
      relationshipIds = {
        ...documentRelationships(global, global.gatsbyNodeType),
        ...relationshipIds,
      }
    }
  }

  for (const result of uploadResults) {
    for (const upload of result) {
      nodeBuilder({
        gatsbyApi,
        input: {
          type: gatsbyNodeTypeName({
            payloadSlug: global.gatsbyNodeType,
            ...(isString(prefix) && { prefix: prefix as string }),
          }),
          data: upload,
        },
      })
      if (pluginOptions.localFiles) {
        createLocalFileNode(context, upload, relationshipIds)
      }
    }
  }

  /*for (const author of authors) {
    nodeBuilder({ gatsbyApi, input: { type: NODE_TYPES.Author, data: author } })
  }*/

  sourcingTimer.end()
}

interface INodeBuilderArgs {
  gatsbyApi: SourceNodesArgs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: {
    type: string
    data: { [key: string]: any }
  }
}

export function nodeBuilder({ gatsbyApi, input }: INodeBuilderArgs) {
  const idFragments = [input.type, input.data.id]
  if (input.data.locale) {
    idFragments.push(input.data.locale)
  }
  const id = gatsbyApi.createNodeId(idFragments.join(`-`))
  const extraData: Record<string, unknown> = {}

  if (input.type === `Post`) {
    // const assetId = createAssetNode(gatsbyApi, input.data.image)
    // This sets the autogenerated Node ID onto the "image" key of the Post node. Then the @link directive in the schema will work.
    // extraData.image = assetId
  }

  const node = {
    ...input.data,
    ...extraData,
    id,
    /**
     * "id" is a reserved field in Gatsby, so if you want to keep it, you need to rename it
     * You can see all reserved fields here:
     * @see https://www.gatsbyjs.com/docs/reference/graphql-data-layer/node-interface/
     */
    _id: input.data.id,
    parent: null,
    children: [],
    internal: {
      type: input.type as string,
      /**
       * The content digest is a hash of the entire node.
       * Gatsby uses this internally to determine if the node needs to be updated.
       */
      contentDigest: gatsbyApi.createContentDigest(input.data),
    },
  } satisfies NodeInput

  /**
   * Add the node to Gatsby's data layer. This is the most important piece of a Gatsby source plugin.
   * @see https://www.gatsbyjs.com/docs/reference/config-files/actions/#createNode
   */
  gatsbyApi.actions.createNode(node)
}

export async function createLocalFileNode(
  context: SourceNodesArgs,
  data: any,
  relationshipIds?: { [key: string]: string }
) {
  const { createNode, createNodeField } = context.actions
  const { cache } = context
  const baseUrl = (get(context, `pluginOptions.baseUrl`, ``) as string).replace(/\/$/, ``)
  console.log(`creating remote file node for ${baseUrl}${data.url}`, data)
  const fileNode = await createRemoteFileNode({
    url: `${baseUrl}${data.url}` as string,
    cache,
    createNode,
    createNodeId: () => `upload-${data.id}`,
  })
  const relationships: Array<string> = Object.keys(
    pickBy(relationshipIds, (value) => {
      return value === data.id
    })
  )
  await createNodeField({
    node: fileNode,
    name: `Relationships`,
    value: relationships,
  })
}

export function createAssetNode(gatsbyApi: SourceNodesArgs, data: any) {
  const id = gatsbyApi.createNodeId(`${NODE_TYPES.Asset}-${data.url}`)

  /**
   * For Image CDN and the "RemoteFile" interface, these fields are required:
   * - url
   * - filename
   * - mimeType
   * For images, these fields are also required:
   * - width
   * - height
   */
  const assetNode = {
    id,
    url: data.url,
    /**
     * Don't hardcode the "mimeType" field, it has to match the input image. If you don't have that information, use:
     * @see https://github.com/nodeca/probe-image-size
     * For the sake of this demo, it can be hardcoded since all images are JPGs
     */
    mimeType: `image/jpg`,
    filename: data.url,
    /**
     * If you don't know the width and height of the image, use: https://github.com/nodeca/probe-image-size
     */
    width: data.width,
    height: data.height,
    placeholderUrl: `${data.url}&w=%width%&h=%height%`,
    alt: data.alt,
    parent: null,
    children: [],
    internal: {
      type: NODE_TYPES.Asset,
      contentDigest: gatsbyApi.createContentDigest(data),
    },
  } satisfies IRemoteImageNodeInput

  gatsbyApi.actions.createNode(assetNode)

  /**
   * Return the id so it can be used for the foreign key relationship on the Post node.
   */
  return id
}
