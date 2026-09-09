import { onPluginInit } from "../on-plugin-init"
import { ERROR_CODES } from "../constants"

describe(`onPluginInit`, () => {
  it(`registers error map entries for GraphQLSourcing and SchemaCustomization`, () => {
    const setErrorMap = jest.fn()

    ;(onPluginInit as any)({ reporter: { setErrorMap } }, {}, jest.fn())

    expect(setErrorMap).toHaveBeenCalledTimes(1)
    const [errorMap] = setErrorMap.mock.calls[0]
    const sourcing = errorMap[ERROR_CODES.GraphQLSourcing]
    expect(sourcing.level).toEqual(`ERROR`)
    expect(sourcing.category).toEqual(`THIRD_PARTY`)
    expect(sourcing.text({ sourceMessage: `Fetch failed`, graphqlError: `Bad Request` })).toEqual(
      `Fetch failed: Bad Request`
    )

    const schema = errorMap[ERROR_CODES.SchemaCustomization]
    expect(schema.level).toEqual(`ERROR`)
    expect(schema.text({ sourceMessage: `Schema fetch failed` })).toEqual(`Schema fetch failed`)
  })
})
