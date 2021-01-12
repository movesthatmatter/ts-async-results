module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: './src/.*.test.ts',
  globals: {
    'ts-jest': {
      tsConfig: './tsconfig.tests.json'
    }
  },
  collectCoverageFrom: [
    './src/**/*.ts',
  ],
  collectCoverage: true,
  coverageThreshold: {
    "./src/index.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};