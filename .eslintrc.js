/**
 * This config is used when you run `lint` or `lint:fix`.
 * It is basic, adjust as you see fit! You can of course use your own configuration.
 * @see https://eslint.org/
 */
module.exports = {
  env: {
    node: true,
    jest: true,
  },
  extends: [`eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:prettier/recommended`],
  parser: `@typescript-eslint/parser`,
  plugins: [`@typescript-eslint`, `prettier`],
  root: true,
  rules: {
    // Use backtick for quotes
    quotes: `off`,
    "@typescript-eslint/quotes": [
      2,
      `backtick`,
      {
        avoidEscape: true,
      },
    ],
    // Do not use trailing comma
    "prettier/prettier": [
      `error`,
      {
        trailingComma: `es5`,
        semi: false,
        singleQuote: false,
        printWidth: 120,
      },
    ],
    "@typescript-eslint/array-type": [`error`, { default: `generic` }],
    "@typescript-eslint/ban-types": [
      `error`,
      {
        extendDefaults: true,
        types: {
          "{}": {
            fixWith: `Record<string, unknown>`,
          },
          object: {
            fixWith: `Record<string, unknown>`,
          },
        },
      },
    ],
    "@typescript-eslint/naming-convention": [
      `error`,
      {
        selector: `default`,
        format: [`camelCase`],
        leadingUnderscore: `allow`,
        trailingUnderscore: `allow`,
      },
      {
        selector: `variable`,
        format: [`camelCase`, `UPPER_CASE`],
        leadingUnderscore: `allow`,
        trailingUnderscore: `allow`,
      },
      {
        selector: `typeLike`,
        format: [`PascalCase`],
      },
      {
        selector: `parameter`,
        format: [`camelCase`],
        leadingUnderscore: `allow`,
      },
      {
        selector: `memberLike`,
        modifiers: [`private`],
        format: [`camelCase`],
        leadingUnderscore: `require`,
      },
      {
        selector: `objectLiteralProperty`,
        format: null,
      },
      {
        selector: `interface`,
        format: [`PascalCase`],
        prefix: [`I`],
      },
    ],
  },
  overrides: [
    {
      files: [`site/src/pages/*.tsx`],
      rules: {
        "@typescript-eslint/naming-convention": 0,
      },
    },
    {
      files: [`plugin/src/plugin-options-schema.ts`],
      rules: {
        "@typescript-eslint/naming-convention": 0,
      },
    },
  ],
}
