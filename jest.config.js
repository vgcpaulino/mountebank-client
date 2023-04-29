module.exports = {
    // preset: 'ts-jest',
    // setupFilesAfterEnv: ['jest-extended/all'], // Prevents the need to `import "jest-extended"` in any jest matched file
    // testPathIgnorePatterns: ['<rootDir>/tests/fixtures/'],
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
    // -----------------------------------------
    // The following is an example if you use the projects configuration for jest
    // projects: [
    //     // Projects configs can be tricky, some properties seem to be inherited from the
    //     //     global config and others are overrided. When in doubt, drop it from the top level
    //     //     and define it specifically for the project. This is more likely if a preset or
    //     //     a special runner is defined since it will have its own configs it sets.
    //     // Remember it is JS so you can use variable declarations and spread operators to minimize
    //     //     duplicate expressions
    //     {
    //         displayName: "UNIT",
    //         preset: "ts-jest",
    //         runner: "@codejedi365/jest-serial-runner",
    //         // setupFilesAfterEnv, Must be specified internal to the project, will be ignored if made higher
    //         setupFilesAfterEnv: ["jest-extended/all"],
    //         testMatch: ["<rootDir>/tests/**/*.spec.ts"]
    //     },
    //     {
    //         // 2nd project definition
    //     }
    // ]
};
