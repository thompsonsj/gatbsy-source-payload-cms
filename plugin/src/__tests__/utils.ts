import { homeFixture } from "./fixtures"
import { documentRelationships, normalizeCollections, normalizeGlobals } from "../utils"

describe(`fn: extractRelationships`, () => {
  /**
   * Test the dot-object dependency
   *
   * Against principles of testing, but it is useful
   * as a reference for a parsed Payload CMS response.
   */
  it(`returns a dot notation object as expected`, () => {
    expect(documentRelationships(homeFixture)).toMatchSnapshot()
  })

  it(`returns a dot notation object as expected with prefixed keys`, () => {
    expect(documentRelationships(homeFixture, `collectionName`)).toMatchSnapshot()
  })
})

describe(`fn: normalizeCollections`, () => {
  it(`returns normalized collections defined as strings as expected`, () => {
    expect(normalizeCollections([`collection-one`, `collection-two`], `http://localhost:8000/api/`))
      .toMatchInlineSnapshot(`
      [
        {
          "endpoint": "http://localhost:8000/api/collection-one",
          "type": "collection-one",
        },
        {
          "endpoint": "http://localhost:8000/api/collection-two",
          "type": "collection-two",
        },
      ]
    `)
  })
  it(`returns normalized collections defined as objects as expected`, () => {
    expect(
      normalizeCollections(
        [
          {
            slug: `collection-one`,
          },
          {
            slug: `collection-two`,
          },
        ],

        `http://localhost:8000/api/`
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "endpoint": "http://localhost:8000/api/collection-one",
          "slug": "collection-one",
          "type": "collection-one",
        },
        {
          "endpoint": "http://localhost:8000/api/collection-two",
          "slug": "collection-two",
          "type": "collection-two",
        },
      ]
    `)
  })
  it(`returns normalized collections with mixed definition types as expected`, () => {
    expect(
      normalizeCollections(
        [
          `collection-one`,
          {
            slug: `collection-two`,
          },
        ],

        `http://localhost:8000/api/`
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "endpoint": "http://localhost:8000/api/collection-one",
          "type": "collection-one",
        },
        {
          "endpoint": "http://localhost:8000/api/collection-two",
          "slug": "collection-two",
          "type": "collection-two",
        },
      ]
    `)
  })
})

describe(`fn: normalizeGlobals`, () => {
  it(`returns normalized globals defined as strings as expected`, () => {
    expect(normalizeGlobals([`global-one`, `global-two`], `http://localhost:8000/api/`)).toMatchInlineSnapshot(`
      [
        {
          "endpoint": "http://localhost:8000/api/globals/global-one",
          "type": "global-one",
        },
        {
          "endpoint": "http://localhost:8000/api/globals/global-two",
          "type": "global-two",
        },
      ]
    `)
  })
  it(`returns normalized globals defined as objects as expected`, () => {
    expect(
      normalizeGlobals(
        [
          {
            slug: `global-one`,
          },
          {
            slug: `global-two`,
          },
        ],

        `http://localhost:8000/api/`
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "endpoint": "http://localhost:8000/api/globals/global-one",
          "slug": "global-one",
          "type": "global-one",
        },
        {
          "endpoint": "http://localhost:8000/api/globals/global-two",
          "slug": "global-two",
          "type": "global-two",
        },
      ]
    `)
  })
  it(`returns normalized globals with mixed definition types as expected`, () => {
    expect(
      normalizeGlobals(
        [
          `global-one`,
          {
            slug: `global-two`,
          },
        ],

        `http://localhost:8000/api/`
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "endpoint": "http://localhost:8000/api/globals/global-one",
          "type": "global-one",
        },
        {
          "endpoint": "http://localhost:8000/api/globals/global-two",
          "slug": "global-two",
          "type": "global-two",
        },
      ]
    `)
  })
})
