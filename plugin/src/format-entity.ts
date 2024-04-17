import { isFunction } from "lodash"

interface IFormatEntry {
  data: { [key: string]: unknown }
  locale?: string
  gatsbyNodeType: string
  payloadImageSize?: string
}

export const formatEntity = ({ data, locale, gatsbyNodeType, payloadImageSize }: IFormatEntry, context?: any) => {
  if (!context.pluginOptions.nodeTransform) {
    return addReservedProperties({data, locale, gatsbyNodeType, payloadImageSize})
  }
  let transformedRes: { [key: string]: any } = {}
  if (isFunction(context.pluginOptions.nodeTransform)) {
    transformedRes = context.pluginOptions.nodeTransform(data)
  } else {
    transformedRes = data
  }
  return addReservedProperties({data: transformedRes, locale, gatsbyNodeType, payloadImageSize})
}

const addReservedProperties = ({ data, locale, gatsbyNodeType, payloadImageSize }: IFormatEntry) => ({
  ...data,
  id: data.id, // added to pass typing check
  gatsbyNodeType,
  ...(locale && { locale: locale }),
  payloadImageSize,
})
