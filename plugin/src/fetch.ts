/**
 * fetch entity (global) or entities (collection)
 *
 * Common functionality for both functions:
 *
 * * Add a `gatsbyNodeType` key to each entity.
 * * If locales are defined for a global/collection, return all localized entities and add a `locale` key.
 */
import qs from "qs"
import { flattenDeep, isEmpty, isNumber, isObject, isString } from "lodash"
import { formatEntity } from "./format-entity"
import { fetchDataMessage } from "./utils"
import { PAGE_COUNT_WARNING_THRESHOLD, PROGRESS_LOG_INTERVAL } from "./constants"

import { type LocaleObject, type LocaleString } from "./types"

export type CollectionOptions = {
  endpoint: string
  /** `type` is set on the returned entity for Gatsby to use when creating nodes.  */
  type: string
  /** If locales are set, return an array of entities each with an additional `locale` key. */
  locales?: Array<LocaleString> | Array<LocaleObject>
  params?: { [key: string]: unknown }
  /**
   * Sets the Payload REST API's own `limit` query param, i.e. documents requested
   * PER PAGE - not a cap on total documents returned. Also disables automatic
   * pagination. Use `maxDocs` to actually cap the total number of documents fetched.
   */
  limit?: number
  /** Stop paginating once at least this many documents have been fetched (per locale, if set). */
  maxDocs?: number
  imageSize?: string
  repopulate?: boolean
}

/**
 * `limit` is easy to confuse with the identically-named Payload REST API query
 * param: setting it inside `params` (rather than as the dedicated `query.limit`)
 * skips the pagination-disabling behavior entirely, so a small page size there
 * multiplies the number of pages - and requests - needed to fetch the whole
 * collection. This is exactly the kind of config mistake that silently turns a
 * handful of requests into thousands; warn about it immediately.
 */
const warnIfLimitSetViaRawParams = (
  reporter: { warn: (message: string) => void },
  params: { [key: string]: unknown },
  query: CollectionOptions
): void => {
  if (isNumber(params?.limit) && !isNumber(query.limit)) {
    reporter.warn(
      `[gatsby-source-payload-cms] "limit" was set inside "params" for ${query.endpoint} - this is sent ` +
        `as a raw query parameter and does NOT enable this plugin's pagination controls, so a small value ` +
        `here can multiply the number of requests needed to fetch the whole collection. Use the dedicated ` +
        `"limit" option to set page size, or "maxDocs" to cap the total number of documents fetched.`
    )
  }
}

/**
 * Warn before firing a surprisingly large number of page requests for a single
 * collection/locale combination, rather than letting it run silently.
 */
const warnIfTooManyPages = (
  reporter: { warn: (message: string) => void },
  { pagesToGet, localeCount, endpoint }: { pagesToGet: Array<number>; localeCount: number; endpoint: string }
): void => {
  if (pagesToGet.length <= PAGE_COUNT_WARNING_THRESHOLD) {
    return
  }
  const totalRequests = pagesToGet.length * Math.max(localeCount, 1)
  reporter.warn(
    `[gatsby-source-payload-cms] About to fetch ${pagesToGet.length} page(s) ${
      localeCount > 1 ? `x ${localeCount} locale(s) (~${totalRequests} requests) ` : ``
    }from ${endpoint}. If this is unexpected, check the collection's "limit" (page size) and consider ` +
      `setting "maxDocs" to cap the total number of documents fetched.`
  )
}

/**
 * Reduce `pagesToGet` down to only the pages needed to reach `maxDocs`, using
 * `pageSize` (the size of a page already fetched, or about to be) as an estimate
 * of how many documents each additional page will contain. `alreadyFetched` is
 * the number of documents already counted towards `maxDocs` that are NOT part of
 * `pagesToGet` itself (e.g. the initial unpaginated response for a collection
 * without locales - for locales, page 1 is always in `pagesToGet` already, so
 * pass 0).
 */
const capPagesToGetForMaxDocs = (
  pagesToGet: Array<number>,
  maxDocs: number | undefined,
  pageSize: number,
  alreadyFetched: number
): Array<number> => {
  if (!isNumber(maxDocs)) {
    return pagesToGet
  }
  const safePageSize = pageSize || 1
  const remaining = Math.max(0, maxDocs - alreadyFetched)
  const pagesNeeded = Math.ceil(remaining / safePageSize)
  return pagesToGet.slice(0, pagesNeeded)
}

