import type { PluginOptions as GatsbyDefaultPluginOptions, IPluginRefOptions } from "gatsby"
import { NODE_TYPES } from "./constants"

export interface IAuthorInput {
  id: number
  name: string
}

export interface IPostImageInput {
  url: string
  alt: string
  width: number
  height: number
}

export interface IPostInput {
  id: number
  slug: string
  title: string
  image: IPostImageInput
  author: string
}

export type NodeBuilderInput =
  | { type: typeof NODE_TYPES.Author; data: IAuthorInput }
  | { type: typeof NODE_TYPES.Post; data: IPostInput }

interface IPluginOptionsKeys {
  endpoint: string
}

/**
 * Gatsby expects the plugin options to be of type "PluginOptions" for gatsby-node APIs (e.g. sourceNodes)
 */
export interface IPluginOptionsInternal extends IPluginOptionsKeys, GatsbyDefaultPluginOptions {}

/**
 * These are the public TypeScript types for consumption in gatsby-config
 */
export interface IPluginOptions extends IPluginOptionsKeys, IPluginRefOptions {}
