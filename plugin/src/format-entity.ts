interface IFormatEntry {
  data: { [key: string]: unknown }
  locale?: string
  gatsbyNodeType: string
}

export const formatEntity = ({ data, locale, gatsbyNodeType }: IFormatEntry) => {
  return {
    ...data,
    gatsbyNodeType,
    ...(locale && { locale }),
  }
}
