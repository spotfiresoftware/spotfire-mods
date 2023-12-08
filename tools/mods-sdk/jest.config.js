/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    testEnvironment: "node",
    testPathIgnorePatterns: ["/node_modules/", "/dist/"],
    watchPathIgnorePatterns: [".*testprojects.*"],
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
