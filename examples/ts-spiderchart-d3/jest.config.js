/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    testEnvironment: "jsdom",
    testPathIgnorePatterns: ["/node_modules/", "/dist/"],
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
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