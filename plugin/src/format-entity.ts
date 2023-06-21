import { isFunction } from "lodash"

interface IFormatEntry {
  data: { [key: string]: unknown }
  locale?: string
  gatsbyNodeType: string
  gatsbyImageCdn: string
}

export const formatEntity = ({ data, locale, gatsbyNodeType, gatsbyImageCdn }: IFormatEntry, context?: any) => {
  const res = {
    ...data,
    gatsbyNodeType,
    ...(locale && { locale: locale }),
    ...(gatsbyImageCdn && { gatsbyImageCdn: gatsbyImageCdn }),
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
