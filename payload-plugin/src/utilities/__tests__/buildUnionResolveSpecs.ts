import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLUnionType,
  GraphQLList,
} from 'graphql'
import { buildUnionResolveSpecs, getBlockTypeMap } from '../buildUnionResolveSpecs.js'

const ContentLayout = new GraphQLObjectType({
  name: `ContentLayout`,
  extensions: { blockSlug: `contentLayout` },
  fields: {
    blockType: { type: GraphQLString },
    title: { type: GraphQLString },
  },
})

const Cards = new GraphQLObjectType({
  name: `Cards`,
  extensions: { blockSlug: `cards` },
  fields: {
    blockType: { type: GraphQLString },
  },
})

const Logo = new GraphQLObjectType({
  name: `Logo`,
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const VimeoVideo = new GraphQLObjectType({
  name: `VimeoVideo`,
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const YoutubeVideo = new GraphQLObjectType({
  name: `YoutubeVideo`,
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const LandingPage_Layout = new GraphQLUnionType({
  name: `LandingPage_Layout`,
  types: [ContentLayout, Cards],
  resolveType: () => `ContentLayout`,
})

const LogoList_Logos = new GraphQLUnionType({
  name: `LogoList_Logos`,
  types: [Logo],
  resolveType: () => `Logo`,
})

const Video_Video = new GraphQLUnionType({
  name: `Video_Video`,
  types: [VimeoVideo, YoutubeVideo],
  resolveType: () => `VimeoVideo`,
})

const Query = new GraphQLObjectType({
  name: `Query`,
  fields: {
    layout: { type: new GraphQLList(LandingPage_Layout) },
    logos: { type: new GraphQLList(LogoList_Logos) },
    video: { type: Video_Video },
  },
})

const buildSampleSchema = (): GraphQLSchema =>
  new GraphQLSchema({
    query: Query,
    types: [ContentLayout, Cards, Logo, VimeoVideo, YoutubeVideo],
  })

describe(`getBlockTypeMap`, () => {
  it(`reads blockSlug extensions from object types`, () => {
    expect(getBlockTypeMap(buildSampleSchema())).toEqual({
      contentLayout: `ContentLayout`,
      cards: `Cards`,
    })
  })
})

describe(`buildUnionResolveSpecs`, () => {
  it(`builds typeMaps for block and collection unions`, () => {
    const specs = buildUnionResolveSpecs(buildSampleSchema(), {
      blockTypeMap: {
        contentLayout: `ContentLayout`,
        cards: `Cards`,
      },
      collectionTypeMap: {
        logos: `Logo`,
        'vimeo-videos': `VimeoVideo`,
        'youtube-videos': `YoutubeVideo`,
      },
    })

    const layout = specs.find((spec) => spec.name === `LandingPage_Layout`)
    expect(layout).toEqual({
      name: `LandingPage_Layout`,
      types: [`ContentLayout`, `Cards`],
      typeMap: {
        contentLayout: `ContentLayout`,
        cards: `Cards`,
      },
    })

    const logos = specs.find((spec) => spec.name === `LogoList_Logos`)
    expect(logos).toEqual({
      name: `LogoList_Logos`,
      types: [`Logo`],
      typeMap: {
        logos: `Logo`,
      },
    })

    const video = specs.find((spec) => spec.name === `Video_Video`)
    expect(video).toEqual({
      name: `Video_Video`,
      types: [`VimeoVideo`, `YoutubeVideo`],
      typeMap: {
        'vimeo-videos': `VimeoVideo`,
        'youtube-videos': `YoutubeVideo`,
      },
    })
  })

  it(`applies renameTypeName to member types and typeMap values`, () => {
    const specs = buildUnionResolveSpecs(buildSampleSchema(), {
      blockTypeMap: {},
      collectionTypeMap: {
        logos: `Logo`,
      },
      renameTypeName: (name) => (name === `Logo` ? `PayloadLogo` : name),
    })

    const logos = specs.find((spec) => spec.name === `LogoList_Logos`)
    expect(logos?.types).toEqual([`PayloadLogo`])
    expect(logos?.typeMap).toEqual({ logos: `PayloadLogo` })
  })
})
