/** @type {import('jest').Config} */
export default {
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.(ts|tsx)$': 'babel-jest',
    },
    moduleDirectories: ['node_modules', 'src'],
};
 
