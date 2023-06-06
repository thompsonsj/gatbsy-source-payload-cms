import fetch, { HeadersInit } from "node-fetch"
import { camelCase, isEmpty, upperFirst } from "lodash"

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
