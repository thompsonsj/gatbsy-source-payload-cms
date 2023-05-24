import { payloadFieldType } from "./payload-field-type"
import { isPlainObject } from "lodash"

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
    }

    /**
     * Serilaize images
     *
     * Although Payload CMS images have a common schema to
     * some extent, the sizes array will have different keys
     * depending on the different image transformations applied.
     *
     * TODO create asset nodes and investigate Gatsby's CDN feature
     */
    if (payloadFieldType(props[value]) === `upload`) {
      parsedProps[value] = JSON.stringify(props[value])
    }

    /**
     * Serilaize block layouts
     *
     * There is no schema to interpret - it is not useful to
     * query this object in GraphQL. Serialize it to a string
     * so that it can be converted to JSON when needed in
     * applications.
     */
    if (payloadFieldType(props[value]) === `blocks`) {
      parsedProps[value] = JSON.stringify(props[value])
    }

    // support array
    if (payloadFieldType(props[value]) === `array`) {
      parsedProps[value] = props[value].map((block: any) => parsePayloadResponse(block))
    }

    if (payloadFieldType(props[value]) === `other`) {
      // support groups
      if (isPlainObject(props[value])) {
        parsedProps[value] = parsePayloadResponse(props[value])
      } else {
        parsedProps[value] = props[value]
      }
    }
  })
  return parsedProps
}

export const formatEntity = ({ data, locale, gatsbyNodeType }: IFormatEntry) => {
  return {
    ...parsePayloadResponse(data),
    gatsbyNodeType,
    ...(locale && { locale }),
  }
}
