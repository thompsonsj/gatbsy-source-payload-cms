import dot from "dot-object"
import fetch, { HeadersInit } from "node-fetch"
import { get, isEmpty, isString, omitBy } from "lodash"
import { isPlural, singular, plural } from 'pluralize'

import type { ICollectionTypeObject, IGlobalTypeObject } from "./types"

const capitalizeFirstLetter = (string: string): string =>
  string.charAt(0).toUpperCase() + string.slice(1)

const toWords = (inputString: string, joinWords = false): string => {
  const notNullString = inputString || ''
  const trimmedString = notNullString.trim()
  const arrayOfStrings = trimmedString.split(/[\s-]/)

  const splitStringsArray = []
  arrayOfStrings.forEach((tempString) => {
    if (tempString !== '') {
      const splitWords = tempString.split(/(?=[A-Z])/).join(' ')
      splitStringsArray.push(capitalizeFirstLetter(splitWords))
    }
  })

  return joinWords ? splitStringsArray.join('').replace(/\s/g, '') : splitStringsArray.join(' ')
}

const formatNames = (slug: string): { plural: string; singular: string } => {
  const words = toWords(slug, true)
  return isPlural(slug)
    ? {
        plural: words,
        singular: singular(words),
      }
    : {
        plural: plural(words),
        singular: words,
      }
}

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

export const gatsbyNodeTypeName = ({ payloadSlug, prefix = `Payload` }: { payloadSlug: string; prefix?: string }) => {
  const fromSlug = formatNames(payloadSlug)
  const singularName = fromSlug.singular
  return `${prefix}${singularName}`
}
  

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

export const normalizeGlobals = (globalTypes: Array<string | IGlobalTypeObject> | undefined, endpoint: string) => {
  if (!globalTypes) {
    return []
  }
  return globalTypes.map((globalType) => {
    return normalizeGlobal(globalType, endpoint)
  })
}

export const normalizeCollections = (
  collectionTypes: Array<string | ICollectionTypeObject> | undefined,
  endpoint: string
) => {
  if (!collectionTypes) {
    return []
  }
  return collectionTypes.map((collectionType) => normalizeCollection(collectionType, endpoint))
}

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

const normalizeCollectionObject = (collectionType: ICollectionTypeObject, endpoint: string) => {
  const urlPath = collectionType.apiPath ? collectionType.apiPath : collectionType.slug
  return {
  endpoint: new URL(`${urlPath}`, endpoint).href,
    ...collectionType,
    type: collectionType.slug,
  }
}

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
