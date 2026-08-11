import { createServer, Server, IncomingHttpHeaders } from "http"
import { AddressInfo } from "net"
import { homeFixture, uploadImageFixture } from "./fixtures"
import {
  documentRelationships,
  fetchDataMessage,
  fetchGraphQL,
  gatsbyNodeTypeName,
  normalizeCollections,
  normalizeGlobals,
  payloadImage,
  payloadImageUrl,
} from "../utils"

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
  it(`uses apiPath instead of slug for the endpoint when defined`, () => {
    expect(
      normalizeCollections([{ slug: `posts`, apiPath: `posts/icu` }], `http://localhost:8000/api/`)
    ).toEqual([
      {
        endpoint: `http://localhost:8000/api/posts/icu`,
        slug: `posts`,
        apiPath: `posts/icu`,
        type: `posts`,
      },
    ])
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
  it(`uses apiPath instead of slug for the endpoint when defined`, () => {
    expect(
      normalizeGlobals([{ slug: `nav`, apiPath: `header/icu` }], `http://localhost:8000/api/`)
    ).toEqual([
      {
        endpoint: `http://localhost:8000/api/header/icu`,
        slug: `nav`,
        apiPath: `header/icu`,
        type: `nav`,
      },
    ])
  })
})

describe(`fn: fetchDataMessage`, () => {
  it(`returns a message with just the url when no params are given`, () => {
    expect(fetchDataMessage(`http://localhost:8000/api/posts`)).toEqual(
      `Starting to fetch data from Payload - http://localhost:8000/api/posts`
    )
  })
  it(`appends serialized params when given`, () => {
    expect(fetchDataMessage(`http://localhost:8000/api/posts`, `limit=10`)).toEqual(
      `Starting to fetch data from Payload - http://localhost:8000/api/posts with limit=10`
    )
  })
})

describe(`fn: gatsbyNodeTypeName`, () => {
  it(`defaults to the "Payload" prefix and singularizes the slug`, () => {
    expect(gatsbyNodeTypeName({ payloadSlug: `posts` })).toEqual(`PayloadPost`)
  })
  it(`leaves an already-singular slug unchanged`, () => {
    expect(gatsbyNodeTypeName({ payloadSlug: `post` })).toEqual(`PayloadPost`)
  })
  it(`uses a custom prefix when given`, () => {
    expect(gatsbyNodeTypeName({ payloadSlug: `landing-pages`, prefix: `CMS` })).toEqual(`CMSLandingPage`)
  })
})

describe(`fn: payloadImage`, () => {
  it(`returns the full response when no size is given`, () => {
    expect(payloadImage(uploadImageFixture)).toEqual(uploadImageFixture)
  })
  it(`returns the requested size when it exists`, () => {
    expect(payloadImage(uploadImageFixture, `thumbnail`)).toEqual(uploadImageFixture.sizes.thumbnail)
  })
  it(`falls back to the full response when the requested size does not exist`, () => {
    expect(payloadImage(uploadImageFixture, `nonexistent`)).toEqual(uploadImageFixture)
  })
})

describe(`fn: payloadImageUrl`, () => {
  it(`returns undefined when the response has no url`, () => {
    expect(payloadImageUrl({}, undefined, `http://localhost:8000`)).toBeUndefined()
    expect(payloadImageUrl(undefined, undefined, `http://localhost:8000`)).toBeUndefined()
  })
  it(`prefixes the image url with the base url, stripping a trailing slash`, () => {
    expect(payloadImageUrl(uploadImageFixture, undefined, `http://localhost:8000/`)).toEqual(
      `http://localhost:8000${uploadImageFixture.url}`
    )
  })
  it(`resolves the url for a specific size`, () => {
    expect(payloadImageUrl(uploadImageFixture, `thumbnail`, `http://localhost:8000`)).toEqual(
      `http://localhost:8000${uploadImageFixture.sizes.thumbnail.url}`
    )
  })
})

describe(`fn: fetchGraphQL`, () => {
  let server: Server
  let baseUrl: string
  let receivedRequest: { method?: string; headers?: IncomingHttpHeaders; body?: string }

  beforeAll((done) => {
    server = createServer((req, res) => {
      let body = ``
      req.on(`data`, (chunk) => {
        body += chunk
      })
      req.on(`end`, () => {
        receivedRequest = { method: req.method, headers: req.headers, body }
        res.setHeader(`Content-Type`, `application/json`)
        res.end(JSON.stringify({ data: { hello: `world` } }))
      })
    })
    server.listen(0, () => {
      const address = server.address() as AddressInfo
      baseUrl = `http://127.0.0.1:${address.port}`
      done()
    })
  })

  afterAll((done) => {
    server.close(done)
  })

  it(`posts the query as JSON and returns the parsed response`, async () => {
    const result = await fetchGraphQL(`${baseUrl}/graphql`, `{ hello }`)

    expect(receivedRequest.method).toEqual(`POST`)
    expect(receivedRequest.headers[`content-type`]).toEqual(`application/json`)
    expect(JSON.parse(receivedRequest.body)).toEqual({ query: `{ hello }` })
    expect(result).toEqual({ data: { hello: `world` } })
  })
})
