const nextJest = require('next/jest')

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/layout.tsx',
        '!src/**/page.tsx', // Often pages are excluded or tested via E2E, but user asked to test specific page.
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    // Fix for "SyntaxError: Unexpected token 'export'" with ky/other esm libs if needed
    transformIgnorePatterns: [
        '/node_modules/',
    ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
