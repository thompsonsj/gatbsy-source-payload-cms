import qs from "qs"

export type CollectionOptions = {
  endpoint: string
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

    // Fetch default entity based on request options
    const { data } = await axiosInstance(options)

    // Fetch other localizations of this entry if there are any
    const otherLocalizationsPromises = locales.map(async (locale) => {
      const { data: localizationResponse } = await axiosInstance({
        ...options,
        params: {
          ...params,
          fallbackLocale,
          locale,
        },
      })
      return localizationResponse.data
    })

    // Run queries in parallel
    const otherLocalizationsData = await Promise.all(otherLocalizationsPromises)

    return [data, ...otherLocalizationsData]
  } catch (error) {
    if (error.response.status !== 404) {
      reporter.panic(`Failed to fetch data from Payload ${options.url} with ${JSON.stringify(options)}`, error)
    }
    return []
  }
}
