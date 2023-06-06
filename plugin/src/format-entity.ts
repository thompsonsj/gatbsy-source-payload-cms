import { isFunction } from "lodash"

interface IFormatEntry {
  data: { [key: string]: unknown }
  locale?: string
  gatsbyNodeType: string
}

export const formatEntity = ({ data, locale, gatsbyNodeType }: IFormatEntry, context?: any) => {
  const res = {
    ...data,
    gatsbyNodeType,
    ...(locale && { locale: locale }),
  }
  const transformedRes: { [key: string]: any } = {}
  Object.keys(res).forEach((value) => {
    if (isFunction(context.pluginOptions.nodeTransform[value])) {
      transformedRes[value] = context.pluginOptions.nodeTransform[value](res[value])
    } else {
      transformedRes[value] = res[value]
    }
  })
  return transformedRes
}
