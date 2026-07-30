/**
 * Jest is configured without `next/jest` because the Next.js app sources live
 * under "Project structure/Pages" rather than a root-level pages/app directory,
 * which `next/jest` requires. Babel presets are declared inline so the Next.js
 * build keeps using SWC instead of falling back to Babel.
 */

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  modulePathIgnorePatterns: ['<rootDir>/Project structure/package.json'],
  transform: {
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
      },
    ],
  },
  moduleNameMapper: {
    '\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg|webp|avif)$': '<rootDir>/__mocks__/fileMock.js',
  },
  collectCoverageFrom: ['Project structure/Pages/**/*.{js,jsx}', '!**/node_modules/**'],
  coverageReporters: ['text', 'lcov'],
}
