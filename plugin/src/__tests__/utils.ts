import { homeFixture } from "./fixtures"
import { documentRelationships } from "../utils"

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
