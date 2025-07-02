/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    testEnvironment: "jsdom",
    testPathIgnorePatterns: ["/node_modules/", "/dist/"],
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
        '^d3$': '<rootDir>/node_modules/d3/dist/d3.min.js'
    },
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                useESM: true,
            },
        ],
    },
};