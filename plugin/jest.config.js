module.exports = {
  testEnvironment: `node`,
  testMatch: [`**/__tests__/**/*.[jt]s?(x)`, `**/?(*.)+(spec|test).[jt]s?(x)`],
  testPathIgnorePatterns: [`__tests__/fixtures`, `dist`, `public`, `.cache`],
  preset: `ts-jest`,
}
