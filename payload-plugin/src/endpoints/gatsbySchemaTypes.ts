import type { Endpoint, SanitizedConfig } from 'payload'
import type { PluginOptions } from '../types.js'
import { buildGatsbySchemaPayload, getNodeTypeNames } from '../utilities/buildGatsbySchemaPayload.js'

export { getNodeTypeNames, buildGatsbySchemaPayload, getCollectionTypeMap } from '../utilities/buildGatsbySchemaPayload.js'

const wantsJson = (req: { headers: Headers; url?: string }): boolean => {
  const accept = req.headers.get(`accept`) || ``
  if (accept.includes(`application/json`)) return true
  try {
    const url = req.url ? new URL(req.url, `http://localhost`) : null
    return url?.searchParams.get(`format`) === `json`
  } catch {
    return false
  }
}

export const createGatsbySchemaTypesEndpoint = (options: PluginOptions = {}): Endpoint => {
  const { endpointPath = `/gatsby-schema-types`, nodePrefix = `` } = options

  return {
    path: endpointPath,
    method: `get`,
    handler: async (req) => {
      const payload = buildGatsbySchemaPayload(req.payload.config as SanitizedConfig, { nodePrefix })

      if (wantsJson(req)) {
        return Response.json(payload)
      }

      return new Response(payload.sdl, {
        status: 200,
        headers: {
          'Content-Type': `text/plain; charset=utf-8`,
        },
      })
    },
  }
}
