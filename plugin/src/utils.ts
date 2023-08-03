import dot from "dot-object"
import fetch, { HeadersInit } from "node-fetch"
import { camelCase, get, isEmpty, isString, omitBy, upperFirst } from "lodash"

import type { ICollectionTypeObject, IGlobalTypeObject } from "./types"

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

  return (await response.json()) as T
}

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

const removeTrailingSlash = (str: string): string => str.replace(/\/$/, ``)

export const payloadImage = (apiResponse: { [key: string]: any }, size?: string): any => {
  let image = size ? get(apiResponse, `sizes.${size}`, apiResponse) : apiResponse
  // some sizes may not exist (e.g resize operations on images that are too small)
  if (!image || !image.url) {
    image = apiResponse
  }
  return image
}

export const payloadImageUrl = (
  apiResponse: { [key: string]: any },
  size?: string,
  baseUrl?: string
): string | undefined => {
  if (!apiResponse || typeof apiResponse.url === `undefined`) {
    return undefined
  }
  const url = payloadImage(apiResponse, size).url
  return url ? `${removeTrailingSlash(baseUrl)}${url}` : undefined
}

export const normalizeGlobals = (globalTypes: Array<string | IGlobalTypeObject>, endpoint: string) =>
  globalTypes.map((globalType) => {
    return normalizeGlobal(globalType, endpoint)
  })

export const normalizeCollections = (collectionTypes: Array<string | ICollectionTypeObject>, endpoint: string) =>
  collectionTypes.map((collectionType) => normalizeCollection(collectionType, endpoint))

const normalizeCollection = (collectionType: string | ICollectionTypeObject, endpoint: string) => {
  if (isString(collectionType)) {
    return normalizeCollectionString(collectionType as string, endpoint)
  }
  return normalizeCollectionObject(collectionType as ICollectionTypeObject, endpoint)
}

const normalizeCollectionString = (collectionType: string, endpoint: string) => ({
  endpoint: new URL(`${collectionType}`, endpoint).href,
  type: collectionType,
})

const normalizeCollectionObject = (collectionType: ICollectionTypeObject, endpoint: string) => ({
  endpoint: new URL(`${collectionType.slug}`, endpoint).href,
  ...collectionType,
  type: collectionType.slug,
})

const normalizeGlobal = (globalType: string | IGlobalTypeObject, endpoint: string) => {
  if (isString(globalType)) {
    return normalizeGlobalString(globalType as string, endpoint)
  }
  return normalizeGlobalObject(globalType as IGlobalTypeObject, endpoint)
}

const normalizeGlobalString = (globalType: string, endpoint: string) => ({
  endpoint: new URL(`globals/${globalType}`, endpoint).href,
  type: globalType,
})

const normalizeGlobalObject = (globalType: IGlobalTypeObject, endpoint: string) => {
  const urlPath = globalType.apiPath ? globalType.apiPath : `globals/${globalType.slug}`
  return {
    endpoint: new URL(urlPath, endpoint).href,
    ...globalType,
    type: globalType.slug,
  }
}
