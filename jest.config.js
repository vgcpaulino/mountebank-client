module.exports = {
    projects: [
        {
            id: 'unit',
            displayName: 'unit',
            preset: 'ts-jest',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
            transform: {
                '^.+\\.tsx?$': [
                    'ts-jest',
                    {
                        tsconfig: 'tsconfig.jest.json',
                    },
                ],
            },
        },
        {
            id: 'integration',
            displayName: 'integration',
            globalSetup: '<rootDir>/tests/config/globalSetup.ts',
            globalTeardown: '<rootDir>/tests/config/globalTeardown.ts',
            preset: 'ts-jest',
            setupFilesAfterEnv: ['<rootDir>/tests/config/setupAfterEnv.ts'],
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
            transform: {
                '^.+\\.tsx?$': [
                    'ts-jest',
                    {
                        tsconfig: 'tsconfig.jest.json',
                    },
                ],
            },
        },
    ],
};
