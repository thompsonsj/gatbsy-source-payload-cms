import { payloadFieldType } from "./payload-field-type"
import { isFunction } from "lodash"

interface IFormatEntry {
  data: { [key: string]: unknown }
  locale?: string
  gatsbyNodeType: string
}

export const parsePayloadResponse = (props: { [key: string]: any }) => {
  const parsedProps: { [key: string]: any } = {}
  Object.keys(props).forEach((value) => {
    /**
     * Serilaize Slate JSON
     *
     * There is no schema to interpret - it is not useful to
     * query this object in GraphQL. Serialize it to a string
     * so that it can be converted to JSON when needed in
     * applications.
     */
    if (payloadFieldType(props[value]) === `richText`) {
      parsedProps[value] = JSON.stringify(props[value])
    } else if (
      /**
       * Serialize block layouts
       *
       * There is no schema to interpret - it is not useful to
       * query this object in GraphQL. Serialize it to a string
       * so that it can be converted to JSON when needed in
       * applications.
       */
      payloadFieldType(props[value]) === `blocks`
    ) {
      parsedProps[value] = JSON.stringify(props[value])
    }

    // support array
    else if (payloadFieldType(props[value]) === `array`) {
      parsedProps[value] = props[value].map((block: any) => parsePayloadResponse(block))
    } else {
      parsedProps[value] = props[value]
    }
  })
  return parsedProps
}

export const formatEntity = ({ data, locale, gatsbyNodeType }: IFormatEntry, context?: any) => {
  const res = {
    ...parsePayloadResponse(data),
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
