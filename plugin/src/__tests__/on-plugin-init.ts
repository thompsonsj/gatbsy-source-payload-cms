import { onPluginInit } from "../on-plugin-init"
import { ERROR_CODES } from "../constants"

describe(`onPluginInit`, () => {
  it(`registers an error map entry for GraphQLSourcing errors`, () => {
    const setErrorMap = jest.fn()

    ;(onPluginInit as any)({ reporter: { setErrorMap } }, {}, jest.fn())

    expect(setErrorMap).toHaveBeenCalledTimes(1)
    const [errorMap] = setErrorMap.mock.calls[0]
    const entry = errorMap[ERROR_CODES.GraphQLSourcing]
    expect(entry.level).toEqual(`ERROR`)
    expect(entry.category).toEqual(`THIRD_PARTY`)
    expect(entry.text({ sourceMessage: `Fetch failed`, graphqlError: `Bad Request` })).toEqual(
      `Fetch failed: Bad Request`
    )
  })
})
