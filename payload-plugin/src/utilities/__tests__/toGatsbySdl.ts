import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLScalarType,
  GraphQLNonNull,
} from 'graphql'
import { toGatsbySdl } from '../toGatsbySdl.js'

const PayloadJSON = new GraphQLScalarType({
  name: `JSON`,
  serialize: (value) => value,
})

const buildSampleSchema = (): GraphQLSchema => {
  const LandingPage = new GraphQLObjectType({
    name: `LandingPage`,
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString) },
      title: { type: GraphQLString },
      meta: { type: PayloadJSON },
      description: {
        type: GraphQLString,
        description: 'Uses a `backtick` in the description',
      },
    },
  })

  const LandingPageTag = new GraphQLObjectType({
    name: `LandingPageTag`,
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString) },
      name: { type: GraphQLString },
    },
  })

  const LandingPage_Ctas = new GraphQLObjectType({
    name: `LandingPage_Ctas`,
    fields: {
      label: { type: GraphQLString },
    },
  })

  const Query = new GraphQLObjectType({
    name: `Query`,
    fields: {
      LandingPage: {
        type: LandingPage,
        args: { id: { type: GraphQLString } },
      },
      LandingPageTag: {
        type: LandingPageTag,
        args: { id: { type: GraphQLString } },
      },
    },
  })

  return new GraphQLSchema({
    query: Query,
    types: [LandingPage_Ctas],
  })
}

describe(`toGatsbySdl`, () => {
  it(`renames the JSON scalar to PayloadJSON`, () => {
    const sdl = toGatsbySdl(buildSampleSchema(), [`LandingPage`])
    expect(sdl).toContain(`PayloadJSON`)
    expect(sdl).not.toMatch(/(?<![A-Za-z])JSON(?![A-Za-z])/)
  })

  it(`replaces backticks in descriptions`, () => {
    const sdl = toGatsbySdl(buildSampleSchema(), [`LandingPage`])
    expect(sdl).toContain(`Uses a "backtick" in the description`)
    expect(sdl).not.toContain('`')
  })

  it(`adds implements Node to listed collection/global types`, () => {
    const sdl = toGatsbySdl(buildSampleSchema(), [`LandingPage`, `LandingPageTag`])
    expect(sdl).toContain(`type LandingPage implements Node {`)
    expect(sdl).toContain(`type LandingPageTag implements Node {`)
    expect(sdl).toContain(`type LandingPage_Ctas {`)
    expect(sdl).not.toContain(`type LandingPage_Ctas implements Node`)
  })

  it(`prefixes node type names without mangling nested or longer sibling types`, () => {
    const sdl = toGatsbySdl(buildSampleSchema(), [`LandingPage`, `LandingPageTag`], {
      nodePrefix: `Payload`,
    })
    expect(sdl).toContain(`type PayloadLandingPage implements Node {`)
    expect(sdl).toContain(`type PayloadLandingPageTag implements Node {`)
    expect(sdl).toContain(`type LandingPage_Ctas {`)
    expect(sdl).toContain(`PayloadLandingPage(`)
    expect(sdl).not.toContain(`type LandingPage implements Node`)
  })
})
