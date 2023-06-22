import dot from "dot-object"
import fetch, { HeadersInit } from "node-fetch"
import { camelCase, isEmpty, omitBy, upperFirst } from "lodash"

const headers = {
  "Content-Type": `application/json`,
} satisfies HeadersInit

/**
 * Fetch utility for requests to the example api.
 * You can use a GraphQL client module instead if you prefer a more full-featured experience.
 * @see https://graphql.org/code/#javascript-client
 */
export async function fetchGraphQL<T>(endpoint: string, query: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: `POST`,
    headers,
    body: JSON.stringify({
      query,
    }),
  })

  return await response.json()
}

export const isString = (value) => typeof value === `string` || value instanceof String

export const fetchDataMessage = (url: string, serializedParams?: string): string => {
  const message = [`Starting to fetch data from Payload - ${url}`]
  if (!isEmpty(serializedParams)) {
    message.push(`with ${serializedParams}`)
  }
  return message.join(` `)
}

export const gatsbyNodeTypeName = ({ payloadSlug, prefix = `Payload` }: { payloadSlug: string; prefix?: string }) =>
  `${prefix}${upperFirst(camelCase(payloadSlug))}`

/**
 * Get doc relationships
 *
 * From an API response, return dot notation key value pairs of relationship ids only.
 *
 * Note that this only works if the relationship is expanded.
 * i.e. it includes an `id` field. Consider adding support
 * for non-expanded relationships. e.g.
 * ``"hereForYou.image": "64877d207ac104cf4d385657"`.
 *
 * The document id is excluded (desirable) because it doesn't
 * end with `.id`. e.g. `"id": "64877d207ac104cf4d385657"`.
 */
export const documentRelationships = (doc: { [key: string]: unknown }, prefix?: string) => {
  const document = prefix
    ? {
        [prefix]: doc,
      }
    : doc
  const dotNotationDoc = dot.dot(document)
  return omitBy(dotNotationDoc, (_value, key) => !key.endsWith(`.id`))
}
