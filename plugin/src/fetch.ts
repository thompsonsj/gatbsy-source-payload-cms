import qs from "qs"
import { keyBy } from "lodash"

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
    reporter.info(`Starting to fetch data from Payload - ${query.endpoint}`)

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
        return {
          ...localizationResponse,
          locale,
          gatsbyNodeType: query.type,
        }
      })

      // Run queries in parallel
      const localizationsData = await Promise.all(localizationsPromises)

      return localizationsData
    } else {
      // Fetch default entity based on request options
      const { data } = await axiosInstance(options)
      return [
        {
          ...data,
          gatsbyNodeType: query.type,
        },
      ]
    }
  } catch (error) {
    if (error.response.status !== 404) {
      reporter.panic(`Failed to fetch data from Payload ${options.url} with ${JSON.stringify(options)}`, error)
    }
    return []
  }
}