/** Log a concise progress summary every `PROGRESS_LOG_INTERVAL` pages, distinct from the per-request debug line. */
const logProgress = (
  reporter: { info: (message: string) => void },
  counter: { fetched: number },
  total: number,
  label: string
): void => {
  counter.fetched += 1
  if (counter.fetched % PROGRESS_LOG_INTERVAL === 0 && counter.fetched < total) {
    reporter.info(`[gatsby-source-payload-cms] ${label}: fetched ${counter.fetched}/${total} page(s)...`)
  }
}

export const fetchEntity = async (query: CollectionOptions, context) => {
  const { reporter, axiosInstance } = context

  const params = query.params || {}

  /** @type AxiosRequestConfig */
  const options = {
    method: `GET`,
    url: query.endpoint,
    params: {
      ...params,
      ...(isNumber(query.limit) && { limit: query.limit }),
    },
    // Source: https://github.com/axios/axios/issues/5058#issuecomment-1379970592
    paramsSerializer: {
      serialize: (parameters) => qs.stringify(parameters, { encodeValuesOnly: true }),
    },
  }

  try {
    reporter.info(fetchDataMessage(options.url, options.paramsSerializer.serialize(options.params)))

    // Handle internationalization
    const fallbackLocale = context.pluginOptions?.fallbackLocale
    const locales = query.locales || []

    /**
     * If locales are defined for a collection/global, return
     * multiple nodes (rather than an obect keyed by locale, as
     * stored in the Payload database). This is better for Gatsby
     * as we can read `updatedAt` for timestamps, set a `type` on
     * the data...etc.
     *
     * i.e. it is better to treat each translation as a node.
     */
    if (locales.length > 0) {
      const localizationsPromises = locales.map(async (locale) => {
        const localeString = isString(locale) ? locale : locale.locale
        const { data: localizationResponse } = await axiosInstance({
          ...options,
          params: {
            ...params,
            fallbackLocale,
            locale: localeString,
            ...(isObject(locale) && (locale as LocaleObject).params)
          },
        })
        return formatEntity(
          {
            data: localizationResponse,
            locale: localeString,
            gatsbyNodeType: query.type,
          },
          context
        )
      })

      // Run queries in parallel
      const localizationsData = await Promise.all(localizationsPromises)

      return localizationsData
    } else {
      // Fetch default entity based on request options
      const { data } = await axiosInstance(options)
      return [
        formatEntity(
          {
            data,
            gatsbyNodeType: query.type,
          },
          context
        ),
      ]
    }
  } catch (error) {
    // Network-level failures (DNS, connection refused, timeout) have no `.response`
    // at all - only HTTP error responses do. Guard the optional chain rather than
    // assuming `.response` exists, so those still panic with a clear message
    // instead of crashing on `Cannot read properties of undefined`.
    if (error.response?.status !== 404) {
      reporter.panic(`Failed to fetch data from Payload ${options.url} with ${JSON.stringify(options)}`, error)
    }
    return []
  }
}

