import { resolvePayloadUnionType } from "../resolve-payload-union-type"

describe(`resolvePayloadUnionType`, () => {
  const layoutSpec = {
    types: [`ContentLayout`, `Cards`],
    typeMap: {
      contentLayout: `ContentLayout`,
      cards: `Cards`,
    },
  }

  const videoSpec = {
    types: [`VimeoVideo`, `YoutubeVideo`],
    typeMap: {
      'vimeo-videos': `VimeoVideo`,
      'youtube-videos': `YoutubeVideo`,
    },
  }

  const singleSpec = {
    types: [`Logo`],
    typeMap: { logos: `Logo` },
  }

  it(`resolves blocks via blockType`, () => {
    expect(resolvePayloadUnionType({ blockType: `cards` }, layoutSpec)).toEqual(`Cards`)
  })

  it(`resolves polymorphic relationships via collection`, () => {
    expect(resolvePayloadUnionType({ collection: `vimeo-videos` }, videoSpec)).toEqual(`VimeoVideo`)
  })

  it(`resolves polymorphic relationships via relationTo`, () => {
    expect(resolvePayloadUnionType({ relationTo: `youtube-videos` }, videoSpec)).toEqual(
      `YoutubeVideo`
    )
  })

  it(`falls back to the sole member type`, () => {
    expect(resolvePayloadUnionType({}, singleSpec)).toEqual(`Logo`)
    expect(resolvePayloadUnionType(null, singleSpec)).toEqual(`Logo`)
  })

  it(`returns undefined when multi-member and no discriminant matches`, () => {
    expect(resolvePayloadUnionType({ blockType: `unknown` }, layoutSpec)).toBeUndefined()
    expect(resolvePayloadUnionType({}, layoutSpec)).toBeUndefined()
  })

  it(`prefers blockType over collection when both are present`, () => {
    expect(
      resolvePayloadUnionType(
        { blockType: `cards`, collection: `vimeo-videos` },
        { types: [`Cards`, `VimeoVideo`], typeMap: { cards: `Cards`, 'vimeo-videos': `VimeoVideo` } }
      )
    ).toEqual(`Cards`)
  })
})
