/**
 * @constant jestConfig
 * @description Jest config using the jest-expo preset and the native-module mocks in jest.setup.ts.
 */
module.exports = {
    preset: 'jest-expo',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    testMatch: ['**/*.test.ts', '**/*.test.tsx']
};
