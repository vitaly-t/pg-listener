module.exports = {
    verbose: true,
    collectCoverage: true,
    coverageThreshold: {
        global: {
            branches: 95,
            lines: 95
        }
    },
    coveragePathIgnorePatterns: [
        './src/retry-async.ts',
        './test/db/index.ts'
    ],
    roots: [
        './test',
    ],
    testMatch: [
        '**/?(*.)+(spec|test).+(ts|tsx|js)',
        '**/__tests__/**/*.+(ts|tsx|js)'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: {
                    target: 'ES2022',
                    esModuleInterop: true
                }
            }
        ]
    }
}
