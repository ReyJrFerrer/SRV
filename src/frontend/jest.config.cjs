// Jest configuration for the frontend.
// Scoped to a single test file: src/**/__tests__/onlineProjectCanisterService.test.ts.
// The existing "npm test" (vitest) is left untouched.
//
// tsconfig overrides applied via the transform:
//   - noEmit: false is required by ts-jest to emit CJS for jest
//   - module: "CommonJS" keeps the transform simple (no --experimental-vm-modules)
//   - jsx, strict, and esModuleInterop are preserved from the project tsconfig
module.exports = {
  rootDir: __dirname,
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          target: "ES2020",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: false,
          skipLibCheck: true,
          strict: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  clearMocks: true,
  verbose: true,
};
