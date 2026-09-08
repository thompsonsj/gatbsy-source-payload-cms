/** @type {import('jest').Config} */
export default {
  testEnvironment: `node`,
  testMatch: [`**/__tests__/**/*.[jt]s?(x)`, `**/?(*.)+(spec|test).[jt]s?(x)`],
  testPathIgnorePatterns: [`dist`, `node_modules`],
  extensionsToTreatAsEsm: [`.ts`],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': `$1`,
  },
  transform: {
    '^.+\\.tsx?$': [
      `ts-jest`,
      {
        useESM: true,
        tsconfig: {
          module: `NodeNext`,
          moduleResolution: `NodeNext`,
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
}
