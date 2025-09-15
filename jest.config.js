module.exports = {
    verbose: true,
    collectCoverage: true,
    coverageThreshold: {
        global: {
            // TODO: Later update to 95 and 100 respectively, when it all passes
            branches: 50,
            lines: 80
        }
    },
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
