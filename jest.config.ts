/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json",
        diagnostics: { ignoreCodes: ["TS151001", "TS151002"] },
      },
    ],
  },
  testMatch: ["**/tests/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  clearMocks: true,
};