export const fetchEntities = async (query: CollectionOptions, context) => {
  const { reporter, axiosInstance } = context

  const params = query.params || {}

  warnIfLimitSetViaRawParams(reporter, params, query)

  const skipPagination = isNumber(query.limit)

  const repopulate = query.repopulate || false

  /** @type AxiosRequestConfig */
  const options = {
    method: `GET`,
    url: query.endpoint,
    params: {
      ...params,
      ...(skipPagination && { limit: query.limit }),
    },
    paramsSerializer: {
      serialize: (parameters) => qs.stringify(parameters, { encodeValuesOnly: true }),
    },
  }

  try {
    reporter.info(fetchDataMessage(options.url, options.paramsSerializer.serialize(options.params)))

    /**
     * Always get non-localized response to either:
     *
     * * return non-localized collection; or
     * * determine pagination for localized collection.
     */

    const { data: response } = await axiosInstance(options)

    const data = response?.docs || response

    const page = Number.parseInt(response.page || 1, 10)
    const pageCount = Number.parseInt(response.totalPages || 1, 10)

    let pagesToGet = Array.from({
      length: pageCount - page,
    }).map((_, index) => index + page + 1)

    // Handle internationalization
    // If locales are active, always fetch page 1 - we need to rerun the query to get localizations.
    const locales = query.locales || []

    if (skipPagination) {
      pagesToGet = []
    }
    if (locales.length > 0) {
      pagesToGet = [1, ...pagesToGet]
      if (skipPagination) {
        pagesToGet = [1]
      }
    }

    // `data.length` (the size of the page already fetched above) is used as an
    // estimate of how many documents each further page will contain.
    const pageSize = Array.isArray(data) ? data.length : 0
    pagesToGet = capPagesToGetForMaxDocs(pagesToGet, query.maxDocs, pageSize, locales.length > 0 ? 0 : data.length)

    warnIfTooManyPages(reporter, { pagesToGet, localeCount: locales.length, endpoint: query.endpoint })

    const totalPagesToFetch = pagesToGet.length

    const fallbackLocale = context.pluginOptions?.fallbackLocale
    if (locales.length > 0) {
      const localizationsPromises = locales.map(async (locale) => {
        const localeString = isString(locale) ? locale : locale.locale
        const pagesFetchedCounter = { fetched: 0 }
        const fetchPagesPromises = pagesToGet.map((page) => {
          return (async () => {
            const fetchOptions = {
              ...options,
              params: {
                ...options.params,
                page,
                fallbackLocale,
                locale: localeString,
                ...(isObject(locale) && (locale as LocaleObject).params)
              },
            }

            reporter.info(fetchDataMessage(fetchOptions.url, options.paramsSerializer.serialize(fetchOptions.params)))

            try {
              const data = await axiosInstance(fetchOptions)
              logProgress(reporter, pagesFetchedCounter, totalPagesToFetch, `${query.type} (${localeString})`)
              return data.data.docs
            } catch (error) {
              reporter.panic(`Failed to fetch data from Payload ${fetchOptions.url}`, error)
            }
          })()
        })
        const results = await Promise.all(fetchPagesPromises)
        const cappedResults = isNumber(query.maxDocs)
          ? flattenDeep(results).filter(Boolean).slice(0, query.maxDocs)
          : flattenDeep(results).filter(Boolean)

        if (!repopulate) {
          return cappedResults
          .map((entry) =>
            formatEntity(
              {
                data: entry,
                gatsbyNodeType: query.type,
                locale: localeString,
                ...(query.imageSize && { payloadImageSize: query.imageSize }),
              },
              context
            )
          )
          .filter((entity): any => !isEmpty(entity))
        }

        // repopulate results
        const fetchOptions = {
          ...options,
          params: {
            ...options.params,
            fallbackLocale,
            locale: localeString,
            ...(isObject(locale) && (locale as LocaleObject).params)
          },
        }

        const articlePromises = cappedResults.map((doc) => {
          return (async () => {
            const options = {
              ...fetchOptions,
              url: `${fetchOptions.url}/${doc.id}`,
            }
            try {
              const data = await axiosInstance(options)
              return data.data
            } catch (error) {
              reporter.panic(`Failed to fetch data from Payload ${options.url}`, error)
            }
          })()
        })

        const repopulatedResults = await Promise.all(articlePromises)

        return flattenDeep(repopulatedResults)
          .filter(Boolean)
          .map((entry) =>
            formatEntity(
              {
                data: entry,
                gatsbyNodeType: query.type,
                locale: localeString,
                ...(query.imageSize && { payloadImageSize: query.imageSize }),
              },
              context
            )
          )
          .filter((entity): any => !isEmpty(entity))
      })

      // Run queries in parallel
      const localizationsData = await Promise.all(localizationsPromises)

      return flattenDeep(localizationsData)
    } else {
      const pagesFetchedCounter = { fetched: 0 }
      const fetchPagesPromises = pagesToGet.map((page) => {
        return (async () => {
          const fetchOptions = {
            ...options,
            params: {
              ...options.params,
              page,
            },
          }

          reporter.info(fetchDataMessage(fetchOptions.url, options.paramsSerializer.serialize(fetchOptions.params)))

          try {
            const data = await axiosInstance(fetchOptions)
            logProgress(reporter, pagesFetchedCounter, totalPagesToFetch, query.type)
            return data.data.docs
          } catch (error) {
            reporter.panic(`Failed to fetch data from Payload ${fetchOptions.url}`, error)
          }
        })()
      })

      const results = await Promise.all(fetchPagesPromises)

      const combinedData = [...data.filter(Boolean), ...flattenDeep(results).filter(Boolean)]
      const cleanedData = (isNumber(query.maxDocs) ? combinedData.slice(0, query.maxDocs) : combinedData)
        .map((entry) =>
          formatEntity(
            {
              data: entry,
              gatsbyNodeType: query.type,
              ...(query.imageSize && { payloadImageSize: query.imageSize }),
            },
            context
          )
        )
        .filter((entity): any => !isEmpty(entity))

      return cleanedData
    }
  } catch (error) {
    reporter.panic(`Failed to fetch data from Payload ${options.url}`, error)
    return []
  }
}
