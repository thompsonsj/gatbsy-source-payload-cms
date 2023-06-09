/**
 * fetch entity (global) or entities (collection)
 *
 * Common functionality for both functions:
 *
 * * Add a `gatsbyNodeType` key to each entity.
 * * If locales are defined for a global/collection, return all localized entities and add a `locale` key.
 */
import qs from "qs"
import { flattenDeep, isEmpty } from "lodash"
import { formatEntity } from "./format-entity"
import { fetchDataMessage } from "./utils"

export type CollectionOptions = {
  endpoint: string
  /** `type` is set on the returned entity for Gatsby to use when creating nodes.  */
  type: string
  /** If locales are set, return an array of entities each with an additional `locale` key. */
  locales?: Array<string>
  params?: { [key: string]: unknown }
}

export const fetchEntity = async (query: CollectionOptions, context) => {
  const { reporter, axiosInstance } = context

  const params = query.params || {}

  /** @type AxiosRequestConfig */
  const options = {
    method: `GET`,
    url: query.endpoint,
    params: params,
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
        const { data: localizationResponse } = await axiosInstance({
          ...options,
          params: {
            ...params,
            fallbackLocale,
            locale,
          },
        })
        return formatEntity(
          {
            data: localizationResponse,
            locale,
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
    if (error.response.status !== 404) {
      reporter.panic(`Failed to fetch data from Payload ${options.url} with ${JSON.stringify(options)}`, error)
    }
    return []
  }
}

export const fetchEntities = async (query: CollectionOptions, context) => {
  const { reporter, axiosInstance } = context

  const params = query.params || {}

  /** @type AxiosRequestConfig */
  const options = {
    method: `GET`,
    url: query.endpoint,
    params: params,
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

    const pagesToGet = Array.from({
      length: pageCount - page,
    }).map((_, index) => index + page + 1)

    // Handle internationalization
    const fallbackLocale = context.pluginOptions?.fallbackLocale
    const locales = query.locales || []
    if (locales.length > 0 && pagesToGet.length > 0) {
      const localizationsPromises = locales.map(async (locale) => {
        const fetchPagesPromises = pagesToGet.map((page) => {
          return (async () => {
            const fetchOptions = {
              ...options,
              params: {
                ...options.params,
                page,
                fallbackLocale,
                locale,
              },
            }

            reporter.info(fetchDataMessage(fetchOptions.url, options.paramsSerializer.serialize(fetchOptions.params)))

            try {
              const data = await axiosInstance(fetchOptions)
              return data.data.docs
            } catch (error) {
              reporter.panic(`Failed to fetch data from Payload ${fetchOptions.url}`, error)
            }
          })()
        })
        const results = await Promise.all(fetchPagesPromises)

        return [...data, ...flattenDeep(results)]
          .map((entry) =>
            formatEntity(
              {
                data: entry,
                gatsbyNodeType: query.type,
                locale,
              },
              context
            )
          )
          .filter((entity): any => !isEmpty(entity))
      })

      // Run queries in parallel
      const localizationsData = await Promise.all(localizationsPromises)

      return flattenDeep(localizationsData)
    } else if (locales.length > 0) {
      const localizationsPromises = locales.map(async (locale) => {
        return (async () => {
          const fetchOptions = {
            ...options,
            params: {
              ...options.params,
              page,
              fallbackLocale,
              locale,
            },
          }

          reporter.info(fetchDataMessage(fetchOptions.url, options.paramsSerializer.serialize(fetchOptions.params)))

          try {
            const data = await axiosInstance(fetchOptions)
            return data.data.docs
              .map((entry) =>
                formatEntity(
                  {
                    data: entry,
                    gatsbyNodeType: query.type,
                    locale,
                  },
                  context
                )
              )
              .filter((entity): any => !isEmpty(entity))
          } catch (error) {
            reporter.panic(`Failed to fetch data from Payload ${fetchOptions.url}`, error)
          }
        })()
      })

      const results = await Promise.all(localizationsPromises)

      return flattenDeep(results)
    } else {
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
            return data.data.docs
          } catch (error) {
            reporter.panic(`Failed to fetch data from Payload ${fetchOptions.url}`, error)
          }
        })()
      })

      const results = await Promise.all(fetchPagesPromises)

      const cleanedData = [...data, ...flattenDeep(results)]
        .map((entry) =>
          formatEntity(
            {
              data: entry,
              gatsbyNodeType: query.type,
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
