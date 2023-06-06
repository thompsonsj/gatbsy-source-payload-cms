// TODO consider moving this to the Payload CMS api response,
// where we know the fieldType.
export const payloadFieldType = (
  value: any
): "upload" | "richText" | "array" | "block" | "blocks" | "polymorphic" | "other" => {
  if (!value) {
    return `other`
  }
  if (typeof value === `object` && `filename` in value) {
    return `upload`
  }
  if (typeof value === `object` && isPayloadPolymorphic(value)) {
    return `polymorphic`
  }

  if (isPayloadBlock(value)) {
    return `block`
  }
  // only support arrays (strings can be passed as regular props)
  if (value.constructor !== Array) {
    return `other`
  }
  // an array of Payload CMS blocks has a `blockType` field
  if (value.find((item) => typeof item === `object` && isPayloadBlock(item))) {
    return `blocks`
  }
  // richText always has a top-level children key for each array item (check first only)
  // eslint-disable-next-line no-prototype-builtins
  if (value.find((item) => typeof item === `object` && item.hasOwnProperty(`children`))) {
    return `richText`
  }
  // the Payload array field will contain other Payload fields
  if (
    value.every(
      (item) => typeof item === `object` && Object.keys(item).find((key) => payloadFieldType(item[key])! == `other`)
    )
  ) {
    return `array`
  }
  return `other`
}

const isPayloadBlock = (value: { [key: string]: any }) =>
  // eslint-disable-next-line no-prototype-builtins
  value.hasOwnProperty(`blockType`) && value.hasOwnProperty(`id`)

const isPayloadPolymorphic = (value: { [key: string]: any }) =>
  // eslint-disable-next-line no-prototype-builtins
  value.hasOwnProperty(`relationTo`) && value.hasOwnProperty(`value`)
