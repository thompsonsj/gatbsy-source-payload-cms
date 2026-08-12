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
  params?: { [key: string]: unknown }
}

export type NodeBuilderInput =
  | { type: typeof NODE_TYPES.Author; data: IAuthorInput }
  | { type: string; data: IPayloadGlobalApiResponse }

export interface ICollectionTypeObject {
  slug: string
  locales?: Array<LocaleString> | Array<LocaleObject>
  params?: { [key: string]: string }
  /**
   * Sets the Payload REST API's own `limit` query param — i.e. how many documents
   * are requested **per page**, not a cap on the total number of documents
   * returned. Setting this also disables this plugin's automatic pagination, so
   * only the first page (of this size) is fetched.
   *
   * To actually cap the total number of documents fetched for a collection
   * (e.g. for a fast local/dev build), use `maxDocs` instead.
   */
  limit?: number
  /**
   * Stop paginating once at least this many documents have been fetched for the
   * collection (per locale, if locales are set). Unlike `limit`, this does not
   * change the API page size — it just stops requesting further pages once
   * enough documents have come back, so it's a genuine "give me N documents"
   * cap rather than a page-size override.
   */
  maxDocs?: number
  repopulate?: boolean
  apiPath?: string
}

export interface IUploadTypeObject extends ICollectionTypeObject {
  slug: string
  locales?: Array<string>
  params?: { [key: string]: string }
  imageSize?: string
}

export interface IGlobalTypeObject extends ICollectionTypeObject {
  slug: string
  locales?: Array<LocaleString> | Array<LocaleObject>
  params?: { [key: string]: string }
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
