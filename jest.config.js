module.exports = {
    verbose: true,
    collectCoverage: true,
    coverageThreshold: {
        global: {
            /*
            TODO: Uncomment once tests are present
            branches: 95,
            lines: 100,*/
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
