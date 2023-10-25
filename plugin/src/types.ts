import type { PluginOptions as GatsbyDefaultPluginOptions, IPluginRefOptions } from "gatsby"
import { NODE_TYPES } from "./constants"

export interface IAuthorInput {
  id: number
  name: string
}

export interface IPayloadApiResponse {
  id: string
  createdAt?: string
  updatedAt?: string
}

export interface IPayloadGlobalApiResponse extends IPayloadApiResponse {
  globalType: string
}

export type LocaleString = string

export type LocaleObject = {
  locale: string,
  params: { [key: string]: unknown }
}

export type NodeBuilderInput =
  | { type: typeof NODE_TYPES.Author; data: IAuthorInput }
  | { type: string; data: IPayloadGlobalApiResponse }

export interface ICollectionTypeObject {
  slug: string
  locales?: Array<LocaleString> | Array<LocaleObject>
  params?: { [key: string]: string }
  limit?: number
  repopulate?: boolean
}

export interface IUploadTypeObject extends ICollectionTypeObject {
  slug: string
  locales?: Array<string>
  params?: { [key: string]: string }
  limit?: number
  imageSize?: string
}

export interface IGlobalTypeObject extends ICollectionTypeObject {
  slug: string
  locales?: Array<string>
  params?: { [key: string]: string }
  limit?: number
  apiPath?: string
}

interface IPluginOptionsKeys {
  endpoint: string
  schemaCustomizations?: string
  globalTypes?: Array<string | IGlobalTypeObject>
  collectionTypes?: Array<string | ICollectionTypeObject>
  uploadTypes?: Array<string | IUploadTypeObject>
}

/**
 * Gatsby expects the plugin options to be of type "PluginOptions" for gatsby-node APIs (e.g. sourceNodes)
 */
export interface IPluginOptionsInternal extends IPluginOptionsKeys, GatsbyDefaultPluginOptions {}

/**
 * These are the public TypeScript types for consumption in gatsby-config
 */
export interface IPluginOptions extends IPluginOptionsKeys, IPluginRefOptions {}
